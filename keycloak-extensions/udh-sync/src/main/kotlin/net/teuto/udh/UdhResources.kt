package net.teuto.udh

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import org.keycloak.authorization.model.Resource
import org.keycloak.representations.idm.ClientRepresentation
import org.keycloak.representations.idm.ProtocolMapperRepresentation
import org.keycloak.services.managers.ClientManager
import org.keycloak.services.managers.RealmManager
import org.keycloak.services.resources.admin.permissions.AdminPermissions
import java.util.*

val resources = ResourceType(
    resourceTypeName = "root",
    children = listOf(
        ResourceType(
            resourceTypeName = "tenant",
            postCreate = ::tenantPostCreate,
            postDelete = ::tenantPostDelete,
            children = listOf(
                ResourceType(
                    resourceTypeName = "group",
                    specificOwnScopes = listOf("dashboard-edit"),
                    postCreate = ::groupPostCreate,
                    postDelete = ::groupPostDelete
                ),
                ResourceType(
                    resourceTypeName = "project",
                    specificOwnScopes = listOf(
                        "prometheus-read",
                        "prometheus-write",
                        "bucket-write",
                        "sensor-metadata-write"
                    ),
                    postCreate = ::projectPostCreateDelete,
                    postDelete = ::projectPostCreateDelete,
                    allowedAsPrincipal = true,
                    children = listOf(
                        ResourceType(
                            resourceTypeName = "sensor-credential",
                            specificOwnScopes = listOf("rotate"),
                            postCreate = ::sensorCredentialCreate,
                            postDelete = ::sensorCredentialDelete,
                            customActions = mapOf("rotate" to ::sensorCredentialRotate)
                        )
                    ),
                ),
                ResourceType(
                    resourceTypeName = "viz-group",
                    allowedAsPrincipal = true,
                )
            ),
        )
    )
)

fun tenantPostCreate(resource: UdhResource, ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>) {
    val tenantName = UdhTenant.fromAttributes(resource.kcResource.attributes).tenant
    val tenantGroup = ctx.realm.createGroup(tenantGroupId(tenantName), tenantName)
    val mgmtPermissions = AdminPermissions.management(ctx.session, ctx.realm)
    mgmtPermissions.groups().setPermissionsEnabled(tenantGroup, true)
    tenantGroup.grantRole(mgmtPermissions.realmManagementClient.getRole("query-users"))
    tenantGroup.grantRole(mgmtPermissions.realmManagementClient.getRole("query-groups"))

    // add admin group
    executeAction(resource.path, Action.Create("group", "admin"), ctx, externalChangesList)
    // add admin permission
    executeAction(
        resource.path,
        Action.CreatePermission("admin", listOf("tenant:admin"), listOf(UdhGroup(tenantName, "admin"))),
        ctx,
        externalChangesList
    )
    // add view permission
    executeAction(
        resource.path,
        Action.CreatePermission("members", listOf("tenant:view"), listOf(UdhTenant(tenantName))),
        ctx,
        externalChangesList
    )
}

fun tenantPostDelete(resource: UdhResource, ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>) {
    val tenantName = UdhTenant.fromAttributes(resource.kcResource.attributes).tenant
    ctx.realm.getGroupById(tenantGroupId(tenantName))?.let { ctx.realm.removeGroup(it) }
}

fun groupPostCreate(resource: UdhResource, ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>) {
    val groupModel = UdhGroup.fromAttributes(resource.kcResource.attributes)
    val tenantHash = tenantGroupId(groupModel.tenant)
    val groupGroup = ctx.realm.createGroup(resource.path.toHash(), groupModel.group, ctx.realm.getGroupById(tenantHash))
    val mgmtPermissions = AdminPermissions.management(ctx.session, ctx.realm)
    mgmtPermissions.groups().setPermissionsEnabled(groupGroup, true)
    externalChangesList.add {
        createGrafanaOrg(groupModel.grafanaOrgName)
    }
}

fun groupPostDelete(resource: UdhResource, ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>) {
    val groupModel = UdhGroup.fromAttributes(resource.kcResource.attributes)
    ctx.realm.getGroupById(resource.path.toHash())?.let { ctx.realm.removeGroup(it) }

    externalChangesList.add {
        deleteOrgGrafana(groupModel.grafanaOrgName)
    }
}

fun createMapper(t: String, m: Map<String, String>): ProtocolMapperRepresentation {
    val mapper = ProtocolMapperRepresentation()
    mapper.name = UUID.randomUUID().toString()
    mapper.protocol = "openid-connect"
    mapper.protocolMapper = t
    mapper.config = m
    return mapper
}

fun sensorCredentialCreate(
    resource: UdhResource,
    ctx: AuthzContext,
    externalChangesList: MutableList<() -> Unit>
): Map<String, String> {
    val project = UdhProject.fromAttributes(resource.kcResource.attributes)
    val clientRep = ClientRepresentation()
    clientRep.isStandardFlowEnabled = false
    clientRep.isPublicClient = false
    clientRep.isServiceAccountsEnabled = true
    clientRep.defaultClientScopes = listOf()
    clientRep.optionalClientScopes = listOf()
    clientRep.attributes = mapOf("hash" to resource.path.toHash())
    clientRep.protocolMappers = listOf(
        createMapper(
            "oidc-hardcoded-claim-mapper", mapOf(
                "claim.name" to "projects",
                "claim.value" to NON_COERCING_MAPPER.writeValueAsString(
                    listOf(
                        project.flatName
                    )
                ),
                "jsonType.label" to "JSON",
                "access.token.claim" to "true",
            )
        ),
        createMapper(
            "oidc-hardcoded-claim-mapper", mapOf(
                "claim.name" to "groups",
                "claim.value" to project.flatName,
                "access.token.claim" to "true",
            )
        ),
        createMapper(
            "oidc-audience-mapper", mapOf(
                "included.custom.audience" to "mdb",
                "access.token.claim" to "true",
            )
        ),
        createMapper(
            "oidc-audience-mapper", mapOf(
                "included.custom.audience" to "prometheus_write",
                "access.token.claim" to "true",
            )
        )
    )
    val client = ClientManager.createClient(ctx.session, ctx.realm, clientRep)
    return mapOf(
        "username" to client.clientId,
        "password" to client.secret
    )
}

fun projectPostCreateDelete(
    resource: UdhResource,
    ctx: AuthzContext,
    externalChangesList: MutableList<() -> Unit>
) {
    val project = UdhProject.fromAttributes(resource.kcResource.attributes)

    externalChangesList.add {
        syncGrafanaOrgsForTenant(ctx, project.tenant)
    }
}

fun sensorCredentialDelete(resource: UdhResource, ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>) {
    val credentialHash = resource.path.toHash()
    val clientManager = ClientManager(RealmManager(ctx.session))
    ctx.realm.clientsStream.filter { it.getAttribute("hash") == credentialHash }.forEach {
        clientManager.removeClient(it.realm, it)
    }
}

fun sensorCredentialRotate(
    resource: UdhResource,
    ctx: AuthzContext,
    externalChangesList: MutableList<() -> Unit>
): Map<String, String> {
    sensorCredentialDelete(resource, ctx, externalChangesList)
    return sensorCredentialCreate(resource, ctx, externalChangesList)
}

@Serializable
sealed interface UdhPrincipal

@Serializable
sealed interface UdhResourceModel : UdhPrincipal


@Serializable
@SerialName("user")
class UdhUserPrincipal(val userId: String) : UdhPrincipal


@Serializable
@SerialName("tenant")
class UdhTenant(val tenant: String) : UdhResourceModel, UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhTenant {
            val tenant = attributes["tenant"]!!.first()
            return UdhTenant(tenant)
        }
    }
}

@Serializable
@SerialName("project")
class UdhProject(val tenant: String, val project: String) : UdhResourceModel, UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhProject {
            val tenant = attributes["tenant"]!!.first()
            val project = attributes["project"]!!.first()
            return UdhProject(tenant, project)
        }
    }

    val flatName get() = "$tenant.$project"
}

@Serializable
@SerialName("group")
class UdhGroup(val tenant: String, val group: String) : UdhResourceModel, UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhGroup {
            val tenant = attributes["tenant"]!!.first()
            val group = attributes["group"]!!.first()
            return UdhGroup(tenant, group)
        }
    }

    val grafanaOrgName get() = "$tenant:$group"
}


@Serializable
@SerialName("sensorCredential")
class UdhSensorCredential(val tenant: String, val project: String, val sensorCredential: String) : UdhResourceModel,
    UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhSensorCredential {
            val tenant = attributes["tenant"]!!.first()
            val project = attributes["project"]!!.first()
            val sensorCredential = attributes["sensor-credential"]!!.first()
            return UdhSensorCredential(tenant, project, sensorCredential)
        }
    }
}

@Serializable
@SerialName("vizGroup")
class UdhVizGroup(val tenant: String, val vizGroup: String) : UdhResourceModel, UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhVizGroup {
            val tenant = attributes["tenant"]!!.first()
            val vizGroup = attributes["viz-group"]!!.first()
            return UdhVizGroup(tenant, vizGroup)
        }
    }

    val grafanaOrgName get() = "${tenant}:${vizGroup}"
}


fun udhResourceModelFromResource(resource: Resource): UdhResourceModel {
    return when (resource.type) {
        "tenant" -> UdhTenant.fromAttributes(resource.attributes)
        "project" -> UdhProject.fromAttributes(resource.attributes)
        "sensor-credential" -> UdhSensorCredential.fromAttributes(resource.attributes)
        "group" -> UdhGroup.fromAttributes(resource.attributes)
        "viz-group" -> UdhVizGroup.fromAttributes(resource.attributes)
        else -> throw RuntimeException("unknown resource type ${resource.type}")
    }
}
