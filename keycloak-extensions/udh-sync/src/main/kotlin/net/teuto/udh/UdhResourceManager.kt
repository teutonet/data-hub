package net.teuto.udh

import com.expediagroup.graphql.generator.SchemaGenerator
import com.expediagroup.graphql.generator.SchemaGeneratorConfig
import com.expediagroup.graphql.generator.TopLevelObject
import com.expediagroup.graphql.server.types.GraphQLRequest
import com.fasterxml.jackson.databind.MapperFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.cfg.CoercionAction
import com.fasterxml.jackson.databind.cfg.CoercionInputShape
import com.fasterxml.jackson.databind.json.JsonMapper
import com.fasterxml.jackson.databind.type.LogicalType
import graphql.ExceptionWhileDataFetching
import graphql.ExecutionInput
import graphql.GraphQL
import graphql.analysis.MaxQueryComplexityInstrumentation
import graphql.analysis.MaxQueryDepthInstrumentation
import graphql.execution.DataFetcherExceptionHandlerResult
import graphql.execution.instrumentation.ChainedInstrumentation
import jakarta.persistence.EntityManager
import jakarta.ws.rs.*
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.UriInfo
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import net.teuto.udh.schema.RootMutation
import net.teuto.udh.schema.RootQuery
import org.jboss.logging.Logger
import org.keycloak.authorization.AuthorizationProvider
import org.keycloak.authorization.common.DefaultEvaluationContext
import org.keycloak.authorization.fgap.AdminPermissionsSchema
import org.keycloak.authorization.fgap.evaluation.partial.PartialEvaluationPolicyProvider
import org.keycloak.authorization.identity.Identity
import org.keycloak.authorization.identity.UserModelIdentity
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
import org.keycloak.email.EmailTemplateProvider
import org.keycloak.models.*
import org.keycloak.models.utils.ModelToRepresentation
import org.keycloak.representations.IDToken
import org.keycloak.representations.idm.authorization.*
import org.keycloak.services.managers.AppAuthManager
import org.keycloak.services.resource.RealmResourceProvider
import org.keycloak.services.resources.admin.fgap.AdminPermissionManagement
import org.keycloak.services.resources.admin.fgap.AdminPermissions
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.concurrent.CompletableFuture
import java.util.function.BiFunction
import java.util.stream.Stream
import kotlin.reflect.KClass

val LOGGER: Logger = Logger.getLogger("udh")

const val DATA_HUB_CLIENT_ID = "data-hub"
const val OWM_COLLECTOR_CLIENT_ID = "owm-collector"
const val ROOT = "root"
const val ALL_USERS_POLICY = "all-users"
const val DATA_HUB_BYPASS_PARENT_CHECK = "data-hub.bypass-parent-check"
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
    userModel: UserModel?,
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
        userModel = userModel,
    )
}

fun invokePrivate(
    obj: Any,
    methodName: String,
    args: Array<Any> = arrayOf(),
): Any? {
    val fn = obj.javaClass.methods.first { it.name == methodName }
    fn.isAccessible = true
    return fn.invoke(obj, *args)
}

fun ensureResourceIdUnused(
    hash: String,
    context: AuthzContext,
) {
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

fun ensureRealmMgmtPermission(
    ctx: AuthzContext,
    mgmtPermissions: AdminPermissionManagement,
): String {
    val dataHubPolicy = ScopePermissionRepresentation()
    dataHubPolicy.name = "user-management"
    dataHubPolicy.description = "Allow user management based on data-hub permissions"
    dataHubPolicy.resourceType = "Groups" // TODO: use constant
    val adminResourceServer = ctx.storeFactory.resourceServerStore.findByClient(mgmtPermissions.realmPermissionsClient)
    dataHubPolicy.scopes =
        listOf(
            AdminPermissionsSchema.SCHEMA.getScope(
                ctx.session,
                adminResourceServer,
                AdminPermissionsSchema.GROUPS_RESOURCE_TYPE,
                AdminPermissionsSchema.MANAGE_MEMBERS,
            ),
            AdminPermissionsSchema.SCHEMA.getScope(
                ctx.session,
                adminResourceServer,
                AdminPermissionsSchema.GROUPS_RESOURCE_TYPE,
                AdminPermissionsSchema.MANAGE_MEMBERSHIP,
            ),
            AdminPermissionsSchema.SCHEMA.getScope(
                ctx.session,
                adminResourceServer,
                AdminPermissionsSchema.GROUPS_RESOURCE_TYPE,
                AdminPermissionsSchema.MANAGE_MEMBERSHIP_OF_MEMBERS,
            ),
            AdminPermissionsSchema.SCHEMA.getScope(
                ctx.session,
                adminResourceServer,
                AdminPermissionsSchema.GROUPS_RESOURCE_TYPE,
                AdminPermissionsSchema.VIEW,
            ),
            AdminPermissionsSchema.SCHEMA.getScope(
                ctx.session,
                adminResourceServer,
                AdminPermissionsSchema.GROUPS_RESOURCE_TYPE,
                AdminPermissionsSchema.VIEW_MEMBERS,
            ),
        ).map { it.id }.toSet()
    val dataHubGroupPolicy = PolicyRepresentation()
    dataHubGroupPolicy.type = "data-hub-group"
    dataHubGroupPolicy.name = "data-hub-group"
    dataHubGroupPolicy.description = "data-hub specific group authorization"
    dataHubGroupPolicy.resources = emptySet()
    val polId = ensurePolicy(dataHubGroupPolicy, ctx.storeFactory.policyStore, adminResourceServer)
    dataHubPolicy.policies = setOf(polId)
    return ensurePolicy(
        dataHubPolicy,
        ctx.policyStore,
        adminResourceServer,
    )
}

fun ensureRealmUserMgmtPermission(
    ctx: AuthzContext,
    mgmtPermissions: AdminPermissionManagement,
): String {
    val dataHubPolicy = ScopePermissionRepresentation()
    dataHubPolicy.name = "actual-user-management"
    dataHubPolicy.description = "Allow actual user management based on data-hub permissions"
    dataHubPolicy.resourceType = "Users" // TODO: use constant
    val adminResourceServer = ctx.storeFactory.resourceServerStore.findByClient(mgmtPermissions.realmPermissionsClient)
    dataHubPolicy.scopes =
        listOf(
            AdminPermissionsSchema.SCHEMA.getScope(
                ctx.session,
                adminResourceServer,
                AdminPermissionsSchema.USERS_RESOURCE_TYPE,
                AdminPermissionsSchema.MANAGE_GROUP_MEMBERSHIP,
            ),
        ).map { it.id }.toSet()
    val dataHubGroupPolicy = PolicyRepresentation()
    dataHubGroupPolicy.type = "data-hub-group"
    dataHubGroupPolicy.name = "data-hub-group"
    dataHubGroupPolicy.description = "data-hub specific group authorization"
    dataHubGroupPolicy.resources = emptySet()
    val polId = ensurePolicy(dataHubGroupPolicy, ctx.storeFactory.policyStore, adminResourceServer)
    dataHubPolicy.policies = setOf(polId)
    return ensurePolicy(
        dataHubPolicy,
        ctx.policyStore,
        adminResourceServer,
    )
}

fun ensureGlobalPermissions(ctx: AuthzContext) {
    // TODO: enable admin auth for realm
    // seems like that doens't work in the realm config
    val mgmtPermissions = AdminPermissions.management(ctx.session, ctx.realm)
    invokePrivate(mgmtPermissions, "initializeRealmResourceServer")
    invokePrivate(mgmtPermissions, "initializeRealmDefaultScopes")
    ensureRealmMgmtPermission(ctx, mgmtPermissions)
    ensureRealmUserMgmtPermission(ctx, mgmtPermissions)
    ctx.resourceServer.decisionStrategy = DecisionStrategy.AFFIRMATIVE
    listOf("Default Permission", "Default Policy").forEach { policy ->
        ctx.policyStore.findByName(ctx.resourceServer, policy)?.let { ctx.policyStore.delete(it.id) }
    }
    ctx.resourceStore
        .findByName(ctx.resourceServer, "Default Resource")
        ?.let { ctx.resourceStore.delete(it.id) }
    if (ctx.resourceStore.findByName(ctx.resourceServer, ROOT) == null) {
        ctx.resourceStore
            .create(ctx.resourceServer, ROOT, ctx.dataHubClient.id)
            .type = ROOT
    }
    val allUsersPolicy = UserPolicyRepresentation()
    allUsersPolicy.logic = Logic.NEGATIVE
    allUsersPolicy.name = ALL_USERS_POLICY
    allUsersPolicy.description = "Policy that allows all users"
    ensurePolicy(allUsersPolicy, ctx.policyStore, ctx.resourceServer)
    ROOT_TYPE.getAllNames().forEach {
        val permission = ResourcePermissionRepresentation()
        permission.name = "datahub: $it"
        permission.description = "Data HUB custom permissions on $it"
        permission.resourceType = it
        permission.policies = setOf(dataHubPolicy(ctx))
        ensurePolicy(permission, ctx.policyStore, ctx.resourceServer)
    }
}

data class AuditLogElement(
    val action: Action,
    val path: ResourcePath,
    var body: Any? = null,
) {
    override fun toString(): String =
        if (body == null) {
            "$action on ${path.pathRepresentation()}"
        } else {
            "$action on ${path.pathRepresentation()} with $body"
        }
}

data class DelayedActionsList(
    val changes: MutableList<() -> Unit>,
    val auditLogs: MutableList<AuditLogElement>,
) {
    fun printAuditLog(
        user: UserModel?,
        failed: Boolean,
    ) {
        if (auditLogs.isNotEmpty()) {
            val auditPrefix =
                if (failed) {
                    "audit FAILED"
                } else {
                    "audit"
                }
            // if something worth logging happened, user is always non-null
            LOGGER.info("$auditPrefix ${user?.id} (${user?.email}): ${auditLogs.joinToString()}")
        }
    }

    fun setAuditLogDetails(body: Any?) {
        auditLogs.last().body = body
    }

    fun executeChanges(user: UserModel?) {
        try {
            changes.forEach { it() }
            printAuditLog(user, failed = false)
        } catch (e: Exception) {
            printAuditLog(user, failed = true)
            throw e
        }
    }
}

sealed class Action {
    data object Get : Action()

    class Create(
        val resourceType: String,
        val name: String,
    ) : Action()

    class Delete(
        val resourceType: String,
        val name: String,
    ) : Action()

    class CustomAction(
        val customAction: String,
    ) : Action()

    class List(
        val resourceName: String,
    ) : Action()

    data object ListScopes : Action()

    data object ListPermissions : Action()

    class GetPermission(
        val name: String,
    ) : Action()

    class DeletePermission(
        val name: String,
    ) : Action()

    class CreatePermission(
        val name: String,
        val scopes: Collection<String>,
        val principals: Collection<UdhPrincipal>,
        val overwrite: Boolean,
    ) : Action()

    class CreateAttribute(
        val name: String,
        val value: String,
    ) : Action()

    class DeleteAttribute(
        val name: String,
    ) : Action()

    class PatchAttributes(
        val attributes: Map<String, String?>,
    ) : Action()

    data object GetAttributes : Action()

    override fun toString(): String =
        when (this) {
            is Create -> {
                "Create($resourceType, $name)"
            }

            is CreatePermission -> {
                "CreatePermission($name, scopes = ${scopes.joinToString()}, principals = ${principals.joinToString()}, overwrite = $overwrite)"
            }

            is CustomAction -> {
                "CustomAction($customAction)"
            }

            is Delete -> {
                "Delete($resourceType, $name)"
            }

            is DeletePermission -> {
                "DeletePermission($name)"
            }

            Get -> {
                "Get"
            }

            is GetPermission -> {
                "GetPermission($name)"
            }

            is List -> {
                "List($resourceName)"
            }

            ListPermissions -> {
                "ListPermissions"
            }

            ListScopes -> {
                "ListScopes"
            }

            GetAttributes -> {
                "GetAttributes"
            }

            is CreateAttribute -> {
                "CreateAttribute($name, $value)"
            }

            is DeleteAttribute -> {
                "DeleteAttribute($name)"
            }

            is PatchAttributes -> {
                "PatchAttributes($attributes)"
            }
        }
}

// Checks that the `evaluationContext` can view the resource (and implicitly all resources along the path)
// (like /tenant/test, /tenant/test/project/asdf etc.), otherwise throw a NotFoundException
//
// returns the resource at the end of the path
fun resourceCheckOnPath(
    resourcePath: ResourcePath,
    ctx: AuthzContext,
    evaluationContext: EvaluationContext,
): UdhResource<*> {
    var resource: UdhResource<*> = rootResource(ctx)
    resourcePath.path.forEach {
        resource = resource.findSub(it.second, it.first, ctx) ?: throw NotFoundException()
    }
    if (resource.path.path.isNotEmpty() &&
        !hasPermissionScopes(
            resource.kcResource,
            listOf(VIEW_SCOPE),
            ctx,
            evaluationContext,
        )
    ) {
        throw NotFoundException()
    }
    return resource
}

fun createResource(
    ctx: AuthzContext,
    basePath: ResourcePath,
    newResTypeName: String,
    newResName: String,
): UdhResource<*> {
    val baseResource = basePath.getUdhResource(ctx)!!
    // make sure the resourcetype is allowed here
    val newResourceType =
        baseResource.resourceType.findChild(newResTypeName) ?: throw BadRequestException()
    // to create a resource you need resourcetype:admin on the parent resource
    if (!hasPermissionScopes(
            baseResource.kcResource,
            listOf("$newResTypeName:$ADMIN_SCOPE"),
            ctx,
            ctx.evaluationContext,
        )
    ) {
        throw ForbiddenException()
    }
    val newResourcePath = basePath.plus(newResTypeName, newResName)
    val newResourceHash = newResourcePath.toHash()
    ensureResourceIdUnused(newResourceHash, ctx)
    val newResource =
        ctx.resourceStore.create(ctx.resourceServer, newResourceHash, newResourceHash, ctx.dataHubClient.id)
    newResourcePath.path.forEach {
        newResource.setAttribute(it.first, listOf(it.second))
    }
    newResource.type = newResTypeName
    newResource.updateScopes(newResourceType.resolveOwnScopes(ctx))
    newResource.displayName = newResourcePath.pathRepresentation()
    return UdhResource(newResourcePath, newResource, newResourceType)
}

fun executeAction(
    targetResource: ResourcePath,
    action: Action,
    ctx: AuthzContext,
    delayedActionsList: DelayedActionsList,
    body: String?,
): Any? {
    val targetGenResource = resourceCheckOnPath(targetResource, ctx, ctx.evaluationContext)
    when (action) {
        Action.Get -> {
            return Response.noContent().build()
        }

        is Action.Create -> {
            delayedActionsList.auditLogs.add(
                AuditLogElement(
                    action,
                    targetResource,
                ),
            )
            val newGenRes = createResource(ctx, targetResource, action.resourceType, action.name)
            val postCreateResult =
                newGenRes.getResourceModel().postCreate(ctx, delayedActionsList, newGenRes, body)

            return if (postCreateResult != Unit) {
                postCreateResult
            } else {
                Response
                    .status(201)
                    .entity(
                        mapOf(
                            "name" to action.name,
                        ),
                    ).build()
            }
        }

        is Action.CustomAction -> {
            delayedActionsList.auditLogs.add(
                AuditLogElement(
                    action,
                    targetResource,
                ),
            )
            return targetGenResource
                .getResourceModel()
                .customAction(ctx, delayedActionsList, action.customAction, body, targetGenResource)
        }

        is Action.Delete -> {
            delayedActionsList.auditLogs.add(
                AuditLogElement(
                    action,
                    targetResource,
                ),
            )
            // to delete a resource you need resourcetype:admin on the parent resource
            if (!hasPermissionScopes(
                    targetGenResource.kcResource,
                    listOf("${action.resourceType}:$ADMIN_SCOPE"),
                    ctx,
                    ctx.evaluationContext,
                )
            ) {
                throw ForbiddenException()
            }
            val resToDelete =
                targetGenResource.findSub(action.name, action.resourceType, ctx) ?: throw NotFoundException()
            resToDelete.deleteCascading(ctx, delayedActionsList)

            return Response.noContent().build()
        }

        is Action.List -> {
            return targetGenResource
                .listSub(action.resourceName, ctx)
                .filter {
                    hasPermissionScopes(it.kcResource, listOf(VIEW_SCOPE), ctx, ctx.evaluationContext)
                }.map {
                    it.path.path
                        .last()
                        .second
                }
        }

        Action.ListScopes -> {
            val allPermissions = targetGenResource.resourceType.getPrefixedScopes()
            val granted =
                targetGenResource.resourceType.prefixedOwnScopes.filter {
                    hasPermissionScopes(
                        targetGenResource.kcResource,
                        listOf(it),
                        ctx,
                        ctx.evaluationContext,
                    )
                }
            return mapOf(
                "all" to allPermissions,
                "granted" to granted,
            )
        }

        Action.ListPermissions -> {
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            return Json.encodeToString(
                ctx.policyStore
                    .findByResource(ctx.resourceServer, targetGenResource.kcResource)
                    .map { permissionToRep(it, ctx, true) },
            )
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
            delayedActionsList.auditLogs.add(
                AuditLogElement(
                    action,
                    targetResource,
                ),
            )
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            val permission =
                lookupPermission(targetGenResource.kcResource, action.name, ctx) ?: throw NotFoundException()
            val principals = permissionToPrincipals(permission, ctx)
            ctx.policyStore.delete(permission.id)

            val orgsToSync =
                principals.flatMap {
                    listOf(it as? UdhVizGroup ?: return@flatMap listOf())
                }
            LOGGER.debug("delete permission, would sync ${orgsToSync.joinToString()}")
            delayedActionsList.changes.add {
                syncGrafanaOrgs(ctx, orgsToSync)
            }

            return Response.noContent().build()
        }

        is Action.CreatePermission -> {
            delayedActionsList.auditLogs.add(
                AuditLogElement(
                    action,
                    targetResource,
                ),
            )
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            val validScopes = targetGenResource.resourceType.getPrefixedScopes().toSet()
            if (action.scopes.any { it !in validScopes }) {
                throw BadRequestException()
            }
            val tenantName = targetGenResource.kcResource.attributes["tenant"]!!.first()!!
            val resolvedScopes = action.scopes.map { createScope(it, ctx).id }
            val policyIds =
                action.principals.map {
                    when (it) {
                        is UdhGroup -> {
                            ensureGroupPolicy(it, ctx)
                        }

                        is UdhTenant -> {
                            ensureTenantPolicy(it, ctx)
                        }

                        is UdhUserPrincipal -> {
                            ensureUserPolicy(it.userId, ctx)
                        }

                        is UdhAllAuthenticatedUsersPrincipal -> {
                            getAllAuthenticatedUsersPolicy(ctx)
                        }

                        is UdhProject -> {
                            ensureResourcePolicy(it.path, ctx)
                        }

                        is UdhVizGroup -> {
                            ensureResourcePolicy(it.path, ctx)
                        }

                        else -> {
                            throw BadRequestException()
                        }
                    }
                }
            var updated = false
            val permissionPrincipals = action.principals.toMutableSet()
            val existing = lookupPermission(targetGenResource.kcResource, action.name, ctx)

            if (existing != null && !action.overwrite) {
                return Response.status(409)
            }

            existing?.let {
                updated = true
                ctx.policyStore.delete(it.id)
                // without flushing, re-creating with same name in same transaction fails
                ctx.entityManager.flush()
                permissionPrincipals.addAll(permissionToPrincipals(it, ctx))
            }
            val policy = ScopePermissionRepresentation()
            policy.name = targetGenResource.path.plus("permission", action.name).toHash()
            policy.addResource(targetGenResource.kcResource.id)
            policy.scopes = resolvedScopes.toSet()
            policy.policies = policyIds.toSet()
            policy.decisionStrategy = DecisionStrategy.AFFIRMATIVE
            policy.description = action.name
            createPolicy(policy, ctx.policyStore, ctx.resourceServer)
            // without flushing, the permission is ignored during this transaction
            ctx.entityManager.flush()

            val orgsToSync =
                permissionPrincipals.flatMap {
                    listOf(it as? UdhVizGroup ?: return@flatMap listOf())
                }
            LOGGER.debug("create permission, would sync ${orgsToSync.joinToString()}")
            delayedActionsList.changes.add {
                syncGrafanaOrgs(ctx, orgsToSync)
            }

            return Response
                .status(
                    if (updated) {
                        204
                    } else {
                        201
                    },
                ).entity(
                    Json.encodeToString(
                        PermissionRep(
                            scopes = action.scopes,
                            principals = action.principals,
                            name = action.name,
                        ),
                    ),
                ).build()
        }

        Action.GetAttributes -> {
            return Response.ok(targetGenResource.customAttributes()).build()
        }

        is Action.CreateAttribute -> {
            delayedActionsList.auditLogs.add(
                AuditLogElement(
                    action,
                    targetResource,
                ),
            )
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            targetGenResource.kcResource.setAttribute(
                "${ATTR_PREFIX}${action.name}",
                listOf(validateAttributeValue(action.value)),
            )
            targetGenResource.getResourceModel().postAttributeChange(ctx, delayedActionsList, targetGenResource)
            return Response.noContent().build()
        }

        is Action.PatchAttributes -> {
            delayedActionsList.auditLogs.add(
                AuditLogElement(
                    action,
                    targetResource,
                ),
            )
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            action.attributes.forEach { (name, value) ->
                if (value == null) {
                    targetGenResource.kcResource.removeAttribute("${ATTR_PREFIX}$name")
                } else {
                    targetGenResource.kcResource.setAttribute(
                        "${ATTR_PREFIX}$name",
                        listOf(validateAttributeValue(value)),
                    )
                }
            }
            targetGenResource.getResourceModel().postAttributeChange(ctx, delayedActionsList, targetGenResource)
            return Response.ok(targetGenResource.customAttributes()).build()
        }

        is Action.DeleteAttribute -> {
            delayedActionsList.auditLogs.add(
                AuditLogElement(
                    action,
                    targetResource,
                ),
            )
            if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
                throw ForbiddenException()
            }
            targetGenResource.kcResource.removeAttribute("${ATTR_PREFIX}${action.name}")
            targetGenResource.getResourceModel().postAttributeChange(ctx, delayedActionsList, targetGenResource)
            return Response.noContent().build()
        }
    }
}

fun ensureResourcePolicy(
    resourcePath: ResourcePath,
    ctx: AuthzContext,
): String {
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

fun ensureKcGroupPolicy(
    groupHash: String,
    description: String,
    ctx: AuthzContext,
    extendChildren: Boolean,
): String {
    val policy = GroupPolicyRepresentation()
    policy.name = groupHash
    policy.groupsClaim = "data-hub.attribute.groups"
    policy.description = description
    policy.addGroup(groupHash, extendChildren)
    return ensurePolicy(policy, ctx.policyStore, ctx.resourceServer)
}

fun ensureGroupPolicy(
    group: UdhGroup,
    ctx: AuthzContext,
): String {
    val groupPath = group.path
    resourceCheckOnPath(groupPath, ctx, ctx.evaluationContext)
    return ensureKcGroupPolicy(groupPath.toHash(), "${group.tenant} / ${group.group}", ctx, extendChildren = false)
}

fun ensureTenantPolicy(
    tenant: UdhTenant,
    ctx: AuthzContext,
): String {
    resourceCheckOnPath(tenant.path, ctx, ctx.evaluationContext)
    return ensureKcGroupPolicy(tenantGroupId(tenant.tenant), tenant.tenant, ctx, extendChildren = true)
}

fun ensureUserPolicy(
    userId: String,
    ctx: AuthzContext,
): String {
    val userPrincipal =
        ctx.session.users().getUserById(ctx.realm, userId) ?: throw NotFoundException()

    // TODO: use userPermissions.canView(userPrincipal) when keycloak fixes it
    // val permissionEvaluator = AdminPermissions.evaluator(ctx.session, ctx.realm, ctx.realm, ctx.userModel)

    val realmMgmtClient = ctx.realm.getClientByClientId(Constants.REALM_MANAGEMENT_CLIENT_ID)

    // check if the calling user can view all users
    if (!ctx.userModel!!.hasRole(realmMgmtClient.getRole(AdminRoles.REALM_ADMIN))) {
        // if not, check if the calling user can view *this* user principal
        val manageGroupIds = DatahubGroupPolicyProvider.getManageKcGroupIdsForUser(ctx)
        if (!userPrincipal.groupsStream.anyMatch { manageGroupIds.contains(it.id) }) {
            throw NotFoundException()
        }
    }
    val policy = UserPolicyRepresentation()
    policy.name = "user-$userId"
    policy.description = userId
    policy.addUser(userId)
    return ensurePolicy(policy, ctx.policyStore, ctx.resourceServer)
}

fun ensurePolicy(
    policy: AbstractPolicyRepresentation,
    policyStore: PolicyStore,
    resourceServer: ResourceServer,
): String = lookupPolicy(policy, policyStore, resourceServer) ?: createPolicy(policy, policyStore, resourceServer)

fun getAllAuthenticatedUsersPolicy(ctx: AuthzContext): String = ctx.policyStore.findByName(ctx.resourceServer, ALL_USERS_POLICY).id

fun lookupPolicy(
    policy: AbstractPolicyRepresentation,
    policyStore: PolicyStore,
    resourceServer: ResourceServer,
): String? = policyStore.findByName(resourceServer, policy.name)?.id

fun createPolicy(
    policy: AbstractPolicyRepresentation,
    policyStore: PolicyStore,
    resourceServer: ResourceServer,
): String = policyStore.create(resourceServer, policy).id

fun lookupPermission(
    resource: Resource,
    permissionName: String,
    ctx: AuthzContext,
): Policy? =
    ctx.policyStore.findByResource(ctx.resourceServer, resource).firstOrNull {
        it.description == permissionName
    }

@Serializable
data class PermissionRep(
    val scopes: Collection<String>,
    val principals: Collection<UdhPrincipal>,
    val name: String? = null,
)

fun permissionToPrincipals(
    permission: Policy,
    ctx: AuthzContext,
): List<UdhPrincipal> =
    permission.associatedPolicies.flatMap { policy ->
        if (policy.type == "group") {
            ModelToRepresentation
                .toRepresentation<GroupPolicyRepresentation>(
                    policy,
                    ctx.authProvider,
                    false,
                    false,
                ).groups
                .map {
                    val group = ctx.realm.getGroupById(it.id)
                    if (group.parentId == null) {
                        // TODO null shouldn't happen, still handle it
                        UdhTenant(group.name)
                    } else {
                        UdhGroup(group.parent.name, group.name)
                    }
                }
        } else if (policy.type == DATA_HUB_RESOURCE_POLICY) {
            val resPrincipal =
                ModelToRepresentation
                    .toRepresentation<DatahubResourcePolicyRepresentation>(
                        policy,
                        ctx.authProvider,
                        false,
                        false,
                    ).resourcePrincipal
            val resource = ctx.resourceStore.findByName(ctx.resourceServer, resPrincipal)
            listOf(udhResourceModelFromResource(resource))
        } else {
            listOf()
        }
    }

fun permissionToRep(
    permission: Policy,
    ctx: AuthzContext,
    includeName: Boolean,
): PermissionRep {
    val scopes = permission.scopes.map { it.name }.sorted()
    val principals =
        permission.associatedPolicies.flatMap { policy ->
            when (policy.type) {
                "group" -> {
                    ModelToRepresentation
                        .toRepresentation<GroupPolicyRepresentation>(
                            policy,
                            ctx.authProvider,
                            false,
                            false,
                        ).groups
                        .map {
                            val group = ctx.realm.getGroupById(it.id)
                            if (group.parentId == null) {
                                UdhTenant(group.name)
                            } else {
                                UdhGroup(group.parent.name, group.name)
                            }
                        }
                }

                "user" -> {
                    if (policy.name == ALL_USERS_POLICY) {
                        listOf(UdhAllAuthenticatedUsersPrincipal())
                    } else {
                        ModelToRepresentation
                            .toRepresentation<UserPolicyRepresentation>(
                                policy,
                                ctx.authProvider,
                                false,
                                false,
                            ).users
                            .map {
                                UdhUserPrincipal(it)
                            }
                    }
                }

                DATA_HUB_RESOURCE_POLICY -> {
                    val resPrincipal =
                        ModelToRepresentation
                            .toRepresentation<DatahubResourcePolicyRepresentation>(
                                policy,
                                ctx.authProvider,
                                false,
                                false,
                            ).resourcePrincipal
                    val resource = ctx.resourceStore.findByName(ctx.resourceServer, resPrincipal)
                    listOf(udhResourceModelFromResource(resource))
                }

                else -> {
                    LOGGER.error("unknown policy type: ${policy.type}")
                    listOf()
                }
            }
        }
    return PermissionRep(
        scopes = scopes,
        principals = principals,
        name =
            if (includeName) {
                permission.description
            } else {
                null
            },
    )
}

fun tenantGroupId(tenant: String): String = hashString(tenant)

fun <T : UdhResourceModel> postNoop(
    res: T,
    ctx: AuthzContext,
    externalChangesList: MutableList<() -> Unit>,
) {
}

class ResourceType<T : UdhResourceModel>(
    val resourceTypeName: String,
    specificOwnScopes: List<String> = listOf(),
    val children: List<ResourceType<*>> = listOf(),
    val attributesToModel: (Map<String, List<String>>) -> T,
    val allowedAsPrincipal: Boolean = false,
) {
    var parent: ResourceType<*>? = null
    val ownScopes: List<String>
    val prefixedOwnScopes: List<String>

    init {
        this.children.forEach { it.parent = this }
        this.ownScopes = specificOwnScopes + VIEW_SCOPE + READ_SCOPE + ADMIN_SCOPE
        this.prefixedOwnScopes = ownScopes.map { "$resourceTypeName:$it" }
    }

    fun getPrefixedScopes(): List<String> =
        this.children
            .flatMap { it.getPrefixedScopes() }
            .plus(prefixedOwnScopes)
            .sorted()

    fun findResourceType(subResType: String): ResourceType<*>? =
        if (subResType == resourceTypeName) {
            this
        } else {
            children.map { it.findResourceType(subResType) }.firstOrNull { it != null }
        }

    fun findChild(subResType: String): ResourceType<*>? = children.firstOrNull { it.resourceTypeName == subResType }

    fun resolveOwnScopes(authzContext: AuthzContext): Set<Scope> = prefixedOwnScopes.map { createScope(it, authzContext) }.toSet()

    fun getAllNames(): Collection<String> = children.flatMap { it.getAllNames() }.plus(resourceTypeName)
}

const val ADMIN_SCOPE = "admin"
const val READ_SCOPE = "read"
const val VIEW_SCOPE = "view"

fun isReadAccessScope(scope: Scope): Boolean = isReadAccessScope(scope.name)

fun isReadAccessScope(scopeName: String): Boolean = scopeName.endsWith("-read") || scopeName.endsWith(":view")

val resDepths = getResDepth(ROOT_TYPE, 0).toMap()

fun getResDepth(
    res: ResourceType<*>,
    depth: Int,
): List<Pair<String, Int>> =
    res.children
        .flatMap {
            getResDepth(it, depth + 1)
        }.plus(Pair(res.resourceTypeName, depth))

fun resourceTypeForName(resourceName: String): ResourceType<*>? = ROOT_TYPE.findResourceType(resourceName)

class UdhResource<T : UdhResourceModel>(
    val path: ResourcePath,
    val kcResource: Resource,
    val resourceType: ResourceType<T>,
) {
    fun findSub(
        name: String,
        subtype: String,
        ctx: AuthzContext,
    ): UdhResource<*>? {
        val subPath = path.plus(subtype, name)
        val subPathHash = subPath.toHash()
        val subResource = ctx.resourceStore.findByName(ctx.resourceServer, subPathHash) ?: return null
        val subResType = resourceType.findChild(subtype) ?: return null
        return UdhResource(subPath, subResource, subResType)
    }

    fun parent(ctx: AuthzContext): UdhResource<*>? {
        val parentPath = path.parent()
        if (parentPath == null) {
            return null
        } else if (parentPath.path.isEmpty()) {
            return rootResource(ctx)
        } else {
            val parentResource = parentPath.getResource(ctx)
            // TODO: figure out why this happens
            if (parentResource == null) {
                LOGGER.warn("BUG: parent resource of ${path.pathRepresentation()} doesn't exist!")
                return null
            }
            return UdhResource(parentPath, parentResource, resourceType.parent!!)
        }
    }

    fun listSub(
        subResourceType: String,
        ctx: AuthzContext,
    ): List<UdhResource<*>> =
        findAllMatchingResources(subResourceType, path.toAttributes(), ctx).map {
            udhResourceFromKcResource(
                it,
            )
        }

    fun deleteCascading(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
    ) {
        // delete all children first
        resourceType.children.forEach { resType ->
            listSub(resType.resourceTypeName, ctx).forEach {
                it.deleteCascading(ctx, delayedActionsList)
            }
        }
        // delete hook
        getResourceModel().postDelete(ctx, delayedActionsList, this)
        // delete policy for this resource
        val resourceHash = path.toHash()
        ctx.policyStore.findByName(ctx.resourceServer, "res-$resourceHash")?.let {
            ctx.policyStore.delete(it.id)
        }
        // delete this
        ctx.resourceStore.delete(kcResource.id)
    }

    fun customAttributes(): Map<String, String> =
        kcResource.attributes
            .filterKeys {
                it.startsWith(ATTR_PREFIX)
            }.mapKeys { it.key.removePrefix(ATTR_PREFIX) }
            .mapValues { it.value.first() }

    fun customAttribute(attribute: String): String? = kcResource.attributes["${ATTR_PREFIX}$attribute"]?.first()

    fun getResourceModel(): T = resourceType.attributesToModel(kcResource.attributes)
}

fun rootResource(context: AuthzContext): UdhResource<UdhRoot> {
    val rootRes =
        context.resourceStore.findByName(context.resourceServer, ROOT) ?: context.resourceStore
            .create(
                context.resourceServer,
                ROOT,
                ROOT,
                context.dataHubClient.id,
            ).also { it.type = ROOT }
    return UdhResource(ResourcePath(listOf()), rootRes, ROOT_TYPE)
}

fun udhResourceFromKcResource(kcResource: Resource): UdhResource<*> {
    val resourcePath = ResourcePath.fromResource(kcResource)
    val resType =
        resourcePath.path
            .lastOrNull()
            ?.first
            ?.let(::resourceTypeForName) ?: ROOT_TYPE
    return UdhResource(resourcePath, kcResource, resType)
}

@OptIn(ExperimentalStdlibApi::class)
fun hashString(s: String): String =
    try {
        val md = MessageDigest.getInstance("SHA-256")
        md.update(s.encodeToByteArray())
        md.digest().toHexString().substring(0, 36)
    } catch (e: NoSuchAlgorithmException) {
        throw RuntimeException(e)
    }

class ResourcePath(
    val path: List<Pair<String, String>> = listOf(),
) {
    companion object {
        fun fromResource(resource: Resource): ResourcePath =
            ResourcePath(
                resource.attributes
                    .filter { resDepths.contains(it.key) }
                    .map { Pair(it.key, it.value.first()) }
                    .sortedBy { resDepths[it.first] },
            )
    }

    fun toHash(): String =
        try {
            val combined = path.sortedBy { it.first }.joinToString("") { ":${it.first}${it.second}" }
            hashString(combined)
        } catch (e: NoSuchAlgorithmException) {
            throw RuntimeException(e)
        }

    fun toAttributes(): Map<String, String> = path.toMap()

    fun plus(
        subtype: String,
        name: String,
    ): ResourcePath = ResourcePath(path.plus(Pair(subtype, name)))

    fun parent(): ResourcePath? =
        if (path.isNotEmpty()) {
            ResourcePath(path.subList(0, path.size - 1))
        } else {
            null
        }

    fun getResource(ctx: AuthzContext): Resource? =
        if (path.isEmpty()) {
            rootResource(ctx).kcResource
        } else {
            ctx.resourceStore.findByName(ctx.resourceServer, toHash())
        }

    fun getUdhResource(ctx: AuthzContext): UdhResource<*>? {
        val res = getResource(ctx) ?: return null
        val resType =
            path.lastOrNull()?.first?.let(::resourceTypeForName)
                ?: ROOT_TYPE
        return UdhResource(this, res, resType)
    }

    fun pathRepresentation(): String = path.joinToString("/") { "${it.first}/${it.second}" }
}

fun createScope(
    name: String,
    context: AuthzContext,
): Scope =
    context.storeFactory.scopeStore.findByName(context.resourceServer, name)
        ?: context.storeFactory.scopeStore.create(context.resourceServer, name)

fun hasPermissionScopes(
    resource: Resource,
    scopes: Collection<String>,
    context: AuthzContext,
    evaluationContext: EvaluationContext,
): Boolean {
    val resolvedScopes =
        scopes.map {
            val fullScopeName =
                if (it.contains(":")) {
                    it
                } else {
                    "${resource.type}:$it"
                }
            createScope(fullScopeName, context)
        }
    return hasPermissions(resource, resolvedScopes, context, evaluationContext)
}

fun hasPermissions(
    resource: Resource,
    scopes: Collection<Scope>,
    context: AuthzContext,
    evaluationContext: EvaluationContext,
): Boolean {
    val resourcePermission = ResourcePermission(resource, scopes, context.resourceServer)
    val grantedScopes =
        context.authProvider
            .evaluators()
            .from(listOf(resourcePermission), evaluationContext)
            .evaluate(context.resourceServer, null)
            .firstOrNull()
            ?.scopes ?: return false
    return grantedScopes.size == scopes.size
}

fun findAllMatchingResources(
    resourceType: String,
    attributes: Map<String, String>,
    context: AuthzContext,
): Collection<Resource> =
    context.resourceStore.findByType(context.resourceServer, resourceType).filter { res ->
        val resAttributes = res.attributes
        attributes.all { resAttributes[it.key]?.first() == it.value }
    }

class DatahubResourcePolicyRepresentation(
    val resourcePrincipal: String,
) : AbstractPolicyRepresentation() {
    override fun getType(): String = DATA_HUB_RESOURCE_POLICY
}

class DatahubResourcePolicyProvider(
    private val representationFunction: BiFunction<Policy, AuthorizationProvider, DatahubResourcePolicyRepresentation>,
) : PolicyProvider {
    override fun evaluate(evaluation: Evaluation) {
        val authProvider = evaluation.authorizationProvider
        val resourcePolicy = representationFunction.apply(evaluation.policy, authProvider)
        val resourceAttr =
            evaluation.context.identity.attributes
                .getValue(DATA_HUB_RESOURCE_KEY)
        if (resourceAttr != null && !resourceAttr.isEmpty && resourceAttr.asString(0) == resourcePolicy.resourcePrincipal) {
            evaluation.grant()
        }
    }

    override fun close() {}
}

// this intentionally only implements a handful of functions, just enough to work in keycloak when returned from getPermissions
class DynamicGroupPolicy(
    val resNames: Set<String>,
) : Policy {
    override fun getId(): String? = null

    override fun getType(): String = "data-hub-dynamic"

    override fun getDecisionStrategy(): DecisionStrategy = DecisionStrategy.AFFIRMATIVE

    override fun setDecisionStrategy(decisionStrategy: DecisionStrategy?) {
        TODO("Not yet implemented")
    }

    override fun getLogic(): Logic = Logic.POSITIVE

    override fun setLogic(logic: Logic?) {
        TODO("Not yet implemented")
    }

    override fun getConfig(): Map<String, String> = emptyMap()

    override fun setConfig(config: Map<String?, String?>?) {
        TODO("Not yet implemented")
    }

    override fun removeConfig(name: String?) {
        TODO("Not yet implemented")
    }

    override fun putConfig(
        name: String?,
        value: String?,
    ) {
        TODO("Not yet implemented")
    }

    override fun getName(): String = "data hub custom name"

    override fun setName(name: String?) {
        TODO("Not yet implemented")
    }

    override fun getDescription(): String? = "data hub custom description"

    override fun setDescription(description: String?) {
        TODO("Not yet implemented")
    }

    override fun getResourceServer(): ResourceServer? = null

    override fun getAssociatedPolicies(): Set<Policy> {
        // TODO: this should return a policy that immediately resolves, maybe "this"?
        return setOf(this)
    }

    override fun getResources(): Set<Resource> {
        TODO("Not yet implemented")
    }

    // this is the important function for partial evaluation, all of these ids are used to grant access
    override fun getResourceNames(): Set<String> = resNames

    override fun getScopes(): Set<Scope?>? {
        TODO("Not yet implemented")
    }

    override fun getOwner(): String? = null

    override fun setOwner(owner: String?) {
        TODO("Not yet implemented")
    }

    override fun addScope(scope: Scope?) {
        TODO("Not yet implemented")
    }

    override fun removeScope(scope: Scope?) {
        TODO("Not yet implemented")
    }

    override fun addAssociatedPolicy(associatedPolicy: Policy?) {
        TODO("Not yet implemented")
    }

    override fun removeAssociatedPolicy(associatedPolicy: Policy?) {
        TODO("Not yet implemented")
    }

    override fun addResource(resource: Resource?) {
        TODO("Not yet implemented")
    }

    override fun removeResource(resource: Resource?) {
        TODO("Not yet implemented")
    }
}

class DatahubGroupPolicyProvider(
    val keycloakSession: KeycloakSession,
) : PolicyProvider,
    PartialEvaluationPolicyProvider {
    override fun evaluate(evaluation: Evaluation) {
        val context = getAuthzContext(evaluation.authorizationProvider.keycloakSession, evaluation.context, null)
        val client = context.realm.getClientById(evaluation.permission.resource.resourceServer.clientId)
        val resourceClientId = client.clientId
        val resource = evaluation.permission.resource
//        LOGGER.info(
//            "evaluation group $resourceClientId ${evaluation.permission.scopes.map {
//                it.name
//            }} ${resource.name} ${evaluation.permission.resourceType} ${resource.javaClass.canonicalName} ${resource.displayName} ${resource.owner}",
//        )
        if (resourceClientId.equals(Constants.ADMIN_PERMISSIONS_CLIENT_ID)) {
            if (evaluation.permission.resourceType == "Groups") {
                // used to handle access to keycloak groups, so user can manage themselves
                val groupId = resource.name
                val group = context.realm.getGroupById(groupId)
                if (group == null) {
                    evaluation.deny()
                    return
                }
                val groupName = group.name
                val parentGroupName = group.parent?.name
                if (parentGroupName != null) {
                    val groupRes =
                        ResourcePath(listOf(Pair("tenant", parentGroupName), Pair("group", groupName))).getResource(
                            context,
                        )
                    if (groupRes != null &&
                        hasPermissionScopes(
                            groupRes,
                            listOf(ADMIN_SCOPE),
                            context,
                            evaluation.context,
                        )
                    ) {
                        evaluation.grant()
                        return
                    }
                }
                // if the user can access any subgroup, allow access to the supergroup
                val tenantGroups = findAllMatchingResources("group", mapOf("tenant" to groupName), context)
                if (tenantGroups.any {
                        hasPermissionScopes(it, listOf(ADMIN_SCOPE), context, evaluation.context)
                    }
                ) {
                    evaluation.grant()
                    return
                }
            } else if (evaluation.permission.resourceType == "Users") {
                val user = context.session.users().getUserById(context.realm, resource.name)
                if (user != null) {
                    val managedGroupIds = getManageKcGroupIdsForUser(context)
                    if (user.groupsStream.anyMatch { managedGroupIds.contains(it.id) }) {
                        evaluation.grant()
                        return
                    }
                }
            }
        }
        evaluation.deny()
    }

    override fun supports(policy: Policy): Boolean = policy.type == "data-hub-dynamic"

    // we don't need to actually check anything for partial evaluation, because our own created dynamic policy only has the group ids the user has access to
    override fun evaluate(
        session: KeycloakSession,
        policy: Policy,
        subject: UserModel,
    ): Boolean = policy.type == "data-hub-dynamic"

    override fun getPermissions(
        session: KeycloakSession,
        resourceType: org.keycloak.representations.idm.authorization.ResourceType,
        groupResourceType: org.keycloak.representations.idm.authorization.ResourceType?,
        subject: UserModel,
    ): Stream<Policy> {
        if (resourceType.type != AdminPermissionsSchema.GROUPS_RESOURCE_TYPE) {
            return Stream.empty()
        }
        val ctx = getAuthzContext(session, DefaultEvaluationContext(UserModelIdentity(session.context.realm, subject), session), subject)
        // keycloak intends to load this from the database, but we create a policy at runtime instead
        // that policy contains all the group ids that the user has access to, for partial evaluation
        return Stream.of(DynamicGroupPolicy(getManageKcGroupIdsForUser(ctx)))
    }

    companion object {
        fun getManageKcGroupIdsForUser(ctx: AuthzContext): Set<String> {
            val groupResources = getResourcesForUser(ctx, GROUP_TYPE, emptyMap(), listOf(ADMIN_SCOPE))
            val resources = groupResources.map { it.getResourceModel().kcGroupId }.toMutableSet()
            // if you can manage the members of a subgroup of a tenant, you can also manage the users of the tenant group
            groupResources.forEach {
                val tenantRes = it.parent(ctx)?.getResourceModel() as? UdhTenant
                if (tenantRes != null) {
                    resources.add(tenantRes.kcGroupId)
                }
            }
            getResourcesForUser(ctx, TENANT_TYPE, emptyMap(), listOf(ADMIN_SCOPE)).forEach {
                resources.add(it.getResourceModel().kcGroupId)
            }
            return resources
        }
    }

    override fun close() {}
}

class DatahubPolicyProvider(
    val authorization: AuthorizationProvider,
) : PolicyProvider {
    override fun evaluate(evaluation: Evaluation) {
        val context = getAuthzContext(evaluation.authorizationProvider.keycloakSession, evaluation.context, null)
        val client = context.realm.getClientById(evaluation.permission.resource.resourceServer.clientId)
        val resourceClientId = client.clientId
        val resource = evaluation.permission.resource
        val scopes = evaluation.permission.scopes
        // LOGGER.info("evaluation ${resourceClientId} ${scopes.map { it.name }} ${resource.name} ${resource.type} ${resource.javaClass.canonicalName} ${resource.displayName} ${resource.owner} ${evaluation.permission.resourceType}")
        if (resourceClientId == DATA_HUB_CLIENT_ID) {
            // data-hub custom policy to make inheriting scopes work and give all permissions when admin
            val genResource = udhResourceFromKcResource(resource)

            // bypass parent check for technical principals like viz-groups
            val bypassParentCheck =
                evaluation.context.identity.attributes
                    .getValue(DATA_HUB_BYPASS_PARENT_CHECK)
                    ?.asString(0) == "1"

            // if you can't see the ancestors everything is denied
            val parentResource = genResource.parent(context)
            if (!(
                    bypassParentCheck || parentResource == null || parentResource.resourceType == ROOT_TYPE ||
                        hasPermissionScopes(
                            parentResource.kcResource,
                            setOf(VIEW_SCOPE),
                            context,
                            evaluation.context,
                        )
                )
            ) {
                evaluation.deny()
                return
            }

            // if we're checking for the group:view scope, grant it if you're a member of the group
            if (scopes.all { it.name == "${GROUP_TYPE.resourceTypeName}:${VIEW_SCOPE}" } &&
                (genResource.getResourceModel() as? UdhGroup)?.let { group ->
                    evaluation.realm.isUserInGroup(evaluation.context.identity.id, "${group.tenant}/${group.group}")
                } == true
            ) {
                evaluation.grant()
                return
            }

            // Either you are admin for the udh realm
            if (evaluation.context.identity.hasClientRole(Constants.REALM_MANAGEMENT_CLIENT_ID, "manage-realm")) {
                evaluation.grant()
                return
            }
            // or you are admin on this resource
            if (scopes.none { it.name == "${genResource.resourceType.resourceTypeName}:$ADMIN_SCOPE" } &&
                hasPermissionScopes(resource, listOf(ADMIN_SCOPE), context, evaluation.context)
            ) {
                evaluation.grant()
                return
            }
            // or you have the read scope on this resource and the scope in question is some kind of read access
            if (scopes.all(::isReadAccessScope) &&
                scopes.none { it.name == "${genResource.resourceType.resourceTypeName}:$READ_SCOPE" } &&
                hasPermissionScopes(resource, listOf(READ_SCOPE), context, evaluation.context)
            ) {
                evaluation.grant()
                return
            }
            // or you have this scope on a parent permission
            if (parentResource != null &&
                hasPermissions(
                    parentResource.kcResource,
                    scopes,
                    context,
                    evaluation.context,
                )
            ) {
                evaluation.grant()
                return
            }
        } else if (resourceClientId.equals(Constants.ADMIN_PERMISSIONS_CLIENT_ID) && resource.type.equals("Groups")) {
            // used to handle access to keycloak groups, so user can manage themselves
            val groupId = resource.name.split(".").last()
            val group = context.realm.getGroupById(groupId)
            val groupName = group.name
            val parentGroupName = group.parent?.name
            if (parentGroupName != null) {
                val groupRes =
                    ResourcePath(listOf(Pair("tenant", parentGroupName), Pair("group", groupName))).getResource(
                        context,
                    )
                if (groupRes != null &&
                    hasPermissionScopes(
                        groupRes,
                        listOf(ADMIN_SCOPE),
                        context,
                        evaluation.context,
                    )
                ) {
                    evaluation.grant()
                    return
                }
            }
            // if the user can access any subgroup, allow access to the supergroup
            val tenantGroups = findAllMatchingResources("group", mapOf("tenant" to groupName), context)
            if (tenantGroups.any {
                    hasPermissionScopes(it, listOf(ADMIN_SCOPE), context, evaluation.context)
                }
            ) {
                evaluation.grant()
                return
            }
        }
    }

    override fun close() {}
}

fun singularize(s: String): String = s.trimEnd('s')

val NAME_REGEX = Regex("[a-z0-9]([-a-z0-9]{0,34}[a-z0-9])?")

fun ensureValidName(name: String): String {
    if (!name.matches(NAME_REGEX)) {
        throw BadRequestException()
    }
    return name
}

val NON_COERCING_MAPPER: JsonMapper =
    JsonMapper
        .builder()
        .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
        .withCoercionConfig(LogicalType.Textual) { cfg ->
            run {
                cfg.setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
                cfg.setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail)
                cfg.setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
            }
        }.build()

fun parseIntent(
    uriInfo: UriInfo,
    method: String,
    body: String?,
): Pair<ResourcePath, Action> {
    // drop /realms/udh/data-hub/
    val pathChunks =
        uriInfo.pathSegments
            .drop(3)
            .map { ensureValidName(it.path) }
            .chunked(2)
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
                        val permissionRequest = decodeJson<PermissionRep>(body)
                        return parentPath to
                            Action.CreatePermission(
                                lastResourceName,
                                permissionRequest.scopes,
                                permissionRequest.principals,
                                true,
                            )
                    } catch (e: SerializationException) {
                        throw BadRequestException()
                    }
                } else if (lastResourceType == "attribute") {
                    return parentPath to
                        Action.CreateAttribute(
                            lastResourceName,
                            body ?: "",
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
                val attributesPatch = decodeJson<Map<String, String?>>(body)
                attributesPatch.keys.forEach(::ensureValidName)
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

fun handleRequest(
    session: KeycloakSession,
    uriInfo: UriInfo,
    method: String,
    body: String?,
): Any {
    val ctx = userAuthzContext(session)
    ensureGlobalPermissions(ctx)
    val intent = parseIntent(uriInfo, method, body)
    val delayedActionsList =
        DelayedActionsList(
            mutableListOf(),
            mutableListOf(),
        )
    val result = executeAction(intent.first, intent.second, ctx, delayedActionsList, body)
    delayedActionsList.executeChanges(ctx.userModel)
    return result ?: ""
}

var cachedGraphQL: GraphQL? = null

class NoStacktraceException(
    message: String,
) : Throwable(message) {
    override fun getStackTrace(): Array<out StackTraceElement?>? = null

    override fun getLocalizedMessage(): String? = null
}

fun getGraphQL(): GraphQL {
    cachedGraphQL?.let { return it }

    val config =
        SchemaGeneratorConfig(
            supportedPackages = listOf("net.teuto.udh"),
            introspectionEnabled = true,
        )
    val generator = SchemaGenerator(config)
    val schema =
        generator.use { gen ->
            gen.generateSchema(
                queries = listOf(TopLevelObject(RootQuery())),
                mutations = listOf(TopLevelObject(RootMutation())),
            )
        }
    val engine =
        GraphQL
            .newGraphQL(schema)
            .defaultDataFetcherExceptionHandler { handlerParameters ->
                handlerParameters.exception.printStackTrace()
                val exception =
                    when (handlerParameters.exception) {
                        is NotFoundException -> NoStacktraceException("not found")

                        is BadRequestException -> NoStacktraceException("bad request")

                        is ForbiddenException -> NoStacktraceException("forbidden")

                        is NotAuthorizedException -> NoStacktraceException("unauthorized")

                        is ClientErrorException -> NoStacktraceException("conflict")

                        // currently only used for that purpose
                        else -> NoStacktraceException("unknown error") // fallback to avoid stacktraces in unhandled cases
                    }
                val error =
                    ExceptionWhileDataFetching(
                        handlerParameters.path,
                        NoStacktraceException(exception.message ?: "error"),
                        handlerParameters.sourceLocation,
                    )

                CompletableFuture.completedFuture(
                    DataFetcherExceptionHandlerResult.newResult().error(error).build(),
                )
            }.instrumentation(
                ChainedInstrumentation(
                    listOf(
                        // min values for introspection query to work
                        MaxQueryDepthInstrumentation(15),
                        MaxQueryComplexityInstrumentation(70),
                    ),
                ),
            ).build()
    cachedGraphQL = engine
    return engine
}

private fun userAuthzContext(session: KeycloakSession): AuthzContext {
    val authResult =
        AppAuthManager.BearerTokenAuthenticator(session).setAudience(DATA_HUB_CLIENT_ID).authenticate()
            ?: throw NotAuthorizedException("Bearer")
    val evaluationContext = DefaultEvaluationContext(UserModelIdentity(session.context.realm, authResult.user()), session)
    val ctx = getAuthzContext(session, evaluationContext, authResult.user())
    return ctx
}

data class OWMConfigResponse(
    val name: String?,
    val tenant: String?,
    val project: String?,
    val token: String?,
    val longitude: Double?,
    val latitude: Double?,
    val interval: Int?,
)

fun getAllOwmCollectors(session: KeycloakSession): List<OWMConfigResponse> {
    // USE CORRECT AUTH / CLIENT "owm-collector" only them that client through
    val authResult =
        AppAuthManager
            .BearerTokenAuthenticator(session)
            .setAudience(OWM_COLLECTOR_CLIENT_ID)
            .authenticate() ?: throw NotAuthorizedException("Bearer")

    val evaluationContext = DefaultEvaluationContext(UserModelIdentity(session.context.realm, authResult.user()), session)
    val ctx = getAuthzContext(session, evaluationContext, authResult.user())
    return lookupResources(ctx, OWM_COLLECTOR_TYPE, emptyMap()).map { resource ->
        val owm = resource.getResourceModel()
        val config = UdhOwmCollector.CollectorConfig.fromAttributes(resource.kcResource.attributes)
        OWMConfigResponse(
            name = owm.owmCollector,
            tenant = owm.tenant,
            project = owm.project,
            token = config.token,
            longitude = config.longitude,
            latitude = config.latitude,
            interval = config.interval,
        )
    }
}

const val FIRST_INACTIVE_EMAIL_SENT_TIME_ATTRIBUTE = "firstInactiveEmailSentTime"
const val SECOND_INACTIVE_EMAIL_SENT_TIME_ATTRIBUTE = "secondInactiveEmailSentTime"

class DatahubResource(
    private val session: KeycloakSession,
) {
    @GET
    @Path("{s:.*}")
    fun get(
        @Context uriInfo: UriInfo,
    ): Any = handleRequest(session, uriInfo, "GET", null)

    @POST
    @Path("graphql")
    fun graphql(body: String): Any {
        val ctx =
            AppAuthManager.BearerTokenAuthenticator(session).setAudience(DATA_HUB_CLIENT_ID).authenticate()?.let {
                val evaluationContext =
                    DefaultEvaluationContext(UserModelIdentity(session.context.realm, it.user()), session)
                getAuthzContext(session, evaluationContext, it.user())
            }
        val req = ObjectMapper().readValue(body, GraphQLRequest::class.java)
        val delayedActionsList =
            DelayedActionsList(
                mutableListOf(),
                mutableListOf(),
            )
        val graphQLContext = mutableMapOf<KClass<*>, Any>(KeycloakSession::class to session)
        if (ctx != null) {
            ensureGlobalPermissions(ctx)
            graphQLContext[AuthzContext::class] = ctx
            graphQLContext[DelayedActionsList::class] = delayedActionsList
        }
        val result =
            getGraphQL().execute(
                ExecutionInput
                    .newExecutionInput(req.query)
                    .variables(req.variables ?: mapOf())
                    .graphQLContext(graphQLContext),
            )
        if (result.errors.isEmpty()) {
            delayedActionsList.executeChanges(ctx?.userModel)
        } else {
            ctx?.entityManager?.transaction?.rollback()
        }
        return result
    }

    @GET
    @Path("graphiql")
    @Produces(MediaType.TEXT_HTML)
    fun graphiql(
        @Context uriInfo: UriInfo,
    ): Any {
        // all except the last part of the url
        val basePath = uriInfo.pathSegments.take(3).joinToString("/") { it.path }
        val graphiQL =
            DatahubResource::class.java.classLoader
                .getResourceAsStream("graphiql.html")
                ?.bufferedReader()
                ?.use { reader ->
                    reader
                        .readText()
                        .replace(
                            "\${graphQLEndpoint}",
                            "$basePath/graphql",
                        )
                } ?: throw IllegalStateException("Unable to load GraphiQL")
        return graphiQL
    }

    @GET
    @Path("owm-configs")
    @Produces(MediaType.APPLICATION_JSON)
    fun owmConfigs(
        @Context uriInfo: UriInfo,
    ): List<OWMConfigResponse> = getAllOwmCollectors(session)

    @POST
    @Path("{s:.*}")
    fun post(
        body: String,
        @Context uriInfo: UriInfo,
    ): Any = handleRequest(session, uriInfo, "POST", body)

    @PATCH
    @Path("{s:.*}")
    fun patch(
        body: String,
        @Context uriInfo: UriInfo,
    ): Any = handleRequest(session, uriInfo, "PATCH", body)

    @PUT
    @Path("{s:.*}")
    fun put(
        body: String,
        @Context uriInfo: UriInfo,
    ): Any = handleRequest(session, uriInfo, "PUT", body)

    @DELETE
    @Path("{s:.*}")
    fun delete(
        body: String,
        @Context uriInfo: UriInfo,
    ): Any = handleRequest(session, uriInfo, "DELETE", body)

    @POST
    @Path("_repair")
    fun repair(): Response = RequestSingleton.repair(session)

    @POST
    @Path("_handle_inactive_users")
    fun handleInactiveUsers(): Response = RequestSingleton.handleInactiveUsers(session)

    @PUT
    // seems like the keycloak api has no built in way of doing this
    @Path("_update_user_attributes/{userId}")
    fun updateUserAttributes(userId: String, body: String): Response {
        val ctx = userAuthzContext(session)
        if (!ctx.evaluationContext.identity.hasClientRole(
                Constants.REALM_MANAGEMENT_CLIENT_ID,
                "manage-realm",
            )
        ) {
            throw ForbiddenException()
        }

        val attributes = decodeJson<Map<String, String?>>(body)

        val user = session.users().getUserById(ctx.realm, userId) ?: throw NotFoundException()

        attributes.forEach { (key, value) ->
            if (value == null) {
                user.removeAttribute(key)
            } else {
                user.setSingleAttribute(key, value)
            }
        }

        return Response.noContent().build()
    }

    @GET
    // seems like the keycloak api had a way of doing this, but it broke
    @Path("_get_user_attributes/{userId}")
    fun getUserAttributes(userId: String): Map<String, List<String>> {
        val ctx = userAuthzContext(session)
        if (!ctx.evaluationContext.identity.hasClientRole(
                Constants.REALM_MANAGEMENT_CLIENT_ID,
                "manage-realm",
            )
        ) {
            throw ForbiddenException()
        }

        val user = session.users().getUserById(ctx.realm, userId) ?: throw NotFoundException()

        return user.attributes
    }
}

object RequestSingleton {
    @Synchronized
    fun repair(session: KeycloakSession): Response {
        // TODO actually repair stuff

        val ctx = userAuthzContext(session)
        if (!ctx.evaluationContext.identity.hasClientRole(
                Constants.REALM_MANAGEMENT_CLIENT_ID,
                "manage-realm",
            )
        ) {
            throw ForbiddenException()
        }

        ensureGlobalPermissions(ctx)

        val delayedActionsList = DelayedActionsList(ArrayList(), ArrayList())

        // repair buckets
        lookupResources(ctx, PROJECT_TYPE, emptyMap()).forEach {
            val model = it.getResourceModel()
            if (model.hasBucket()) {
                createBucket(model)
            }
        }

        LOGGER.info("Ensuring tenant externalities are completed")
        lookupResources(ctx, TENANT_TYPE, emptyMap())
            .forEach {
                it.getResourceModel().postCreate(ctx, delayedActionsList, it, null)
            }

        delayedActionsList.executeChanges(ctx.userModel)

        syncAllGrafana(session, ctx)

        return Response.noContent().build()
    }

    val DATA_HUB_BASEURL = System.getenv("DATA_HUB_BASEURL")
    val FIRST_INACTIVITY_REMINDER_TIMESPAN = { now: OffsetDateTime -> now.minusYears(1) }
    val SECOND_INACTIVITY_REMINDER_TIMESPAN = { now: OffsetDateTime -> now.minusDays(21) }
    val INACTIVITY_DELETION_TIMESPAN = { now: OffsetDateTime -> now.minusDays(7) }

    @Synchronized
    fun handleInactiveUsers(session: KeycloakSession): Response {
        val ctx = userAuthzContext(session)
        if (!ctx.evaluationContext.identity.hasClientRole(
                Constants.REALM_MANAGEMENT_CLIENT_ID,
                "manage-realm",
            )
        ) {
            throw ForbiddenException()
        }

        fun getTimeAttribute(
            user: UserModel,
            attributeName: String,
        ): OffsetDateTime? =
            user.getFirstAttribute(attributeName)?.let {
                try {
                    OffsetDateTime.parse(it, DateTimeFormatter.ISO_DATE_TIME)
                } catch (e: DateTimeParseException) {
                    LOGGER.warn("could not parse '$it' for ${user.id}", e)
                    null
                }
            }

        fun setTimeAttribute(
            user: UserModel,
            attributeName: String,
            dateTime: OffsetDateTime,
        ) {
            user.setSingleAttribute(
                attributeName,
                dateTime.format(DateTimeFormatter.ISO_DATE_TIME),
            )
        }

        val emailTemplateProvider =
            session
                .getProvider(EmailTemplateProvider::class.java)
                .setRealm(session.context.realm)
        val firstInactiveReminderTime = FIRST_INACTIVITY_REMINDER_TIMESPAN(OffsetDateTime.now())
        val secondInactiveReminderTime = SECOND_INACTIVITY_REMINDER_TIMESPAN(OffsetDateTime.now())
        val userDeleteTime = INACTIVITY_DELETION_TIMESPAN(OffsetDateTime.now())

        fun sendInactivityReminderEmail(
            user: UserModel,
            deletionInDays: Int,
        ) {
            if (user.email != null) {
                LOGGER.info("sending inactivity warning to ${user.username} (${user.id})")
                emailTemplateProvider
                    .setUser(user)
                    .send(
                        "inactivityWarningSubject",
                        "inactivity-warning.ftl",
                        mutableMapOf<String, Any>(
                            "dataHubUrl" to DATA_HUB_BASEURL,
                            "deletionInDays" to deletionInDays,
                        ),
                    )
            } else {
                LOGGER.warn("could not send email to ${user.id} because they have no email!")
            }
        }

        session.users().searchForUserStream(ctx.realm, emptyMap()).forEach {
            if (it.serviceAccountClientLink != null) {
                return@forEach
            }
            val lastLoginTime = getTimeAttribute(it, LAST_LOGIN_TIME_ATTRIBUTE)
            if (lastLoginTime == null) {
                setTimeAttribute(it, LAST_LOGIN_TIME_ATTRIBUTE, OffsetDateTime.now())
                return@forEach
            }
            val firstInactiveEmailSentTime = getTimeAttribute(it, FIRST_INACTIVE_EMAIL_SENT_TIME_ATTRIBUTE)
            // if the user logs in after the inactivity mail has been sent, we remove the
            // attribute to send the email again after 1 year
            if (firstInactiveEmailSentTime != null && firstInactiveEmailSentTime < lastLoginTime) {
                it.removeAttribute(FIRST_INACTIVE_EMAIL_SENT_TIME_ATTRIBUTE)
                it.removeAttribute(SECOND_INACTIVE_EMAIL_SENT_TIME_ATTRIBUTE)
                return@forEach
            }

            if (lastLoginTime < firstInactiveReminderTime) {
                if (firstInactiveEmailSentTime == null) {
                    // send first inactivityWarning mail
                    sendInactivityReminderEmail(it, 28)
                    setTimeAttribute(it, FIRST_INACTIVE_EMAIL_SENT_TIME_ATTRIBUTE, OffsetDateTime.now())
                    return@forEach
                } else if (firstInactiveEmailSentTime < secondInactiveReminderTime) {
                    val secondInactiveEmailSentTime = getTimeAttribute(it, SECOND_INACTIVE_EMAIL_SENT_TIME_ATTRIBUTE)
                    if (secondInactiveEmailSentTime == null) {
                        // send second inactivityWarning mail
                        sendInactivityReminderEmail(it, 7)
                        setTimeAttribute(it, SECOND_INACTIVE_EMAIL_SENT_TIME_ATTRIBUTE, OffsetDateTime.now())
                        return@forEach
                    } else if (secondInactiveEmailSentTime < userDeleteTime) {
                        LOGGER.info("deleting ${it.username} (${it.id})")

                        if (it.email != null) {
                            emailTemplateProvider
                                .setUser(it)
                                .send("deletionNotificationSubject", "deletion-notification.ftl", mutableMapOf())
                        } else {
                            LOGGER.warn("could not send email to ${it.id} because they have no email!")
                        }
                        session.users().removeUser(ctx.realm, it)
                    }
                }
            }
        }
        return Response.noContent().build()
    }
}

class DatahubResourceProvider(
    private val session: KeycloakSession,
) : RealmResourceProvider {
    override fun getResource(): Any = DatahubResource(session)

    override fun close() {
    }
}

fun <T : UdhResourceModel> lookupResources(
    ctx: AuthzContext,
    resourceType: ResourceType<T>,
    names: Map<String, String>,
): List<UdhResource<T>> =
    ctx.resourceStore
        .find(
            ctx.resourceServer,
            mapOf(Resource.FilterOption.TYPE to arrayOf(resourceType.resourceTypeName)),
            null,
            null,
        ).filter { res -> res.type == resourceType.resourceTypeName && names.all { res.attributes[it.key]?.firstOrNull() == it.value } }
        .map {
            UdhResource(ResourcePath.fromResource(it), it, resourceType)
        }

fun <T : UdhResourceModel> getResourcesForUser(
    ctx: AuthzContext,
    resourceType: ResourceType<T>,
    names: Map<String, String>,
    scopes: List<String>,
): List<UdhResource<T>> =
    lookupResources(ctx, resourceType, names).filter {
        hasPermissionScopes(
            it.kcResource,
            scopes,
            ctx,
            ctx.evaluationContext,
        )
    }

fun <T : UdhResourceModel> getResourcesForIdentity(
    ctx: AuthzContext,
    identity: Identity,
    resourceType: ResourceType<T>,
    scopes: List<String>,
    names: Map<String, String>,
): List<UdhResource<T>> {
    val evaluationContext =
        DefaultEvaluationContext(
            identity,
            ctx.session,
        )
    // gather all permissions of this resource
    return lookupResources(ctx, resourceType, names).filter {
        hasPermissionScopes(
            it.kcResource,
            scopes,
            ctx,
            evaluationContext,
        )
    }
}

fun getPrincipalsForResource(
    ctx: AuthzContext,
    resource: UdhResource<*>,
    scope: String,
): Set<UdhPrincipal> {
    val fullScope =
        if (scope.contains(":")) {
            scope
        } else {
            "${resource.resourceType.resourceTypeName}:$scope"
        }
    val isRead = isReadAccessScope(fullScope)
    val principals =
        ctx.policyStore
            .findByResource(ctx.resourceServer, resource.kcResource)
            .flatMap { policy ->
                // check scopes
                val policyScopes = policy.scopes.map { it.name }
                // make into principal
                if (policyScopes.any { it.endsWith(":${ADMIN_SCOPE}") || (isRead && it.endsWith(":${READ_SCOPE}")) || it == fullScope }) {
                    permissionToPrincipals(policy, ctx)
                } else {
                    listOf()
                }
            }.toMutableSet()
    resource.parent(ctx)?.let { parent -> principals.addAll(getPrincipalsForResource(ctx, parent, fullScope)) }
    return principals
}

fun getFlatProjects(
    ctx: AuthzContext,
    tenant: String?,
    scopes: List<String>,
): List<String> {
    val names =
        if (tenant == null) {
            mapOf()
        } else {
            mapOf("tenant" to tenant)
        }
    return getResourcesForUser(ctx, PROJECT_TYPE, names, scopes).map {
        it.getResourceModel().flatName
    }
}

fun udhTokenMapperSetClaim(
    token: IDToken,
    mappingModel: ProtocolMapperModel,
    userSession: UserSessionModel,
    session: KeycloakSession,
    clientSessionCtx: ClientSessionContext,
) {
    val evaluationContext =
        DefaultEvaluationContext(UserModelIdentity(session.context.realm, userSession.user), session)
    val ctx = getAuthzContext(session, evaluationContext, null)
    when (clientSessionCtx.clientSession.client.clientId) {
        "grafana" -> {
            setClaimGrafana(ctx, token, userSession.user)
        }

        "usercode" -> {
            val clientScopes =
                clientSessionCtx.clientScopesStream
                    .map { it.name }
                    .filter { it != null }
                    .toList()
            setClaimUsercode(ctx, token, clientScopes)
        }

        "mdb" -> {
            setClaimMdb(ctx, token)
        }

        "mdb-frontend", "auto-provisioning" -> {
            setClaimMdb(ctx, token)
            if (clientSessionCtx.clientScopesStream.anyMatch { it.name == "buckets" }) {
                setClaimBuckets(ctx, token)
            }
        }
    }
}

fun setClaimMdb(
    ctx: AuthzContext,
    token: IDToken,
) {
    val projectClaim = getFlatProjects(ctx, null, listOf("sensor-metadata-write"))
    token.setOtherClaims("projects", projectClaim)
}

fun setClaimPrometheusRead(
    ctx: AuthzContext,
    token: IDToken,
) {
    val prometheusReadClaim =
        getFlatProjects(ctx, null, listOf("prometheus-read")).sorted().distinct().joinToString("|")
    token.setOtherClaims("groups", prometheusReadClaim)
}

fun setClaimUsercode(
    ctx: AuthzContext,
    token: IDToken,
    scopes: Collection<String>,
) {
    if (scopes.contains("prometheus_read")) {
        setClaimPrometheusRead(ctx, token)
    }
    if (scopes.contains("buckets")) {
        setClaimBuckets(ctx, token)
    }
}
