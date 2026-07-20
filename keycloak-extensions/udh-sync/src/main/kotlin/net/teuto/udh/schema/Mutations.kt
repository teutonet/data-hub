package net.teuto.udh.schema

import com.expediagroup.graphql.server.extensions.getFromContext
import com.expediagroup.graphql.server.operations.Mutation
import graphql.schema.DataFetchingEnvironment
import jakarta.ws.rs.BadRequestException
import jakarta.ws.rs.ForbiddenException
import jakarta.ws.rs.NotFoundException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import net.teuto.udh.*
import org.keycloak.representations.idm.authorization.DecisionStrategy
import org.keycloak.representations.idm.authorization.ScopePermissionRepresentation

@Serializable
data class AttributePatch(
    val key: String,
    val value: String?,
)

sealed interface CommonMutation : HasAttributes {
    fun patchAttributes(
        attributes: List<AttributePatch>,
        dfe: DataFetchingEnvironment,
    ): List<Attribute> {
        val ctx = dfe.getAuthzContextOrThrow()
        val targetGenResource = getUdhResource(ctx)
        if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
            throw ForbiddenException()
        }
        attributes.forEach { (name, value) ->
            if (value == null) {
                targetGenResource.kcResource.removeAttribute("${ATTR_PREFIX}$name")
            } else {
                targetGenResource.kcResource.setAttribute(
                    "${ATTR_PREFIX}$name",
                    listOf(validateAttributeValue(value)),
                )
            }
        }
        return attributes(dfe)
    }

    fun createPermission(
        permission: GraphqlPermission,
        dfe: DataFetchingEnvironment,
    ): String {
        val ctx = dfe.getAuthzContextOrThrow()
        val targetGenResource = getUdhResource(ctx)
        if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
            throw ForbiddenException()
        }
        val validScopes = targetGenResource.resourceType.getPrefixedScopes().toSet()
        if (permission.scopes.any { !validScopes.contains(it) }) {
            throw BadRequestException()
        }
        val resolvedScopes = permission.scopes.map { createScope(it, ctx).id }
        val policyIds =
            permission.tenantPrincipals.orEmpty().map {
                ensureTenantPolicy(UdhTenant(it.tenant), ctx)
            } +
                permission.groupPrincipals.orEmpty().map {
                    ensureGroupPolicy(UdhGroup(it.tenant, it.group), ctx)
                } +
                permission.projectPrincipals.orEmpty().map {
                    ensureResourcePolicy(UdhProject(it.tenant, it.project).path, ctx)
                } +
                permission.vizGroupPrincipals.orEmpty().map {
                    ensureResourcePolicy(UdhVizGroup(it.tenant, it.vizGroup).path, ctx)
                } +
                permission.userPrincipals.orEmpty().map {
                    ensureUserPolicy(it.userId, ctx)
                }
        lookupPermission(targetGenResource.kcResource, permission.name, ctx)?.let {
            ctx.policyStore.delete(it.id)
            // without flushing, re-creating with same name in same transaction fails
            ctx.entityManager.flush()
        }
        val policy = ScopePermissionRepresentation()
        policy.name = targetGenResource.path.plus("permission", permission.name).toHash()
        policy.addResource(targetGenResource.kcResource.id)
        policy.scopes = resolvedScopes.toSet()
        policy.policies = policyIds.toSet()
        policy.decisionStrategy = DecisionStrategy.AFFIRMATIVE
        policy.description = permission.name
        createPolicy(policy, ctx.policyStore, ctx.resourceServer)
        return permission.name
    }

    fun deletePermission(
        permission: String,
        dfe: DataFetchingEnvironment,
    ): String {
        val ctx = dfe.getAuthzContextOrThrow()
        val targetGenResource = getUdhResource(ctx)
        if (!hasPermissionScopes(targetGenResource.kcResource, listOf(ADMIN_SCOPE), ctx, ctx.evaluationContext)) {
            throw ForbiddenException()
        }
        val permissionObj =
            lookupPermission(targetGenResource.kcResource, permission, ctx) ?: throw NotFoundException()
        ctx.policyStore.delete(permissionObj.id)

        return permission
    }
}

fun createResourceByPath(
    resourcePath: ResourcePath,
    dfe: DataFetchingEnvironment,
): Any? {
    ensureValidName(resourcePath.path.last().second)
    val ctx = dfe.getAuthzContextOrThrow()
    val delayedActionsList = dfe.getFromContext<DelayedActionsList>()!!
    return executeAction(
        resourcePath.parent()!!,
        Action.Create(resourcePath.path.last().first, resourcePath.path.last().second),
        ctx,
        delayedActionsList,
        null,
    )
}

fun deleteResourceByPath(
    resourcePath: ResourcePath,
    dfe: DataFetchingEnvironment,
) {
    val ctx = dfe.getAuthzContextOrThrow()
    val delayedActionsList = dfe.getFromContext<DelayedActionsList>()!!
    executeAction(
        resourcePath.parent()!!,
        Action.Delete(resourcePath.path.last().first, resourcePath.path.last().second),
        ctx,
        delayedActionsList,
        null,
    )
}

class RootMutation : Mutation {
    fun createTenant(
        tenant: String,
        dfe: DataFetchingEnvironment,
    ): TenantMutation {
        createResourceByPath(UdhTenant(tenant).path, dfe)
        return TenantMutation(tenant)
    }

    fun tenant(
        tenant: String,
        dfe: DataFetchingEnvironment,
    ): TenantMutation =
        if (checkViewAccess(UdhTenant(tenant).path, dfe)) {
            TenantMutation(tenant)
        } else {
            throw NotFoundException()
        }

    fun deleteTenant(
        tenant: String,
        dfe: DataFetchingEnvironment,
    ): String {
        deleteResourceByPath(UdhTenant(tenant).path, dfe)
        return tenant
    }
}

class TenantMutation(
    tenant: String,
) : TenantQuery(tenant),
    CommonMutation {
    fun createProject(
        project: String,
        dfe: DataFetchingEnvironment,
    ): ProjectMutation {
        createResourceByPath(UdhProject(tenant, project).path, dfe)
        return ProjectMutation(tenant, project)
    }

    fun project(
        project: String,
        dfe: DataFetchingEnvironment,
    ): ProjectMutation =
        if (checkViewAccess(UdhProject(tenant, project).path, dfe)) {
            ProjectMutation(tenant, project)
        } else {
            throw NotFoundException()
        }

    fun deleteProject(
        project: String,
        dfe: DataFetchingEnvironment,
    ): String {
        deleteResourceByPath(UdhProject(tenant, project).path, dfe)
        return project
    }

    fun createGroup(
        group: String,
        dfe: DataFetchingEnvironment,
    ): GroupMutation {
        createResourceByPath(UdhGroup(tenant, group).path, dfe)
        return GroupMutation(tenant, group)
    }

    fun group(
        group: String,
        dfe: DataFetchingEnvironment,
    ): GroupMutation =
        if (checkViewAccess(UdhGroup(tenant, group).path, dfe)) {
            GroupMutation(tenant, group)
        } else {
            throw NotFoundException()
        }

    fun deleteGroup(
        group: String,
        dfe: DataFetchingEnvironment,
    ): String {
        deleteResourceByPath(UdhGroup(tenant, group).path, dfe)
        return group
    }

    fun createVizGroup(
        vizGroup: String,
        dfe: DataFetchingEnvironment,
    ): VizGroupMutation {
        createResourceByPath(UdhVizGroup(tenant, vizGroup).path, dfe)
        return VizGroupMutation(tenant, vizGroup)
    }

    fun vizGroup(
        vizGroup: String,
        dfe: DataFetchingEnvironment,
    ): VizGroupMutation =
        if (checkViewAccess(UdhVizGroup(tenant, vizGroup).path, dfe)) {
            VizGroupMutation(tenant, vizGroup)
        } else {
            throw NotFoundException()
        }

    fun deleteVizGroup(
        vizGroup: String,
        dfe: DataFetchingEnvironment,
    ): String {
        deleteResourceByPath(UdhVizGroup(tenant, vizGroup).path, dfe)
        return vizGroup
    }
}

data class SensorCredentialResult(
    val username: String,
    val password: String,
)

class ProjectMutation(
    tenant: String,
    project: String,
) : ProjectQuery(tenant, project),
    CommonMutation {
    fun createSensorCredential(
        sensorCredential: String,
        dfe: DataFetchingEnvironment,
    ): SensorCredentialResult {
        val result = createResourceByPath(UdhSensorCredential(tenant, project, sensorCredential).path, dfe) as Map<*, *>
        val username = result["username"] as String
        val password = result["password"] as String

        return SensorCredentialResult(username, password)
    }

    fun rotateSensorCredential(
        sensorCredential: String,
        dfe: DataFetchingEnvironment,
    ): SensorCredentialResult {
        val ctx = dfe.getAuthzContextOrThrow()
        val delayedActionsList = dfe.getFromContext<DelayedActionsList>()!!
        val result =
            executeAction(
                UdhSensorCredential(tenant, project, sensorCredential).path,
                Action.CustomAction("rotate"),
                ctx,
                delayedActionsList,
                null,
            ) as Map<*, *>
        val username = result["username"] as String
        val password = result["password"] as String

        return SensorCredentialResult(username, password)
    }

    fun sensorCredential(
        sensorCredential: String,
        dfe: DataFetchingEnvironment,
    ): SensorCredentialMutation =
        if (checkViewAccess(UdhSensorCredential(tenant, project, sensorCredential).path, dfe)) {
            SensorCredentialMutation(tenant, project, sensorCredential)
        } else {
            throw NotFoundException()
        }

    fun deleteSensorCredential(
        sensorCredential: String,
        dfe: DataFetchingEnvironment,
    ): String {
        deleteResourceByPath(UdhSensorCredential(tenant, project, sensorCredential).path, dfe)

        return sensorCredential
    }

    fun createOwmCollector(
        collectorName: String,
        collectorConfig: UdhOwmCollector.CollectorConfig,
        dfe: DataFetchingEnvironment,
    ): String {
        val resourcePath = UdhOwmCollector(tenant, project, collectorName).path
        val body = Json.encodeToString(collectorConfig)
        ensureValidName(resourcePath.path.last().second)
        val ctx = dfe.getAuthzContextOrThrow()
        val delayedActionsList = dfe.getFromContext<DelayedActionsList>()!!
        val action =
            executeAction(
                resourcePath.parent()!!,
                Action.Create(resourcePath.path.last().first, resourcePath.path.last().second),
                ctx,
                delayedActionsList,
                body,
            )
        return collectorName
    }

    fun deleteOwmCollector(
        collectorName: String,
        dfe: DataFetchingEnvironment,
    ): String {
        deleteResourceByPath(UdhOwmCollector(tenant, project, collectorName).path, dfe)
        return collectorName
    }
}

class GroupMutation(
    tenant: String,
    group: String,
) : GroupQuery(tenant, group),
    CommonMutation

class VizGroupMutation(
    tenant: String,
    vizGroup: String,
) : VizGroupQuery(tenant, vizGroup),
    CommonMutation

class SensorCredentialMutation(
    tenant: String,
    project: String,
    sensorCredential: String,
) : SensorCredentialQuery(tenant, project, sensorCredential),
    CommonMutation
