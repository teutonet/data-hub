package net.teuto.udh.schema

import com.expediagroup.graphql.generator.annotations.GraphQLIgnore
import com.expediagroup.graphql.generator.annotations.GraphQLName
import com.expediagroup.graphql.server.extensions.getFromContext
import com.expediagroup.graphql.server.operations.Query
import graphql.schema.DataFetchingEnvironment
import kotlinx.serialization.Serializable
import net.teuto.udh.*
import org.keycloak.authorization.attribute.Attributes
import org.keycloak.authorization.common.DefaultEvaluationContext
import org.keycloak.authorization.fgap.AdminPermissionsSchema
import org.keycloak.authorization.model.Policy
import org.keycloak.models.KeycloakSession
import org.keycloak.models.utils.ModelToRepresentation
import org.keycloak.representations.idm.authorization.GroupPolicyRepresentation
import org.keycloak.representations.idm.authorization.UserPolicyRepresentation
import java.util.stream.Collectors

sealed interface GraphqlPrincipal

sealed interface KeycloakGroup

@GraphQLName("User")
data class UserQuery(
    val userId: String,
) // might be extended in the future

sealed interface HasAttributes {
    @GraphQLIgnore
    fun getUdhResource(ctx: AuthzContext): UdhResource<*>

    fun attributes(dfe: DataFetchingEnvironment): List<Attribute> {
        val ctx = dfe.getAuthzContextOrThrow()
        return getUdhResource(ctx)
            .customAttributes()
            .map { Attribute(it) }
    }

    fun attribute(
        attribute: String,
        dfe: DataFetchingEnvironment,
    ): String? {
        val ctx = dfe.getAuthzContextOrThrow()
        return getUdhResource(ctx).customAttribute(attribute)
    }

    fun name(dfe: DataFetchingEnvironment): String? = attribute("name", dfe)

    fun scopes(dfe: DataFetchingEnvironment): Scopes {
        val ctx = dfe.getAuthzContextOrThrow()
        val targetGenResource = getUdhResource(ctx)
        val allScopes = targetGenResource.resourceType.getPrefixedScopes()
        val granted =
            allScopes.filter {
                hasPermissionScopes(
                    targetGenResource.kcResource,
                    listOf(it),
                    ctx,
                    ctx.evaluationContext,
                )
            }
        return Scopes(
            allScopes,
            granted,
        )
    }

    fun hasScopes(
        scopes: List<String>,
        dfe: DataFetchingEnvironment,
    ): Boolean {
        val ctx = dfe.getAuthzContextOrThrow()
        val targetGenResource = getUdhResource(ctx)
        return hasPermissionScopes(targetGenResource.kcResource, scopes, ctx, ctx.evaluationContext)
    }

    fun permissions(dfe: DataFetchingEnvironment): List<GraphqlPermission>? {
        val ctx = dfe.getAuthzContextOrThrow()
        val res = getUdhResource(ctx).kcResource
        if (!hasPermissionScopes(res, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
            return null
        }
        return ctx.policyStore
            .findByResource(ctx.resourceServer, res)
            .map { graphqlPermissionToRep(it, ctx) }
            .sortedBy { it.name }
    }
}

data class Scopes(
    val all: List<String>,
    val granted: List<String>,
)

@GraphQLName("Permission")
data class GraphqlPermission(
    val name: String,
    val scopes: List<String>,
    val tenantPrincipals: List<TenantQuery>?,
    val groupPrincipals: List<GroupQuery>?,
    val projectPrincipals: List<ProjectQuery>?,
    val vizGroupPrincipals: List<VizGroupQuery>?,
    val userPrincipals: List<UserQuery>?,
)

fun graphqlPermissionToRep(
    permission: Policy,
    ctx: AuthzContext,
): GraphqlPermission {
    val scopes = permission.scopes.map { it.name }

    val tenantPrincipals = mutableListOf<TenantQuery>()
    val groupPrincipals = mutableListOf<GroupQuery>()
    val projectPrincipals = mutableListOf<ProjectQuery>()
    val vizGroupPrincipals = mutableListOf<VizGroupQuery>()
    val userPrincipals = mutableListOf<UserQuery>()

    permission.associatedPolicies.forEach { policy ->
        when (policy.type) {
            "group" -> {
                ModelToRepresentation
                    .toRepresentation<GroupPolicyRepresentation>(
                        policy,
                        ctx.authProvider,
                        false,
                        false,
                    ).groups
                    .forEach {
                        val group = ctx.realm.getGroupById(it.id)
                        if (group.parentId == null) {
                            tenantPrincipals.add(TenantQuery(group.name))
                        } else {
                            groupPrincipals.add(GroupQuery(group.parent.name, group.name))
                        }
                    }
            }

            "user" -> {
                ModelToRepresentation
                    .toRepresentation<UserPolicyRepresentation>(
                        policy,
                        ctx.authProvider,
                        false,
                        false,
                    ).users
                    .forEach {
                        userPrincipals.add(UserQuery(it))
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
                when (resource.type) {
                    "viz-group" -> {
                        val res = UdhVizGroup.fromAttributes(resource.attributes)
                        vizGroupPrincipals.add(VizGroupQuery(res.tenant, res.vizGroup))
                    }

                    "project" -> {
                        val res = UdhProject.fromAttributes(resource.attributes)
                        projectPrincipals.add(ProjectQuery(res.tenant, res.project))
                    }
                }
            }

            else -> {
                LOGGER.error("unknown policy type: ${policy.type}")
            }
        }
    }
    return GraphqlPermission(
        scopes = scopes,
        name = permission.description,
        tenantPrincipals = tenantPrincipals,
        groupPrincipals = groupPrincipals,
        projectPrincipals = projectPrincipals,
        userPrincipals = userPrincipals,
        vizGroupPrincipals = vizGroupPrincipals,
    )
}

fun checkViewAccess(
    path: ResourcePath,
    dfe: DataFetchingEnvironment,
): Boolean {
    if (!NAME_REGEX.matches(path.path.last().second)) {
        return false
    }
    val ctx = dfe.getAuthzContextOrThrow()
    val res = path.getResource(ctx) ?: return false
    return hasPermissionScopes(res, listOf(VIEW_SCOPE), ctx, ctx.evaluationContext)
}

fun <T : UdhResourceModel> getViewableResourceList(
    resourceType: ResourceType<T>,
    dfe: DataFetchingEnvironment,
    names: Map<String, String> = mapOf(),
): List<T> {
    val ctx = dfe.getAuthzContextOrThrow()
    return lookupResources(ctx, resourceType, names)
        .filter {
            hasPermissionScopes(
                it.kcResource,
                listOf(VIEW_SCOPE),
                ctx,
                ctx.evaluationContext,
            )
        }.map { it.getResourceModel() }
}

class RootQuery :
    Query,
    HasAttributes {
    @GraphQLIgnore
    override fun getUdhResource(ctx: AuthzContext): UdhResource<*> = rootResource(ctx)

    fun tenant(
        tenant: String,
        dfe: DataFetchingEnvironment,
    ): TenantQuery? =
        if (checkViewAccess(UdhTenant(tenant).path, dfe)) {
            TenantQuery(tenant)
        } else {
            null
        }

    fun tenants(dfe: DataFetchingEnvironment): List<TenantQuery> =
        getViewableResourceList(TENANT_TYPE, dfe)
            .sortedBy { it.tenant }
            .map { TenantQuery(it.tenant) }

    fun publicAttributes(
        tenant: String,
        dfe: DataFetchingEnvironment,
    ): List<Attribute> {
        if (!NAME_REGEX.matches(tenant)) {
            return listOf()
        }
        val session = dfe.getFromContext<KeycloakSession>()!!
        val evaluationContext = DefaultEvaluationContext(AttributeIdentity(Attributes.from(mapOf())), session)
        val ctx = getAuthzContext(session, evaluationContext, null)
        return UdhTenant(tenant)
            .path
            .getUdhResource(ctx)
            ?.customAttributes()
            ?.map { Attribute(it) } ?: return listOf()
    }

    fun project(
        tenant: String,
        project: String,
        dfe: DataFetchingEnvironment,
    ): ProjectQuery? =
        if (checkViewAccess(UdhProject(tenant, project).path, dfe)) {
            ProjectQuery(tenant, project)
        } else {
            null
        }

    fun owmCollector(
        tenant: String,
        project: String,
        owmCollector: String,
        dfe: DataFetchingEnvironment,
    ): OwmCollectorQuery? {
        val ctx = dfe.getAuthzContextOrThrow()

        val res = UdhOwmCollector(tenant, project, owmCollector).path.getResource(ctx) ?: return null

        if (!hasPermissionScopes(res, listOf(VIEW_SCOPE), ctx, ctx.evaluationContext)) {
            return null
        }
        val config =
            UdhOwmCollector.CollectorConfig
                .fromAttributes(res.attributes)
        return OwmCollectorQuery(
            tenant = tenant,
            project = project,
            collectorName = owmCollector,
            latitude = config.latitude,
            longitude = config.longitude,
            interval = config.interval,
        )
    }

    fun vizGroup(
        tenant: String,
        vizGroup: String,
        dfe: DataFetchingEnvironment,
    ): VizGroupQuery? =
        if (checkViewAccess(UdhVizGroup(tenant, vizGroup).path, dfe)) {
            VizGroupQuery(tenant, vizGroup)
        } else {
            null
        }

    fun group(
        tenant: String,
        group: String,
        dfe: DataFetchingEnvironment,
    ): GroupQuery? =
        if (checkViewAccess(UdhGroup(tenant, group).path, dfe)) {
            GroupQuery(tenant, group)
        } else {
            null
        }

    fun sensorCredential(
        tenant: String,
        project: String,
        sensorCredential: String,
        dfe: DataFetchingEnvironment,
    ): SensorCredentialQuery? =
        if (checkViewAccess(UdhSensorCredential(tenant, project, sensorCredential).path, dfe)) {
            SensorCredentialQuery(tenant, project, sensorCredential)
        } else {
            null
        }

    fun keycloakGroupMemberships(dfe: DataFetchingEnvironment): List<KeycloakGroup> {
        val ctx = dfe.getAuthzContextOrThrow()
        val user = ctx.userModel ?: return listOf()
        return user.groupsStream
            .map {
                val groupName = it.name
                val parentName = it.parent?.name
                if (parentName == null) {
                    TenantQuery(groupName)
                } else {
                    GroupQuery(parentName, groupName)
                }
            }.collect(Collectors.toList<KeycloakGroup>())
    }
}

data class Attribute(
    val key: String,
    val value: String,
) {
    constructor(entry: Map.Entry<String, String>) : this(entry.key, entry.value)
}

@Serializable
@GraphQLName("Tenant")
open class TenantQuery(
    val tenant: String,
) : HasAttributes,
    GraphqlPrincipal,
    KeycloakGroup {
    @GraphQLIgnore
    override fun getUdhResource(ctx: AuthzContext): UdhResource<*> = UdhTenant(tenant).path.getUdhResource(ctx)!!

    fun projects(dfe: DataFetchingEnvironment): List<ProjectQuery> =
        getViewableResourceList(PROJECT_TYPE, dfe, mapOf("tenant" to tenant))
            .sortedBy { it.project }
            .map {
                ProjectQuery(it.tenant, it.project)
            }

    fun vizGroups(dfe: DataFetchingEnvironment): List<VizGroupQuery> =
        getViewableResourceList(VIZ_GROUP_TYPE, dfe, mapOf("tenant" to tenant))
            .sortedBy { it.vizGroup }
            .map {
                VizGroupQuery(it.tenant, it.vizGroup)
            }

    fun groups(dfe: DataFetchingEnvironment): List<GroupQuery> =
        getViewableResourceList(GROUP_TYPE, dfe, mapOf("tenant" to tenant))
            .sortedBy { it.group }
            .map {
                GroupQuery(it.tenant, it.group)
            }
}

@Serializable
@GraphQLName("Project")
open class ProjectQuery(
    val tenant: String,
    val project: String,
) : HasAttributes,
    GraphqlPrincipal {
    @GraphQLIgnore
    override fun getUdhResource(ctx: AuthzContext): UdhResource<*> = UdhProject(tenant, project).path.getUdhResource(ctx)!!

    fun sensorCredentials(dfe: DataFetchingEnvironment): List<SensorCredentialQuery> =
        getViewableResourceList(SENSOR_CREDENTIAL_TYPE, dfe, mapOf("tenant" to tenant, "project" to project))
            .sortedBy { it.sensorCredential }
            .map {
                SensorCredentialQuery(it.tenant, it.project, it.sensorCredential)
            }

    fun flatName(): String = UdhProject(tenant, project).flatName

    fun owmCollectors(dfe: DataFetchingEnvironment): List<OwmCollectorQuery> {
        val ctx = dfe.getAuthzContextOrThrow()

        if (!checkViewAccess(UdhProject(tenant, project).path, dfe)) {
            return emptyList()
        }

        return lookupResources(ctx, OWM_COLLECTOR_TYPE, mapOf("tenant" to tenant, "project" to project))
            .filter { hasPermissionScopes(it.kcResource, listOf(VIEW_SCOPE), ctx, ctx.evaluationContext) }
            .map { resource ->
                val owm = resource.getResourceModel()

                val config =
                    UdhOwmCollector.CollectorConfig
                        .fromAttributes(resource.kcResource.attributes)

                OwmCollectorQuery(
                    tenant = owm.tenant,
                    project = owm.project,
                    collectorName = owm.owmCollector,
                    latitude = config.latitude,
                    longitude = config.longitude,
                    interval = config.interval,
                )
            }.sortedBy { it.collectorName }
    }
}

@Serializable
@GraphQLName("SensorCredential")
open class SensorCredentialQuery(
    val tenant: String,
    val project: String,
    val sensorCredential: String,
) : HasAttributes,
    GraphqlPrincipal {
    @GraphQLIgnore
    override fun getUdhResource(ctx: AuthzContext): UdhResource<*> =
        UdhSensorCredential(tenant, project, sensorCredential).path.getUdhResource(ctx)!!

    fun username(dfe: DataFetchingEnvironment): String {
        val ctx = dfe.getAuthzContextOrThrow()
        val cred = UdhSensorCredential(tenant, project, sensorCredential)
        return cred.getServiceAccountClient(ctx.session)!!.clientId
    }

    fun lastUsedAt(dfe: DataFetchingEnvironment): String? {
        val ctx = dfe.getAuthzContextOrThrow()
        val cred = UdhSensorCredential(tenant, project, sensorCredential)
        return cred.getServiceAccountClient(ctx.session)?.getAttribute(UdhSensorCredential.CLIENT_LAST_USED_AT_ATTRIBUTE)
    }
}

@Serializable
@GraphQLName("Group")
open class GroupQuery(
    val tenant: String,
    val group: String,
) : HasAttributes,
    GraphqlPrincipal,
    KeycloakGroup {
    @GraphQLIgnore
    override fun getUdhResource(ctx: AuthzContext): UdhResource<*> = UdhGroup(tenant, group).path.getUdhResource(ctx)!!
}

@Serializable
@GraphQLName("VizGroup")
open class VizGroupQuery(
    val tenant: String,
    val vizGroup: String,
) : HasAttributes,
    GraphqlPrincipal {
    @GraphQLIgnore
    override fun getUdhResource(ctx: AuthzContext): UdhResource<*> = UdhVizGroup(tenant, vizGroup).path.getUdhResource(ctx)!!
}

@Serializable
@GraphQLName("OwmCollector")
data class OwmCollectorQuery(
    val tenant: String,
    val project: String,
    val collectorName: String,
    val latitude: Double,
    val longitude: Double,
    val interval: Int,
)
