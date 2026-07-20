package net.teuto.udh

import jakarta.ws.rs.ClientErrorException
import jakarta.ws.rs.ForbiddenException
import jakarta.ws.rs.NotFoundException
import jakarta.ws.rs.core.Response
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import org.keycloak.authorization.attribute.Attributes
import org.keycloak.authorization.fgap.AdminPermissionsSchema
import org.keycloak.authorization.identity.Identity
import org.keycloak.authorization.identity.UserModelIdentity
import org.keycloak.authorization.model.Resource
import org.keycloak.models.AdminRoles
import org.keycloak.models.ClientModel
import org.keycloak.models.Constants
import org.keycloak.models.KeycloakSession
import org.keycloak.representations.idm.ClientRepresentation
import org.keycloak.representations.idm.ProtocolMapperRepresentation
import org.keycloak.services.managers.ClientManager
import org.keycloak.services.managers.RealmManager
import java.util.UUID
import kotlin.jvm.optionals.getOrNull

val OWM_COLLECTOR_TYPE =
    ResourceType(
        resourceTypeName = "owm-collector",
        attributesToModel = UdhOwmCollector::fromAttributes,
    )

val SENSOR_CREDENTIAL_TYPE =
    ResourceType(
        resourceTypeName = "sensor-credential",
        specificOwnScopes = listOf("rotate"),
        attributesToModel = UdhSensorCredential::fromAttributes,
    )

val VIZ_GROUP_TYPE =
    ResourceType(
        resourceTypeName = "viz-group",
        specificOwnScopes = listOf("dashboard-edit", "dashboard-read"),
        allowedAsPrincipal = true,
        children = listOf(),
        attributesToModel = UdhVizGroup::fromAttributes,
    )

val PROJECT_TYPE =
    ResourceType(
        resourceTypeName = "project",
        specificOwnScopes =
            listOf(
                "prometheus-read",
                "prometheus-write",
                "bucket-read",
                "bucket-write",
                "sensor-metadata-write",
            ),
        allowedAsPrincipal = true,
        children =
            listOf(
                SENSOR_CREDENTIAL_TYPE,
                OWM_COLLECTOR_TYPE,
            ),
        attributesToModel = UdhProject::fromAttributes,
    )

val GROUP_TYPE =
    ResourceType(
        resourceTypeName = "group",
        specificOwnScopes = listOf("dashboard-edit", "dashboard-read"),
        attributesToModel = UdhGroup::fromAttributes,
    )

val TENANT_TYPE =
    ResourceType(
        resourceTypeName = "tenant",
        children =
            listOf(
                GROUP_TYPE,
                PROJECT_TYPE,
                VIZ_GROUP_TYPE,
            ),
        attributesToModel = UdhTenant::fromAttributes,
    )

val ROOT_TYPE =
    ResourceType(
        resourceTypeName = "root",
        children =
            listOf(
                TENANT_TYPE,
            ),
        attributesToModel = { _ -> UdhRoot() },
    )

@Serializable
sealed interface UdhPrincipal {
    fun getIdentity(ctx: AuthzContext): Identity
}

@Serializable
sealed interface UdhResourceModel : UdhPrincipal {
    val path: ResourcePath

    fun postCreate(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
        body: String?,
    ): Any? = null

    fun postDelete(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
    ): Any? = null

    fun postAttributeChange(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
    ) {
    }

    fun customAction(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        action: String,
        body: String?,
        resource: UdhResource<*>,
    ): Any? = throw NotFoundException()

    override fun getIdentity(ctx: AuthzContext): Identity =
        AttributeIdentity(
            Attributes.from(
                mapOf(
                    DATA_HUB_RESOURCE_KEY to listOf(path.toHash()),
                    // is overwritten for groups and tenants, only applies when resources like viz-groups are principals
                    DATA_HUB_BYPASS_PARENT_CHECK to listOf("1"),
                    "data-hub.attribute.groups" to listOf(""),
                ),
            ),
        )
}

@Serializable
@SerialName("user")
class UdhUserPrincipal(
    val userId: String,
) : UdhPrincipal {
    override fun getIdentity(ctx: AuthzContext): Identity {
        val user = ctx.session.users().getUserById(ctx.realm, userId)
        return UserModelIdentity(ctx.realm, user)
    }
}

@Serializable
@SerialName("allAuthenticatedUsers")
class UdhAllAuthenticatedUsersPrincipal : UdhPrincipal {
    override fun getIdentity(ctx: AuthzContext): Identity = AttributeIdentity(Attributes.from(mapOf()))
}

class UdhRoot : UdhResourceModel {
    override val path = ResourcePath()
}

@Serializable
@SerialName("tenant")
data class UdhTenant(
    val tenant: String,
) : UdhResourceModel,
    UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhTenant {
            val tenant = attributes["tenant"]!!.first()
            return UdhTenant(tenant)
        }
    }

    override val path: ResourcePath
        get() = ResourcePath(listOf(TENANT_TYPE.resourceTypeName to tenant))

    override fun postCreate(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
        body: String?,
    ) {
        val tenantGroup =
            ctx.realm.getGroupById(tenantGroupId(tenant)) ?: ctx.realm.createGroup(tenantGroupId(tenant), tenant)
        val realmMgmtClient = ctx.realm.getClientByClientId(Constants.REALM_MANAGEMENT_CLIENT_ID)
        tenantGroup.grantRole(realmMgmtClient.getRole(AdminRoles.QUERY_USERS))
        tenantGroup.grantRole(realmMgmtClient.getRole(AdminRoles.QUERY_GROUPS))

        fun ignoreConflicts(f: () -> Unit) {
            try {
                f()
            } catch (e: ClientErrorException) {
                if (e.response.status != Response.Status.CONFLICT.statusCode) {
                    throw e
                }
            }
        }

        // add admin group
        ignoreConflicts { executeAction(path, Action.Create("group", "admin"), ctx, delayedActionsList, null) }
        // add admin viz-group
        ignoreConflicts { executeAction(path, Action.Create("viz-group", "admin"), ctx, delayedActionsList, null) }
        // add admin permission
        executeAction(
            path,
            Action.CreatePermission(
                "admin",
                listOf("tenant:admin"),
                listOf(UdhGroup(tenant, "admin"), UdhVizGroup(tenant, "admin")),
                false,
            ),
            ctx,
            delayedActionsList,
            null,
        )
        // add view permission
        executeAction(
            path,
            Action.CreatePermission(
                "members",
                listOf("tenant:view"),
                listOf(this),
                false,
            ),
            ctx,
            delayedActionsList,
            null,
        )
    }

    override fun postDelete(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
    ) {
        val groupHash = tenantGroupId(tenant)
        ctx.realm.getGroupById(groupHash)?.let { ctx.realm.removeGroup(it) }
        ctx.policyStore.findByName(ctx.resourceServer, groupHash)?.let { ctx.policyStore.delete(it.id) }
    }

    override fun getIdentity(ctx: AuthzContext): Identity =
        AttributeIdentity(
            Attributes.from(mapOf("data-hub.attribute.groups" to listOf("/$tenant"))),
        )

    val kcGroupId get() = tenantGroupId(tenant)
}

@Serializable
@SerialName("project")
data class UdhProject(
    val tenant: String,
    val project: String,
) : UdhResourceModel,
    UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhProject {
            val tenant = attributes["tenant"]!!.first()
            val project = attributes["project"]!!.first()
            return UdhProject(tenant, project)
        }

        const val BUCKET_MAX_LENGTH = 63
    }

    override val path: ResourcePath
        get() = ResourcePath(listOf(TENANT_TYPE.resourceTypeName to tenant, PROJECT_TYPE.resourceTypeName to project))

    val flatName get() = "$tenant.$project"

    override fun postCreate(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
        body: String?,
    ) {
        val affectedGroups =
            getPrincipalsForResource(ctx, path.getUdhResource(ctx)!!, "prometheus-read")
                .flatMap {
                    listOf(it as? UdhVizGroup ?: return@flatMap listOf())
                }.toSet()
        LOGGER.debug("affectedGroups postcreate: ${affectedGroups.joinToString()}")
        delayedActionsList.changes.add {
            syncGrafanaOrgs(ctx, affectedGroups)
        }
        if (hasBucket()) {
            delayedActionsList.changes.add {
                createBucket(this)
            }
        }
    }

    override fun postDelete(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
    ) {
        val affectedGroups =
            getPrincipalsForResource(ctx, resource, "prometheus-read")
                .flatMap {
                    listOf(it as? UdhVizGroup ?: return@flatMap listOf())
                }.toSet()
        LOGGER.debug("affectedGroups postdelete: ${affectedGroups.joinToString()}")
        delayedActionsList.changes.add {
            syncGrafanaOrgs(ctx, affectedGroups)
        }
        if (hasBucket()) {
            delayedActionsList.changes.add {
                deleteBucket(this)
            }
        }
    }

    fun hasBucket() = flatName.length <= BUCKET_MAX_LENGTH && !project.endsWith("--x-s3") && bucketClient() != null
}

@Serializable
@SerialName("group")
data class UdhGroup(
    val tenant: String,
    val group: String,
) : UdhResourceModel,
    UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhGroup {
            val tenant = attributes["tenant"]!!.first()
            val group = attributes["group"]!!.first()
            return UdhGroup(tenant, group)
        }
    }

    override val path: ResourcePath
        get() = ResourcePath(listOf(TENANT_TYPE.resourceTypeName to tenant, GROUP_TYPE.resourceTypeName to group))

    override fun postCreate(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
        body: String?,
    ) {
        val tenantHash = tenantGroupId(tenant)
        ctx.realm.createGroup(path.toHash(), group, ctx.realm.getGroupById(tenantHash))
    }

    override fun postDelete(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
    ) {
        val groupHash = path.toHash()
        ctx.realm.getGroupById(groupHash)?.let { ctx.realm.removeGroup(it) }
        ctx.policyStore.findByName(ctx.resourceServer, groupHash)?.let { ctx.policyStore.delete(it.id) }
    }

    override fun getIdentity(ctx: AuthzContext): Identity =
        AttributeIdentity(
            Attributes.from(mapOf("data-hub.attribute.groups" to listOf("/$tenant/$group"))),
        )

    val kcGroupId get() = path.toHash()
}

@Serializable
@SerialName("sensorCredential")
data class UdhSensorCredential(
    val tenant: String,
    val project: String,
    val sensorCredential: String,
) : UdhResourceModel,
    UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhSensorCredential {
            val tenant = attributes["tenant"]!!.first()
            val project = attributes["project"]!!.first()
            val sensorCredential = attributes["sensor-credential"]!!.first()
            return UdhSensorCredential(tenant, project, sensorCredential)
        }

        const val CLIENT_LAST_USED_AT_ATTRIBUTE = "udhLastUsedAt"
    }

    override val path: ResourcePath
        get() =
            ResourcePath(
                listOf(
                    TENANT_TYPE.resourceTypeName to tenant,
                    PROJECT_TYPE.resourceTypeName to project,
                    SENSOR_CREDENTIAL_TYPE.resourceTypeName to sensorCredential,
                ),
            )

    val projectModel: UdhProject get() = UdhProject(tenant, project)

    override fun postDelete(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
    ) {
        val clientManager = ClientManager(RealmManager(ctx.session))
        getServiceAccountClient(ctx.session)?.let {
            clientManager.removeClient(it.realm, it)
        }
    }

    override fun postCreate(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
        body: String?,
    ): Map<String, String> {
        val project = projectModel
        val clientRep = ClientRepresentation()
        clientRep.isStandardFlowEnabled = false
        clientRep.isPublicClient = false
        clientRep.isServiceAccountsEnabled = true
        clientRep.defaultClientScopes = listOf()
        clientRep.optionalClientScopes = listOf()
        clientRep.attributes = mapOf("hash" to path.toHash())

        fun createMapper(
            t: String,
            m: Map<String, String>,
        ): ProtocolMapperRepresentation {
            val mapper = ProtocolMapperRepresentation()
            mapper.name = UUID.randomUUID().toString()
            mapper.protocol = "openid-connect"
            mapper.protocolMapper = t
            mapper.config = m
            return mapper
        }

        clientRep.protocolMappers =
            listOf(
                createMapper(
                    "oidc-hardcoded-claim-mapper",
                    mapOf(
                        "claim.name" to "projects",
                        "claim.value" to
                            NON_COERCING_MAPPER.writeValueAsString(
                                listOf(
                                    project.flatName,
                                ),
                            ),
                        "jsonType.label" to "JSON",
                        "access.token.claim" to "true",
                    ),
                ),
                createMapper(
                    "oidc-hardcoded-claim-mapper",
                    mapOf(
                        "claim.name" to "groups",
                        "claim.value" to project.flatName,
                        "access.token.claim" to "true",
                    ),
                ),
                createMapper(
                    "oidc-audience-mapper",
                    mapOf(
                        "included.custom.audience" to "mdb",
                        "access.token.claim" to "true",
                    ),
                ),
                createMapper(
                    "oidc-audience-mapper",
                    mapOf(
                        "included.custom.audience" to "prometheus_write",
                        "access.token.claim" to "true",
                    ),
                ),
                createMapper(
                    "oidc-hardcoded-claim-mapper",
                    mapOf(
                        "claim.name" to "api_token_name",
                        "claim.value" to "${this.tenant}.${this.project}.${this.sensorCredential}",
                        "access.token.claim" to "true",
                    ),
                ),
            )
        val clientManager = ClientManager(RealmManager(ctx.session))
        val client = ClientManager.createClient(ctx.session, ctx.realm, clientRep)
        clientManager.enableServiceAccount(client)

        return mapOf(
            "username" to client.clientId,
            "password" to client.secret,
        )
    }

    fun getServiceAccountClient(session: KeycloakSession): ClientModel? {
        val credentialHash = path.toHash()
        var result: ClientModel? = null
        AdminPermissionsSchema.runWithoutAuthorization(session) {
            result =
                session.context.realm.clientsStream
                    .filter {
                        it.getAttribute("hash") == credentialHash
                    }.findFirst()
                    .getOrNull()
        }
        return result
    }

    override fun customAction(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        action: String,
        body: String?,
        resource: UdhResource<*>,
    ): Map<String, String> {
        if (action == "rotate") {
            if (!hasPermissionScopes(
                    resource.kcResource,
                    listOf("rotate"),
                    ctx,
                    ctx.evaluationContext,
                )
            ) {
                throw ForbiddenException()
            }
            postDelete(ctx, delayedActionsList, resource)
            return postCreate(ctx, delayedActionsList, resource, null)
        }
        throw NotFoundException()
    }
}

@Serializable
@SerialName("vizGroup")
data class UdhVizGroup(
    val tenant: String,
    val vizGroup: String,
) : UdhResourceModel,
    UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhVizGroup {
            val tenant = attributes["tenant"]!!.first()
            val vizGroup = attributes["viz-group"]!!.first()
            return UdhVizGroup(tenant, vizGroup)
        }
    }

    override val path: ResourcePath
        get() =
            ResourcePath(
                listOf(
                    TENANT_TYPE.resourceTypeName to tenant,
                    VIZ_GROUP_TYPE.resourceTypeName to vizGroup,
                ),
            )

    val grafanaOrgName get() = "$tenant:$vizGroup"

    override fun postCreate(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
        body: String?,
    ) {
        delayedActionsList.changes.add {
            createGrafanaOrg(grafanaOrgName)
        }
    }

    override fun postDelete(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
    ) {
        delayedActionsList.changes.add {
            deleteOrgGrafana(grafanaOrgName)
        }
    }
}

@Serializable
@SerialName("owmCollector")
data class UdhOwmCollector(
    val tenant: String,
    val project: String,
    val owmCollector: String,
) : UdhResourceModel,
    UdhPrincipal {
    companion object {
        fun fromAttributes(attributes: Map<String, List<String>>): UdhOwmCollector {
            val tenant = attributes["tenant"]!!.first()
            val project = attributes["project"]!!.first()
            val owmCollector = attributes["owm-collector"]!!.first()
            return UdhOwmCollector(tenant, project, owmCollector)
        }

        const val ATTR_TOKEN = "token"
        const val ATTR_LATITUDE = "latitude"
        const val ATTR_LONGITUDE = "longitude"
        const val ATTR_INTERVAL = "interval"
    }

    override val path: ResourcePath
        get() = ResourcePath(listOf("tenant" to tenant, "project" to project, "owm-collector" to owmCollector))

    @Serializable
    data class CollectorConfig(
        val token: String,
        val latitude: Double,
        val longitude: Double,
        val interval: Int,
    ) {
        companion object {
            fun fromAttributes(attributes: Map<String, List<String>>): CollectorConfig =
                CollectorConfig(
                    attributes[ATTR_TOKEN]!![0],
                    attributes[ATTR_LATITUDE]!![0].toDouble(),
                    attributes[ATTR_LONGITUDE]!![0].toDouble(),
                    attributes[ATTR_INTERVAL]!![0].toInt(),
                )
        }
    }

    override fun postCreate(
        ctx: AuthzContext,
        delayedActionsList: DelayedActionsList,
        resource: UdhResource<*>,
        body: String?,
    ) {
        val config = decodeJson<CollectorConfig>(body)
        resource.kcResource.setAttribute(ATTR_TOKEN, listOf(validateAttributeValue(config.token)))
        resource.kcResource.setAttribute(ATTR_LATITUDE, listOf(validateAttributeValue(config.latitude.toString())))
        resource.kcResource.setAttribute(ATTR_LONGITUDE, listOf(validateAttributeValue(config.longitude.toString())))
        resource.kcResource.setAttribute(ATTR_INTERVAL, listOf(validateAttributeValue(config.interval.toString())))
    }
}

fun udhResourceModelFromResource(resource: Resource): UdhResourceModel =
    when (resource.type) {
        "tenant" -> UdhTenant.fromAttributes(resource.attributes)
        "project" -> UdhProject.fromAttributes(resource.attributes)
        "owm-collector" -> UdhOwmCollector.fromAttributes(resource.attributes)
        "sensor-credential" -> UdhSensorCredential.fromAttributes(resource.attributes)
        "group" -> UdhGroup.fromAttributes(resource.attributes)
        "viz-group" -> UdhVizGroup.fromAttributes(resource.attributes)
        else -> throw RuntimeException("unknown resource type ${resource.type}")
    }
