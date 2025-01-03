package net.teuto.udh

import jakarta.ws.rs.BadRequestException
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import org.keycloak.authorization.attribute.Attributes
import org.keycloak.authorization.common.UserModelIdentity
import org.keycloak.authorization.identity.Identity
import org.keycloak.authorization.model.Resource
import org.keycloak.representations.idm.ClientRepresentation
import org.keycloak.representations.idm.ProtocolMapperRepresentation
import org.keycloak.services.managers.ClientManager
import org.keycloak.services.managers.RealmManager
import org.keycloak.services.resources.admin.permissions.AdminPermissions
import java.util.*

val SENSOR_CREDENTIALS_TYPE = ResourceType<UdhSensorCredential>(
    resourceTypeName = "sensor-credential",
    specificOwnScopes = listOf("rotate"),
    attributesToModel = UdhSensorCredential::fromAttributes,
    clazz = UdhSensorCredential::class
)

val VIZ_GROUPS_TYPE = ResourceType<UdhVizGroup>(
    resourceTypeName = "viz-group",
    allowedAsPrincipal = true,
    children = listOf(),
    attributesToModel = UdhVizGroup::fromAttributes,
    clazz = UdhVizGroup::class
)

val PROJECTS_TYPE = ResourceType<UdhProject>(
    resourceTypeName = "project",
    specificOwnScopes = listOf(
        "prometheus-read",
        "prometheus-write",
        "bucket-write",
        "sensor-metadata-write"
    ),
    allowedAsPrincipal = true,
    children = listOf(
        SENSOR_CREDENTIALS_TYPE
    ),
    attributesToModel = UdhProject::fromAttributes,
    clazz = UdhProject::class
)

val GROUPS_TYPE = ResourceType<UdhGroup>(
    resourceTypeName = "group",
    specificOwnScopes = listOf("dashboard-edit", "dashboard-read"),
    attributesToModel = UdhGroup::fromAttributes,
    clazz = UdhGroup::class
)

val TENANT_TYPE = ResourceType<UdhTenant>(
    resourceTypeName = "tenant",
    children = listOf(
        GROUPS_TYPE,
        PROJECTS_TYPE,
        VIZ_GROUPS_TYPE
    ),
    attributesToModel = UdhTenant::fromAttributes,
    clazz = UdhTenant::class
)

val ROOT_TYPE = ResourceType<UdhRoot>(
    resourceTypeName = "root",
    children = listOf(
        TENANT_TYPE
    ),
    attributesToModel = { _ -> UdhRoot() },
    clazz = UdhRoot::class
)

@Serializable
sealed interface UdhPrincipal {
    fun getIdentity(ctx: AuthzContext): Identity
}

@Serializable
sealed interface UdhResourceModel : UdhPrincipal {
    val path: ResourcePath

    fun postCreate(ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>): Any? {
        return null
    }

    fun postDelete(ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>): Any? {
        return null
    }

    fun customAction(ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>, action: String): Any? {
        throw BadRequestException()
    }

    override fun getIdentity(ctx: AuthzContext): Identity {
        return AttributeIdentity(
            Attributes.from(
                mapOf(
                    DATA_HUB_RESOURCE_KEY to listOf(path.toHash()),
                    "data-hub.attribute.groups" to listOf("")
                )
            )
        )
    }
}


@Serializable
@SerialName("user")
class UdhUserPrincipal(val userId: String) : UdhPrincipal {
    override fun getIdentity(ctx: AuthzContext): Identity {
        val user = ctx.session.users().getUserById(ctx.realm, userId)
        return UserModelIdentity(ctx.realm, user)
    }
}

class UdhRoot : UdhResourceModel {
    override val path = ResourcePath()
}

@Serializable
@SerialName("tenant")
data class UdhTenant(val tenant: String) : UdhResourceModel, UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhTenant {
            val tenant = attributes["tenant"]!!.first()
            return UdhTenant(tenant)
        }
    }

    override val path: ResourcePath
        get() = ResourcePath(listOf("tenant" to tenant))

    override fun postCreate(
        ctx: AuthzContext,
        externalChangesList: MutableList<() -> Unit>
    ) {
        val tenantGroup = ctx.realm.createGroup(tenantGroupId(tenant), tenant)
        val mgmtPermissions = AdminPermissions.management(ctx.session, ctx.realm)
        mgmtPermissions.groups().setPermissionsEnabled(tenantGroup, true)
        tenantGroup.grantRole(mgmtPermissions.realmManagementClient.getRole("query-users"))
        tenantGroup.grantRole(mgmtPermissions.realmManagementClient.getRole("query-groups"))

        // add admin group
        executeAction(path, Action.Create("group", "admin"), ctx, externalChangesList)
        // add admin permission
        executeAction(
            path,
            Action.CreatePermission("admin", listOf("tenant:admin"), listOf(UdhGroup(tenant, "admin"))),
            ctx,
            externalChangesList
        )
        // add view permission
        executeAction(
            path,
            Action.CreatePermission("members", listOf("tenant:view"), listOf(this)),
            ctx,
            externalChangesList
        )
    }

    override fun postDelete(
        ctx: AuthzContext,
        externalChangesList: MutableList<() -> Unit>
    ) {
        val groupHash = tenantGroupId(tenant)
        ctx.realm.getGroupById(groupHash)?.let { ctx.realm.removeGroup(it) }
        ctx.policyStore.findByName(ctx.resourceServer, groupHash)?.let { ctx.policyStore.delete(it.id) }
    }

    override fun getIdentity(ctx: AuthzContext): Identity {
        return AttributeIdentity(
            Attributes.from(mapOf("data-hub.attribute.groups" to listOf("/${tenant}")))
        )
    }
}

@Serializable
@SerialName("project")
data class UdhProject(val tenant: String, val project: String) : UdhResourceModel, UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhProject {
            val tenant = attributes["tenant"]!!.first()
            val project = attributes["project"]!!.first()
            return UdhProject(tenant, project)
        }
    }

    override val path: ResourcePath
        get() = ResourcePath(listOf("tenant" to tenant, "project" to project))

    override fun postCreate(
        ctx: AuthzContext,
        externalChangesList: MutableList<() -> Unit>
    ) {
        val affectedGroups = getPrincipalsForResource(ctx, path.getUdhResource(ctx)!!, "prometheus-read").flatMap {
            listOf(it as? UdhGroup ?: return@flatMap listOf())
        }.toSet()
        LOGGER.debug("affectedGroups postcreate: ${affectedGroups.joinToString()}")
        externalChangesList.add {
            syncGrafanaOrgs(ctx, affectedGroups)
        }
    }

    override fun postDelete(
        ctx: AuthzContext,
        externalChangesList: MutableList<() -> Unit>
    ) {
        val affectedGroups = getPrincipalsForResource(ctx, path.getUdhResource(ctx)!!, "prometheus-read").flatMap {
            listOf(it as? UdhGroup ?: return@flatMap listOf())
        }.toSet()
        LOGGER.debug("affectedGroups postdelete: ${affectedGroups.joinToString()}")
        externalChangesList.add {
            syncGrafanaOrgs(ctx, affectedGroups)
        }
    }

    val flatName get() = "$tenant.$project"
}

@Serializable
@SerialName("group")
data class UdhGroup(val tenant: String, val group: String) : UdhResourceModel, UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhGroup {
            val tenant = attributes["tenant"]!!.first()
            val group = attributes["group"]!!.first()
            return UdhGroup(tenant, group)
        }
    }

    override val path: ResourcePath
        get() = ResourcePath(listOf("tenant" to tenant, "group" to group))

    val grafanaOrgName get() = "$tenant:$group"

    override fun postCreate(ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>) {
        val tenantHash = tenantGroupId(tenant)
        val groupGroup =
            ctx.realm.createGroup(path.toHash(), group, ctx.realm.getGroupById(tenantHash))
        val mgmtPermissions = AdminPermissions.management(ctx.session, ctx.realm)
        mgmtPermissions.groups().setPermissionsEnabled(groupGroup, true)
        externalChangesList.add {
            createGrafanaOrg(grafanaOrgName)
        }
    }

    override fun postDelete(ctx: AuthzContext, externalChangesList: MutableList<() -> Unit>) {
        val groupHash = path.toHash()
        ctx.realm.getGroupById(groupHash)?.let { ctx.realm.removeGroup(it) }
        ctx.policyStore.findByName(ctx.resourceServer, groupHash)?.let { ctx.policyStore.delete(it.id) }

        externalChangesList.add {
            deleteOrgGrafana(grafanaOrgName)
        }
    }

    override fun getIdentity(ctx: AuthzContext): Identity {
        return AttributeIdentity(
            Attributes.from(mapOf("data-hub.attribute.groups" to listOf("/${tenant}/${group}")))
        )
    }
}


@Serializable
@SerialName("sensorCredential")
data class UdhSensorCredential(val tenant: String, val project: String, val sensorCredential: String) :
    UdhResourceModel,
    UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhSensorCredential {
            val tenant = attributes["tenant"]!!.first()
            val project = attributes["project"]!!.first()
            val sensorCredential = attributes["sensor-credential"]!!.first()
            return UdhSensorCredential(tenant, project, sensorCredential)
        }
    }

    override val path: ResourcePath
        get() = ResourcePath(listOf("tenant" to tenant, "project" to project, "sensor-credential" to sensorCredential))

    val projectModel: UdhProject get() = UdhProject(tenant, project)

    override fun postDelete(
        ctx: AuthzContext,
        externalChangesList: MutableList<() -> Unit>
    ) {
        val credentialHash = path.toHash()
        val clientManager = ClientManager(RealmManager(ctx.session))
        ctx.realm.clientsStream.filter { it.getAttribute("hash") == credentialHash }.forEach {
            clientManager.removeClient(it.realm, it)
        }
    }

    override fun postCreate(
        ctx: AuthzContext,
        externalChangesList: MutableList<() -> Unit>
    ): Map<String, String> {
        val project = projectModel
        val clientRep = ClientRepresentation()
        clientRep.isStandardFlowEnabled = false
        clientRep.isPublicClient = false
        clientRep.isServiceAccountsEnabled = true
        clientRep.defaultClientScopes = listOf()
        clientRep.optionalClientScopes = listOf()
        clientRep.attributes = mapOf("hash" to path.toHash())

        fun createMapper(t: String, m: Map<String, String>): ProtocolMapperRepresentation {
            val mapper = ProtocolMapperRepresentation()
            mapper.name = UUID.randomUUID().toString()
            mapper.protocol = "openid-connect"
            mapper.protocolMapper = t
            mapper.config = m
            return mapper
        }

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
            ),
            createMapper(
                "oidc-hardcoded-claim-mapper", mapOf(
                    "claim.name" to "api_token_name",
                    "claim.value" to "${this.tenant}.${this.project}.${this.sensorCredential}",
                    "access.token.claim" to "true",
                )
            ),
        )
        val client = ClientManager.createClient(ctx.session, ctx.realm, clientRep)
        return mapOf(
            "username" to client.clientId,
            "password" to client.secret
        )
    }

    override fun customAction(
        ctx: AuthzContext,
        externalChangesList: MutableList<() -> Unit>,
        action: String
    ): Map<String, String> {
        if (action == "rotate") {
            postDelete(ctx, externalChangesList)
            return postCreate(ctx, externalChangesList)
        }
        throw BadRequestException()
    }
}

@Serializable
@SerialName("vizGroup")
data class UdhVizGroup(val tenant: String, val vizGroup: String) : UdhResourceModel, UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhVizGroup {
            val tenant = attributes["tenant"]!!.first()
            val vizGroup = attributes["viz-group"]!!.first()
            return UdhVizGroup(tenant, vizGroup)
        }
    }

    override val path: ResourcePath
        get() = ResourcePath(listOf("tenant" to tenant, "viz-group" to vizGroup))

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
