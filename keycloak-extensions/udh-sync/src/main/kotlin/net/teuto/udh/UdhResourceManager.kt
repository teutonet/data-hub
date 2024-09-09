package net.teuto.udh

import com.fasterxml.jackson.databind.MapperFeature
import com.fasterxml.jackson.databind.cfg.CoercionAction
import com.fasterxml.jackson.databind.cfg.CoercionInputShape
import com.fasterxml.jackson.databind.json.JsonMapper
import com.fasterxml.jackson.databind.type.LogicalType
import jakarta.persistence.EntityManager
import jakarta.ws.rs.*
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.UriInfo
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jboss.logging.Logger
import org.keycloak.authorization.AuthorizationProvider
import org.keycloak.authorization.attribute.Attributes
import org.keycloak.authorization.common.DefaultEvaluationContext
import org.keycloak.authorization.common.UserModelIdentity
import org.keycloak.authorization.model.Policy
import org.keycloak.authorization.model.Resource
import org.keycloak.authorization.model.ResourceServer
import org.keycloak.authorization.model.Scope
import org.keycloak.authorization.permission.ResourcePermission
import org.keycloak.authorization.policy.evaluation.Evaluation
import org.keycloak.authorization.policy.evaluation.EvaluationContext
import org.keycloak.authorization.policy.provider.PolicyProvider
import org.keycloak.authorization.store.PolicyStore
import org.keycloak.authorization.store.ResourceStore
import org.keycloak.authorization.store.StoreFactory
import org.keycloak.connections.jpa.JpaConnectionProvider
import org.keycloak.models.*
import org.keycloak.models.utils.ModelToRepresentation
import org.keycloak.representations.IDToken
import org.keycloak.representations.idm.authorization.*
import org.keycloak.services.ForbiddenException
import org.keycloak.services.managers.AppAuthManager
import org.keycloak.services.resource.RealmResourceProvider
import org.keycloak.services.resources.admin.permissions.AdminPermissionManagement
import org.keycloak.services.resources.admin.permissions.AdminPermissions
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException
import java.util.function.BiFunction

val LOGGER: Logger = Logger.getLogger("udh")

const val DATA_HUB_CLIENT_ID = "data-hub"
const val ROOT = "root"
const val DATA_HUB_RESOURCE_KEY = "data-hub.resource"
const val DATA_HUB_RESOURCE_POLICY = "data-hub-resource"
const val ATTR_PREFIX = "attr-"

data class AuthzContext(
    val storeFactory: StoreFactory,
    val dataHubClient: ClientModel,
    val resourceServer: ResourceServer,
    val resourceStore: ResourceStore,
    val policyStore: PolicyStore,
    val realm: RealmModel,
    val authProvider: AuthorizationProvider,
    val entityManager: EntityManager,
    val session: KeycloakSession,
    val evaluationContext: EvaluationContext,
    val userModel: UserModel?,
)

fun getAuthzContext(
    session: KeycloakSession,
    evaluationContext: EvaluationContext,
    userModel: UserModel?
): AuthzContext {
    val authProvider = session.getProvider(AuthorizationProvider::class.java)
    val storeFactory = authProvider.storeFactory
    val dataHubClient = session.clients().getClientByClientId(session.context.realm, DATA_HUB_CLIENT_ID)

    return AuthzContext(
        storeFactory = authProvider.storeFactory,
        dataHubClient = dataHubClient,
        resourceServer = storeFactory.resourceServerStore.findByClient(dataHubClient),
        resourceStore = storeFactory.resourceStore,
        policyStore = storeFactory.policyStore,
        realm = session.context.realm,
        authProvider = authProvider,
        entityManager = session.getProvider(JpaConnectionProvider::class.java).entityManager,
        session = session,
        evaluationContext = evaluationContext,
        userModel = userModel
    )
}

fun invokePrivate(obj: Any, methodName: String, args: Array<Any> = arrayOf()): Any? {
    val fn = obj.javaClass.declaredMethods.first { it.name == methodName }
    fn.isAccessible = true
    return fn.invoke(obj, *args)
}

fun ensureResourceIdUnused(hash: String, context: AuthzContext) {
    if (context.resourceStore.findByName(context.resourceServer, hash) != null) {
        throw ClientErrorException(Response.Status.CONFLICT)
    }
}

fun dataHubPolicy(ctx: AuthzContext): String {
    val policy = PolicyRepresentation()
    policy.type = "data-hub"
    policy.name = "data-hub"
    policy.description = "data-hub specific authorization"
    return ensurePolicy(policy, ctx.policyStore, ctx.resourceServer)
}

fun ensureRealmMgmtPermission(ctx: AuthzContext, mgmtPermissions: AdminPermissionManagement): String {
    val dataHubPolicy = ScopePermissionRepresentation()
    dataHubPolicy.name = "user-management"
    dataHubPolicy.description = "Allow user management based on data-hub permissions"
    dataHubPolicy.resourceType = "Group"
    dataHubPolicy.scopes = listOf(
        invokePrivate(mgmtPermissions, "realmViewScope") as Scope,
        invokePrivate(mgmtPermissions, "initializeRealmScope", arrayOf("manage-members")) as Scope,
        invokePrivate(mgmtPermissions, "initializeRealmScope", arrayOf("manage-membership")) as Scope,
    ).map { it.id }.toSet()
    dataHubPolicy.policies = setOf(dataHubPolicy(ctx))
    return ensurePolicy(
        dataHubPolicy,
        ctx.policyStore,
        ctx.storeFactory.resourceServerStore.findByClient(mgmtPermissions.realmManagementClient)
    )
}

fun ensureGlobalPermissions(ctx: AuthzContext) {
    val mgmtPermissions = AdminPermissions.management(ctx.session, ctx.realm)
    invokePrivate(mgmtPermissions, "initializeRealmResourceServer")
    invokePrivate(mgmtPermissions, "initializeRealmDefaultScopes")
    ensureRealmMgmtPermission(ctx, mgmtPermissions)
    ctx.resourceServer.decisionStrategy = DecisionStrategy.AFFIRMATIVE
    listOf("Default Permission", "Default Policy").forEach { policy ->
        ctx.policyStore.findByName(ctx.resourceServer, policy)?.let { ctx.policyStore.delete(ctx.realm, it.id) }
    }
    ctx.resourceStore.findByName(ctx.resourceServer, "Default Resource")
        ?.let { ctx.resourceStore.delete(ctx.realm, it.id) }
    if (ctx.resourceStore.findByName(ctx.resourceServer, ROOT) == null) {
        ctx.resourceStore.create(ctx.resourceServer, ROOT, ctx.dataHubClient.id)
            .type = ROOT
    }
    resources.getAllNames().forEach {
        val permission = ResourcePermissionRepresentation()
        permission.name = "datahub: $it"
        permission.description = "Data HUB custom permissions on $it"
        permission.resourceType = it
        permission.policies = setOf(dataHubPolicy(ctx))
        ensurePolicy(permission, ctx.policyStore, ctx.resourceServer)
    }
}

sealed class Action {
    data object Get : Action()
    class Create(val resourceType: String, val name: String) : Action()
    class Delete(val resourceType: String, val name: String) : Action()
    class CustomAction(val customAction: String) : Action()
    class List(val resourceName: String) : Action()
    data object ListScopes : Action()
    data object ListPermissions : Action()
    class GetPermission(val name: String) : Action()
    class DeletePermission(val name: String) : Action()
    class CreatePermission(
        val name: String,
        val scopes: Collection<String>,
        val principals: Collection<UdhPrincipal>
    ) : Action()

    class CreateAttribute(val name: String, val value: String) : Action()
    class DeleteAttribute(val name: String) : Action()
    class PatchAttributes(val attributes: Map<String, String?>) : Action()
    data object GetAttributes : Action()

    override fun toString(): String {
        return when (this) {
            is Create -> "Create($resourceType, $name)"
            is CreatePermission -> "CreatePermission($name, scopes = ${scopes.joinToString()}, principals = ${principals.joinToString()})"
            is CustomAction -> "CustomAction($customAction)"
            is Delete -> "Delete($resourceType, $name)"
            is DeletePermission -> "DeletePermission($name)"
            Get -> "Get"
            is GetPermission -> "GetPermission($name)"
            is List -> "List($resourceName)"
            ListPermissions -> "ListPermissions"
            ListScopes -> "ListScopes"
            GetAttributes -> "GetAttributes"
            is CreateAttribute -> "CreateAttribute($name, $value)"
            is DeleteAttribute -> "DeleteAttribute($name)"
            is PatchAttributes -> "PatchAttributes($attributes)"
        }
    }
}

// Checks that the `evaluationContext` can view all resources along the path
// (like /tenant/test, /tenant/test/project/asdf etc.), otherwise throw a NotFoundException
//
// returns the resource at the end of the path
fun resourceCheckOnPath(
    resourcePath: ResourcePath,
    ctx: AuthzContext,
    evaluationContext: EvaluationContext
): UdhResource {
    var resource = rootResource(ctx)
    resourcePath.path.forEach {
        resource = resource.findSub(it.second, it.first, ctx) ?: throw NotFoundException()
        if (!hasPermissionScopes(resource.kcResource, listOf(VIEW_SCOPE), ctx, evaluationContext)) {
            throw NotFoundException()
        }
    }
    return resource
}

fun executeAction(
    targetResource: ResourcePath,
    action: Action,
    ctx: AuthzContext,
    externalChangesList: MutableList<() -> Unit>
): Any? {
    val targetGenResource = resourceCheckOnPath(targetResource, ctx, ctx.evaluationContext)
    when (action) {
        Action.Get -> {
            return Response.noContent().build()
        }

        is Action.Create -> {
            // make sure the resourcetype is allowed here
            val newResourceType =
                targetGenResource.resourceType.findChild(action.resourceType) ?: throw BadRequestException()
            // to create a resource you need resourcetype:admin on the parent resource
            if (!hasPermissionScopes(
                    targetGenResource.kcResource,
                    listOf("${action.resourceType}:$ADMIN_SCOPE"),
                    ctx,
                    ctx.evaluationContext
                )
            ) {
                throw ForbiddenException()
            }
            val newResourcePath = targetResource.plus(action.resourceType, action.name)
            val newResourceHash = newResourcePath.toHash()
            ensureResourceIdUnused(newResourceHash, ctx)
            val newResource =
                ctx.resourceStore.create(ctx.resourceServer, newResourceHash, newResourceHash, ctx.dataHubClient.id)
            targetResource.path.forEach {
                newResource.setAttribute(it.first, listOf(it.second))
            }
            newResource.setAttribute(action.resourceType, listOf(action.name))
            newResource.type = action.resourceType
            val resourceType = resourceTypeForName(action.resourceType)!!
            newResource.updateScopes(resourceType.resolveOwnScopes(ctx))
            newResource.displayName = newResourcePath.pathRepresentation()
            val newGenRes = UdhResource(newResourcePath, newResource, newResourceType)
            val postCreateResult = newResourceType.postCreate(newGenRes, ctx, externalChangesList)

            if (postCreateResult != Unit) {
                return postCreateResult
            } else {
                return Response.status(201).entity(
                    mapOf(
                        "name" to action.name
                    )
                ).build()
            }
        }

        is Action.CustomAction -> {
            if (!hasPermissionScopes(
                    targetGenResource.kcResource,
                    listOf(action.customAction),
                    ctx,
                    ctx.evaluationContext
                )
            ) {
                throw ForbiddenException()
            }
            val customAction =
                targetGenResource.resourceType.customActions[action.customAction] ?: throw BadRequestException()
            return customAction(targetGenResource, ctx, externalChangesList)
        }

        is Action.Delete -> {
            // to delete a resource you need resourcetype:admin on the parent resource
            if (!hasPermissionScopes(
                    targetGenResource.kcResource,
                    listOf("${action.resourceType}:$ADMIN_SCOPE"),
                    ctx,
                    ctx.evaluationContext
                )
            ) {
                throw ForbiddenException()
            }
            val resToDelete =
                targetGenResource.findSub(action.name, action.resourceType, ctx) ?: throw NotFoundException()
            resToDelete.deleteCascading(ctx, externalChangesList)

            return Response.noContent().build()
        }

        is Action.List -> {
            return targetGenResource.listSub(action.resourceName, ctx).filter {
                hasPermissionScopes(it.kcResource, listOf(VIEW_SCOPE), ctx, ctx.evaluationContext)
            }.map { it.path.path.last().second }
        }

        Action.ListScopes -> {
            val allPermissions = targetGenResource.resourceType.getPrefixedScopes()
            val granted = targetGenResource.resourceType.prefixedOwnScopes.filter {
                hasPermissionScopes(
                    targetGenResource.kcResource,
                    listOf(it),
                    ctx,
                    ctx.evaluationContext
                )
            }
            return mapOf(
                "all" to allPermissions,
                "granted" to granted
            )
        }

        Action.ListPermissions -> {
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            return Json.encodeToString(ctx.policyStore.findByResource(ctx.resourceServer, targetGenResource.kcResource)
                .map { permissionToRep(it, ctx, true) })
        }

        is Action.GetPermission -> {
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            val permission =
                lookupPermission(targetGenResource.kcResource, action.name, ctx) ?: throw NotFoundException()
            return Json.encodeToString(permissionToRep(permission, ctx, false))
        }

        is Action.DeletePermission -> {
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            val permission =
                lookupPermission(targetGenResource.kcResource, action.name, ctx) ?: throw NotFoundException()
            ctx.policyStore.delete(ctx.realm, permission.id)
            val tenantName = targetGenResource.kcResource.attributes["tenant"]?.firstOrNull()
            if (tenantName != null) {
                syncGrafanaOrgsForTenant(ctx, tenantName)
            }

            return Response.noContent().build()
        }

        is Action.CreatePermission -> {
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            val validScopes = targetGenResource.resourceType.getPrefixedScopes().toSet()
            if (action.scopes.any { !validScopes.contains(it) }) {
                throw BadRequestException()
            }
            val tenantName = targetGenResource.kcResource.attributes["tenant"]!!.first()!!
            val resolvedScopes = action.scopes.map { createScope(it, ctx).id }
            val policyIds = action.principals.map {
                when (it) {
                    is UdhGroup -> {
                        val groupPath = ResourcePath(listOf("tenant" to it.tenant, "group" to it.group))
                        resourceCheckOnPath(groupPath, ctx, ctx.evaluationContext)
                        ensureGroupPolicy(groupPath.toHash(), "${it.tenant} / ${it.group}", ctx)
                    }

                    is UdhTenant -> {
                        val tenantPath = ResourcePath(listOf("tenant" to it.tenant))
                        resourceCheckOnPath(tenantPath, ctx, ctx.evaluationContext)
                        ensureGroupPolicy(tenantGroupId(it.tenant), it.tenant, ctx)
                    }

                    is UdhUserPrincipal -> {
                        val userPermissions = AdminPermissions.evaluator(
                            ctx.session,
                            ctx.realm,
                            ctx.realm,
                            ctx.userModel!!
                        ).users()
                        val userPrincipal =
                            ctx.session.users().getUserById(ctx.realm, it.userId) ?: throw NotFoundException()
                        if (!userPermissions.canView(userPrincipal)) {
                            throw NotFoundException()
                        }
                        val policy = UserPolicyRepresentation()
                        policy.name = "user-${it.userId}"
                        policy.description = it.userId
                        policy.addUser(it.userId)
                        ensurePolicy(policy, ctx.policyStore, ctx.resourceServer)
                    }

                    is UdhProject -> {
                        val resourcePath = ResourcePath(listOf("tenant" to it.tenant, "project" to it.project))
                        ensureResourcePolicy(resourcePath, ctx)
                    }

                    is UdhVizGroup -> {
                        val resourcePath = ResourcePath(listOf("tenant" to it.tenant, "viz-group" to it.vizGroup))
                        ensureResourcePolicy(resourcePath, ctx)
                    }

                    else -> {
                        throw BadRequestException()
                    }
                }
            }
            var updated = false
            lookupPermission(targetGenResource.kcResource, action.name, ctx)?.let {
                updated = true
                ctx.policyStore.delete(ctx.realm, it.id)
                // without flushing, re-creating with same name in same transaction fails
                ctx.entityManager.flush()
            }
            val policy = ScopePermissionRepresentation()
            policy.name = targetGenResource.path.plus("permission", action.name).toHash()
            policy.addResource(targetGenResource.kcResource.id)
            policy.scopes = resolvedScopes.toSet()
            policy.policies = policyIds.toSet()
            policy.decisionStrategy = DecisionStrategy.AFFIRMATIVE
            policy.description = action.name
            createPolicy(policy, ctx.policyStore, ctx.resourceServer)

            syncGrafanaOrgsForTenant(ctx, tenantName)

            return Response.status(
                if (updated) {
                    204
                } else {
                    201
                }
            ).entity(
                Json.encodeToString(
                    PermissionRep(
                        scopes = action.scopes,
                        principals = action.principals,
                        name = action.name
                    )
                )
            ).build()
        }

        Action.GetAttributes -> {
            return Response.ok(targetGenResource.customAttributes()).build()
        }

        is Action.CreateAttribute -> {
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            targetGenResource.kcResource.setAttribute("${ATTR_PREFIX}${action.name}", listOf(action.value))
            return Response.noContent().build()
        }

        is Action.PatchAttributes -> {
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            action.attributes.forEach { (name, value) ->
                if (value == null) {
                    targetGenResource.kcResource.removeAttribute("${ATTR_PREFIX}${name}")
                } else {
                    targetGenResource.kcResource.setAttribute(
                        "${ATTR_PREFIX}${name}",
                        listOf(value)
                    )
                }
            }
            return Response.ok(targetGenResource.customAttributes()).build()
        }

        is Action.DeleteAttribute -> {
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            targetGenResource.kcResource.removeAttribute("${ATTR_PREFIX}${action.name}")
            return Response.noContent().build()
        }
    }
}

fun ensureResourcePolicy(resourcePath: ResourcePath, ctx: AuthzContext): String {
    val resourcePrincipal = resourceCheckOnPath(resourcePath, ctx, ctx.evaluationContext)
    val resourceHash = resourcePath.toHash()
    if (!resourcePrincipal.resourceType.allowedAsPrincipal) {
        LOGGER.info("invalid principal: ${resourcePath.pathRepresentation()}")
        throw BadRequestException()
    }

    val policy = DatahubResourcePolicyRepresentation(resourceHash)
    policy.name = "res-$resourceHash"
    policy.description = resourcePath.pathRepresentation()
    return ensurePolicy(policy, ctx.policyStore, ctx.resourceServer)
}

fun ensureGroupPolicy(groupHash: String, description: String, ctx: AuthzContext): String {
    val policy = GroupPolicyRepresentation()
    policy.name = groupHash
    policy.groupsClaim = "data-hub.attribute.groups"
    policy.description = description
    policy.addGroup(groupHash, true)
    return ensurePolicy(policy, ctx.policyStore, ctx.resourceServer)
}

fun ensurePolicy(
    policy: AbstractPolicyRepresentation,
    policyStore: PolicyStore,
    resourceServer: ResourceServer
): String {
    return lookupPolicy(policy, policyStore, resourceServer) ?: createPolicy(policy, policyStore, resourceServer)
}

fun lookupPolicy(
    policy: AbstractPolicyRepresentation,
    policyStore: PolicyStore,
    resourceServer: ResourceServer
): String? {
    return policyStore.findByName(resourceServer, policy.name)?.id
}

fun createPolicy(
    policy: AbstractPolicyRepresentation,
    policyStore: PolicyStore,
    resourceServer: ResourceServer
): String {
    return policyStore.create(resourceServer, policy).id
}

fun lookupPermission(resource: Resource, permissionName: String, ctx: AuthzContext): Policy? {
    return ctx.policyStore.findByResource(ctx.resourceServer, resource).firstOrNull { it.description == permissionName }
}

@Serializable
data class PermissionRep(
    val scopes: Collection<String>,
    val principals: Collection<UdhPrincipal>,
    val name: String? = null,
)

fun permissionToRep(permission: Policy, ctx: AuthzContext, includeName: Boolean): PermissionRep {
    val scopes = permission.scopes.map { it.name }
    val principals = permission.associatedPolicies.flatMap { policy ->
        if (policy.type == "group") {
            ModelToRepresentation.toRepresentation<GroupPolicyRepresentation>(
                policy,
                ctx.authProvider,
                false,
                false
            ).groups.map {
                val group = ctx.realm.getGroupById(it.id)
                if (group.parentId == null) {
                    UdhTenant(group.name)
                } else {
                    UdhGroup(group.parent.name, group.name)
                }
            }
        } else if (policy.type == "user") {
            ModelToRepresentation.toRepresentation<UserPolicyRepresentation>(
                policy,
                ctx.authProvider,
                false,
                false
            ).users.map {
                UdhUserPrincipal(it)
            }
        } else if (policy.type == DATA_HUB_RESOURCE_POLICY) {
            val resPrincipal = ModelToRepresentation.toRepresentation<DatahubResourcePolicyRepresentation>(
                policy,
                ctx.authProvider,
                false,
                false
            ).resourcePrincipal
            val resource = ctx.resourceStore.findByName(ctx.resourceServer, resPrincipal)
            listOf(udhResourceModelFromResource(resource))
        } else {
            LOGGER.error("unknown policy type: ${policy.type}")
            listOf()
        }
    }
    return PermissionRep(
        scopes = scopes,
        principals = principals,
        name = if (includeName) {
            permission.description
        } else {
            null
        }
    )
}

fun tenantGroupId(tenant: String): String {
    return hashString(tenant)
}

fun postNoop(res: UdhResource, ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>) {

}

class ResourceType(
    val resourceTypeName: String,
    specificOwnScopes: List<String> = listOf(),
    val children: List<ResourceType> = listOf(),
    val postCreate: (UdhResource, AuthzContext, MutableList<() -> Unit>) -> Any = ::postNoop,
    val postDelete: (UdhResource, AuthzContext, MutableList<() -> Unit>) -> Unit = ::postNoop,
    val customActions: Map<String, (UdhResource, AuthzContext, MutableList<() -> Unit>) -> Any> = mapOf(),
    val allowedAsPrincipal: Boolean = false,
) {
    var parent: ResourceType? = null
    val ownScopes: List<String>
    val prefixedOwnScopes: List<String>

    init {
        this.children.forEach { it.parent = this }
        this.ownScopes = specificOwnScopes.plus(VIEW_SCOPE).plus(ADMIN_SCOPE)
        this.prefixedOwnScopes = ownScopes.map { "${resourceTypeName}:${it}" }
    }

    fun getPrefixedScopes(): List<String> {
        return this.children.flatMap { it.getPrefixedScopes() }.plus(prefixedOwnScopes)
    }

    fun findResourceType(subResType: String): ResourceType? {
        return if (subResType == resourceTypeName) {
            this
        } else {
            children.map { it.findResourceType(subResType) }.firstOrNull { it != null }
        }
    }

    fun findChild(subResType: String): ResourceType? {
        return children.firstOrNull { it.resourceTypeName == subResType }
    }

    fun resolveOwnScopes(authzContext: AuthzContext): Set<Scope> {
        return prefixedOwnScopes.map { createScope(it, authzContext) }.toSet()
    }

    fun getAllNames(): Collection<String> {
        return children.flatMap { it.getAllNames() }.plus(resourceTypeName)
    }
}

const val ADMIN_SCOPE = "admin"
const val VIEW_SCOPE = "view"

val resDepths = getResDepth(resources, 0).toMap()

fun getResDepth(res: ResourceType, depth: Int): List<Pair<String, Int>> {
    return res.children.flatMap { getResDepth(it, depth + 1) }.plus(Pair(res.resourceTypeName, depth))
}

fun resourceTypeForName(resourceName: String): ResourceType? {
    return resources.findResourceType(resourceName)
}

class UdhResource(val path: ResourcePath, val kcResource: Resource, val resourceType: ResourceType) {
    fun findSub(name: String, subtype: String, ctx: AuthzContext): UdhResource? {
        val subPath = path.plus(subtype, name)
        val subPathHash = subPath.toHash()
        val subResource = ctx.resourceStore.findByName(ctx.resourceServer, subPathHash) ?: return null
        val subResType = resourceType.findChild(subtype) ?: return null
        return UdhResource(subPath, subResource, subResType)
    }

    fun parent(ctx: AuthzContext): UdhResource? {
        val parentPath = path.parent()
        if (parentPath == null) {
            return null
        } else if (parentPath.path.isEmpty()) {
            return rootResource(ctx)
        } else {
            val parentResource = parentPath.getResource(ctx)
            // TODO: if the resource doesn't exist, that's a bug
            return UdhResource(parentPath, parentResource!!, resourceType.parent!!)
        }
    }

    fun listSub(subResourceType: String, ctx: AuthzContext): List<UdhResource> {
        return findAllMatchingResources(subResourceType, path.toAttributes(), ctx).map {
            udhResourceFromKcResource(
                it
            )
        }
    }

    fun deleteCascading(ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>) {
        // delete all children first
        resourceType.children.forEach { resType ->
            listSub(resType.resourceTypeName, ctx).forEach {
                it.deleteCascading(ctx, externalChangesList)
            }
        }
        // delete hook
        resourceType.postDelete(this, ctx, externalChangesList)
        // delete policy for this resource
        val resourceHash = path.toHash()
        ctx.policyStore.findByName(ctx.resourceServer, "res-$resourceHash")?.let {
            ctx.policyStore.delete(ctx.realm, it.id)
        }
        // delete this
        ctx.resourceStore.delete(ctx.realm, kcResource.id)
    }

    fun customAttributes(): Map<String, String> {
        return kcResource.attributes.filterKeys {
            it.startsWith(ATTR_PREFIX)
        }.mapKeys { it.key.removePrefix(ATTR_PREFIX) }.mapValues { it.value.first() }
    }
}

fun rootResource(context: AuthzContext): UdhResource {
    val rootRes = context.resourceStore.findByName(context.resourceServer, ROOT) ?: context.resourceStore.create(
        context.resourceServer,
        ROOT,
        ROOT,
        context.dataHubClient.id
    ).also { it.type = ROOT }
    return UdhResource(ResourcePath(listOf()), rootRes, resources)
}

fun udhResourceFromKcResource(kcResource: Resource): UdhResource {
    val resourcePath = ResourcePath.fromResource(kcResource)
    val resType = resourcePath.path.lastOrNull()?.first?.let { resourceTypeForName(it) } ?: resources
    return UdhResource(resourcePath, kcResource, resType)
}

@OptIn(ExperimentalStdlibApi::class)
fun hashString(s: String): String {
    return try {
        val md = MessageDigest.getInstance("SHA-256")
        md.update(s.encodeToByteArray())
        md.digest().toHexString().substring(0, 36)
    } catch (e: NoSuchAlgorithmException) {
        throw RuntimeException(e)
    }
}

class ResourcePath(val path: List<Pair<String, String>> = listOf()) {
    companion object {
        fun fromResource(resource: Resource): ResourcePath {
            return ResourcePath(resource.attributes
                .filter { !it.key.startsWith(ATTR_PREFIX) }
                .map { Pair(it.key, it.value.first()) }
                .sortedBy { resDepths[it.first] })
        }
    }

    fun toHash(): String {
        return try {
            val combined = path.sortedBy { it.first }.joinToString("") { ":${it.first}${it.second}" }
            hashString(combined)
        } catch (e: NoSuchAlgorithmException) {
            throw RuntimeException(e)
        }
    }

    fun toAttributes(): Map<String, String> {
        return path.toMap()
    }

    fun plus(subtype: String, name: String): ResourcePath {
        return ResourcePath(path.plus(Pair(subtype, name)))
    }

    fun parent(): ResourcePath? {
        return if (path.isNotEmpty()) {
            ResourcePath(path.subList(0, path.size - 1))
        } else {
            null
        }
    }

    fun getResource(ctx: AuthzContext): Resource? {
        return if (path.isEmpty()) {
            rootResource(ctx).kcResource
        } else {
            ctx.resourceStore.findByName(ctx.resourceServer, toHash())
        }
    }

    fun getUdhResource(ctx: AuthzContext): UdhResource? {
        val res = getResource(ctx) ?: return null
        val resType = path.lastOrNull()?.first?.let { resourceTypeForName(it) }
            ?: resources
        return UdhResource(this, res, resType)
    }

    fun pathRepresentation(): String {
        return path.joinToString("/") { "${it.first}/${it.second}" }
    }
}

fun createScope(name: String, context: AuthzContext): Scope {
    return context.storeFactory.scopeStore.findByName(context.resourceServer, name)
        ?: context.storeFactory.scopeStore.create(context.resourceServer, name)
}

fun hasPermissionScopes(
    resource: Resource,
    scopes: Collection<String>,
    context: AuthzContext,
    evaluationContext: EvaluationContext
): Boolean {
    val resolvedScopes = scopes.map {
        val fullScopeName = if (it.contains(":")) {
            it
        } else {
            "${resource.type}:${it}"
        }
        createScope(fullScopeName, context)
    }
    return hasPermissions(resource, resolvedScopes, context, evaluationContext)
}

fun hasPermissions(
    resource: Resource,
    scopes: Collection<Scope>,
    context: AuthzContext,
    evaluationContext: EvaluationContext
): Boolean {
    val resourcePermission = ResourcePermission(resource, scopes, context.resourceServer)
    val grantedScopes = context.authProvider.evaluators()
        .from(listOf(resourcePermission), evaluationContext)
        .evaluate(context.resourceServer, null)
        .firstOrNull()
        ?.scopes ?: return false
    return grantedScopes.size == scopes.size
}

fun findAllMatchingResources(
    resourceType: String,
    attributes: Map<String, String>,
    context: AuthzContext
): Collection<Resource> {
    return context.resourceStore.findByType(context.resourceServer, resourceType).filter { res ->
        val resAttributes = res.attributes
        attributes.all { resAttributes[it.key]?.first() == it.value }
    }
}

class DatahubResourcePolicyRepresentation(val resourcePrincipal: String) : AbstractPolicyRepresentation() {
    override fun getType(): String {
        return DATA_HUB_RESOURCE_POLICY
    }
}

class DatahubResourcePolicyProvider(private val representationFunction: BiFunction<Policy, AuthorizationProvider, DatahubResourcePolicyRepresentation>) :
    PolicyProvider {
    override fun evaluate(evaluation: Evaluation) {
        val authProvider = evaluation.authorizationProvider
        val resourcePolicy = representationFunction.apply(evaluation.policy, authProvider)
        val resourceAttr = evaluation.context.identity.attributes.getValue(DATA_HUB_RESOURCE_KEY)
        if (resourceAttr != null && !resourceAttr.isEmpty && resourceAttr.asString(0) == resourcePolicy.resourcePrincipal) {
            evaluation.grant()
        }
    }

    override fun close() {}
}

class DatahubPolicyProvider(val authorization: AuthorizationProvider) : PolicyProvider {
    override fun evaluate(evaluation: Evaluation) {
        val context = getAuthzContext(evaluation.authorizationProvider.keycloakSession, evaluation.context, null)
        val client = context.realm.getClientById(evaluation.permission.resource.resourceServer.clientId)
        val resourceClientId = client.clientId
        val realmMgmtClient = AdminPermissions.management(
            evaluation.authorizationProvider.keycloakSession,
            context.realm
        ).realmManagementClient.clientId
        val resource = evaluation.permission.resource
        val scopes = evaluation.permission.scopes
        if (resourceClientId == DATA_HUB_CLIENT_ID) {

            // data-hub custom policy to make inheriting scopes work and give all permissions when admin
            val genResource = udhResourceFromKcResource(resource)
            // Either you are admin for the udh realm
            if (evaluation.context.identity.hasClientRole(realmMgmtClient, "manage-realm")) {
                evaluation.grant()
                return
            }
            // or you are admin on this resource
            if (scopes.none { it.name == "${genResource.resourceType.resourceTypeName}:$ADMIN_SCOPE" }
                && hasPermissionScopes(resource, listOf(ADMIN_SCOPE), context, evaluation.context)) {
                evaluation.grant()
                return
            }
            // or you have this scope on a parent permission
            val parentResource = genResource.parent(context)
            if (parentResource != null && hasPermissions(
                    parentResource.kcResource,
                    scopes,
                    context,
                    evaluation.context
                )
            ) {
                evaluation.grant()
                return
            }
        } else if (resourceClientId.equals(realmMgmtClient) && resource.type.equals("Group")) {
            // used to handle access to keycloak groups, so user can manage themselves
            val groupId = resource.name.split(".").last()
            val group = context.realm.getGroupById(groupId)
            val groupName = group.name
            val parentGroupName = group.parent?.name
            if (parentGroupName != null) {
                val groupRes =
                    ResourcePath(listOf(Pair("tenant", parentGroupName), Pair("group", groupName))).getResource(
                        context
                    )
                if (groupRes != null && hasPermissionScopes(
                        groupRes,
                        listOf(ADMIN_SCOPE),
                        context,
                        evaluation.context
                    )
                ) {
                    evaluation.grant()
                    return
                }
                // if the user can access any subgroup, allow access to the supergroup
                val tenantGroups = findAllMatchingResources("group", mapOf("tenant" to groupName), context)
                if (tenantGroups.any {
                        hasPermissionScopes(it, listOf(ADMIN_SCOPE), context, evaluation.context)
                    }) {
                    evaluation.grant()
                    return
                }
            }
        }
    }

    override fun close() {}
}

fun singularize(s: String): String {
    return s.trimEnd('s')
}

val NAME_REGEX = Regex("[a-z0-9]([-a-z0-9]{0,34}[a-z0-9])?")

fun ensureValidName(name: String): String {
    if (!name.matches(NAME_REGEX)) {
        throw BadRequestException()
    }
    return name
}

val NON_COERCING_MAPPER: JsonMapper = JsonMapper.builder().disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
    .withCoercionConfig(LogicalType.Textual) { cfg ->
        run {
            cfg.setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
            cfg.setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail)
            cfg.setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
        }
    }.build()

fun parseIntent(uriInfo: UriInfo, method: String, body: String?): Pair<ResourcePath, Action> {
    // drop /realms/udh/data-hub/
    val pathChunks = uriInfo.pathSegments.drop(3).map { ensureValidName(it.path) }.chunked(2)
    if (pathChunks.lastOrNull()?.size == 2) {
        val path = ResourcePath(pathChunks.map { Pair(singularize(it[0]), it[1]) })
        val parentPath = path.parent()!!
        val lastResourceType = path.path.last().first
        val lastResourceName = path.path.last().second
        when (method) {
            "DELETE" -> {
                if (lastResourceType == "permission") {
                    return parentPath to Action.DeletePermission(lastResourceName)
                } else if (lastResourceType == "attribute") {
                    return parentPath to Action.DeleteAttribute(lastResourceName)
                }
                return parentPath to Action.Delete(lastResourceType, lastResourceName)
            }

            "PUT" -> {
                if (lastResourceType == "permission") {
                    try {
                        val permissionRequest = Json.decodeFromString<PermissionRep>(body!!)
                        return parentPath to Action.CreatePermission(
                            lastResourceName,
                            permissionRequest.scopes,
                            permissionRequest.principals
                        )
                    } catch (e: SerializationException) {
                        throw BadRequestException()
                    }
                } else if (lastResourceType == "attribute") {
                    return parentPath to Action.CreateAttribute(
                        lastResourceName,
                        body ?: ""
                    )
                }
                return parentPath to Action.Create(lastResourceType, lastResourceName)
            }

            "GET" -> {
                if (lastResourceType == "permission") {
                    return parentPath to Action.GetPermission(lastResourceName)
                }
                return path to Action.Get
            }
        }
    } else {
        val path = ResourcePath(pathChunks.filter { it.size == 2 }.map { Pair(singularize(it[0]), it[1]) })

        val command = pathChunks.last()[0]
        if (command == "permissions") {
            return path to Action.ListPermissions
        } else if (command == "attributes") {
            if (method == "GET") {
                return path to Action.GetAttributes
            } else if (method == "PATCH") {
                val attributesPatch = try {
                    Json.decodeFromString<Map<String, String?>>(body!!)
                } catch (e: SerializationException) {
                    throw BadRequestException()
                }
                attributesPatch.keys.forEach { ensureValidName(it) }
                return path to Action.PatchAttributes(attributesPatch)
            }
        } else if (command == "scopes") {
            return path to Action.ListScopes
        } else if (method == "GET") {
            return path to Action.List(singularize(command))
        } else if (method == "POST") {
            return path to Action.CustomAction(command)
        }
    }
    throw NotFoundException()
}

fun handleRequest(session: KeycloakSession, uriInfo: UriInfo, method: String, body: String?): Any {
    val authResult = AppAuthManager.BearerTokenAuthenticator(session).setAudience(DATA_HUB_CLIENT_ID).authenticate()
        ?: throw NotAuthorizedException("Bearer")
    val evaluationContext = DefaultEvaluationContext(UserModelIdentity(session.context.realm, authResult.user), session)
    val ctx = getAuthzContext(session, evaluationContext, authResult.user)
    ensureGlobalPermissions(ctx)
    val intent = parseIntent(uriInfo, method, body)
    LOGGER.debug("executing ${intent.second} on ${intent.first.pathRepresentation()}")
    val externalChangesList = mutableListOf<() -> Unit>()
    val result = executeAction(intent.first, intent.second, ctx, externalChangesList)
    externalChangesList.forEach {
        it()
    }
    return result ?: ""
}

class DatahubResource(private val session: KeycloakSession) {
    @GET
    @Path("{s:.*}")
    fun get(@Context uriInfo: UriInfo): Any {
        return handleRequest(session, uriInfo, "GET", null)
    }

    @POST
    @Path("{s:.*}")
    fun post(body: String, @Context uriInfo: UriInfo): Any {
        return handleRequest(session, uriInfo, "POST", body)
    }

    @PATCH
    @Path("{s:.*}")
    fun patch(body: String, @Context uriInfo: UriInfo): Any {
        return handleRequest(session, uriInfo, "PATCH", body)
    }

    @PUT
    @Path("{s:.*}")
    fun put(body: String, @Context uriInfo: UriInfo): Any {
        return handleRequest(session, uriInfo, "PUT", body)
    }

    @DELETE
    @Path("{s:.*}")
    fun delete(body: String, @Context uriInfo: UriInfo): Any {
        return handleRequest(session, uriInfo, "DELETE", body)
    }
}

class DatahubResourceProvider(private val session: KeycloakSession) : RealmResourceProvider {
    override fun getResource(): Any {
        return DatahubResource(session)
    }

    override fun close() {

    }
}

fun lookupResources(ctx: AuthzContext, resourceType: String, names: Map<String, String>): List<Resource> {
    return ctx.resourceStore.find(
        ctx.realm,
        ctx.resourceServer,
        mapOf(Resource.FilterOption.TYPE to arrayOf(resourceType)),
        null,
        null
    )
        .filter { res -> res.type == resourceType && names.all { res.attributes[it.key]?.firstOrNull() == it.value } }
}

fun getResourcesForUser(
    ctx: AuthzContext,
    resourceType: String,
    names: Map<String, String>,
    scopes: List<String>
): List<Resource> {
    return lookupResources(ctx, resourceType, names).filter {
        hasPermissionScopes(
            it,
            scopes,
            ctx,
            ctx.evaluationContext
        )
    }
}

fun getResourcesForResourcePrincipal(
    ctx: AuthzContext,
    resourcePrincipalHash: String,
    resourceType: String,
    scopes: List<String>,
    names: Map<String, String>,
): List<Resource> {
    val evaluationContext = DefaultEvaluationContext(
        AttributeIdentity(
            Attributes.from(
                mapOf(
                    DATA_HUB_RESOURCE_KEY to listOf(resourcePrincipalHash),
                    "data-hub.attribute.groups" to listOf("")
                )
            )
        ), ctx.session
    )
    // gather all permissions of this resource
    return lookupResources(ctx, resourceType, names).filter {
        hasPermissionScopes(
            it,
            scopes,
            ctx,
            evaluationContext
        )
    }
}

fun getFlatProjects(ctx: AuthzContext, tenant: String?, scopes: List<String>): List<String> {
    val names = if (tenant == null) {
        mapOf()
    } else {
        mapOf("tenant" to tenant)
    }
    return getResourcesForUser(ctx, "project", names, scopes).map {
        val project = UdhProject.fromAttributes(it.attributes)
        project.flatName
    }
}

fun udhTokenMapperSetClaim(
    token: IDToken,
    mappingModel: ProtocolMapperModel,
    userSession: UserSessionModel,
    session: KeycloakSession,
    clientSessionCtx: ClientSessionContext
) {
    val evaluationContext =
        DefaultEvaluationContext(UserModelIdentity(session.context.realm, userSession.user), session)
    val ctx = getAuthzContext(session, evaluationContext, null)
    when (clientSessionCtx.clientSession.client.clientId) {
        "grafana" -> setClaimGrafana(ctx, token, userSession.user)
        "usercode" -> {
            val clientScopes = clientSessionCtx.clientScopesStream.map { it.name }.filter { it != null }.toList()
            setClaimUsercode(ctx, token, clientScopes)
        }

        "mdb" -> setClaimMdb(ctx, token)
        "mdb-frontend" -> setClaimMdb(ctx, token)
    }
}

fun setClaimMdb(ctx: AuthzContext, token: IDToken) {
    val projectClaim = getFlatProjects(ctx, null, listOf("sensor-metadata-write"))
    token.setOtherClaims("projects", projectClaim)
}

fun setClaimPrometheusRead(ctx: AuthzContext, token: IDToken) {
    val prometheusReadClaim =
        getFlatProjects(ctx, null, listOf("prometheus-read")).sorted().distinct().joinToString("|")
    token.setOtherClaims("groups", prometheusReadClaim)
}

fun setClaimUsercode(ctx: AuthzContext, token: IDToken, scopes: Collection<String>) {
    if (scopes.contains("prometheus_read")) {
        setClaimPrometheusRead(ctx, token)
    }
    if (scopes.contains("buckets")) {
        setClaimBuckets(ctx, token)
    }
}
