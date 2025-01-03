package net.teuto.udh

import io.github.reactivecircus.cache4k.Cache
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.keycloak.authorization.attribute.Attributes
import org.keycloak.authorization.common.DefaultEvaluationContext
import org.keycloak.authorization.identity.Identity
import org.keycloak.models.KeycloakSession
import org.keycloak.models.UserModel
import org.keycloak.representations.IDToken
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpRequest.BodyPublishers
import java.net.http.HttpResponse
import java.net.http.HttpResponse.BodyHandlers
import java.util.*
import kotlin.time.Duration.Companion.seconds

// if the host is not set, this module does nothing
// get values from keycloak deployment in k9s for local testing, port-forward grafana pod
val GRAFANA_HOST: String? = System.getenv("GRAFANA_HOST")
val GRAFANA_ADMIN_USER = System.getenv("GRAFANA_USER") ?: "admin"
val GRAFANA_ADMIN_PASSWORD = System.getenv("GRAFANA_PASSWORD") ?: "admin"
val PROMETHEUS_HOST: String = System.getenv("PROMETHEUS_HOST") ?: "prometheus"

val USER_SYNC_CACHE = Cache.Builder<UserSyncParams, Unit>().maximumCacheSize(1000).expireAfterWrite(10.seconds).build()

data class UserSyncParams(
    val userLogin: String,
    val userEmail: String,
    val editOrgNames: List<String>,
    val readOrgNames: List<String>,
)

fun syncGrafanaUser(ctx: AuthzContext, userModel: UserModel, client: GrafanaClient) {
    val editOrgNames = getResourcesForUser(ctx, GROUPS_TYPE, mapOf(), listOf("dashboard-edit")).map {
        it.getResourceModel().grafanaOrgName
    }
    val readOrgNames = getResourcesForUser(ctx, GROUPS_TYPE, mapOf(), listOf("dashboard-read")).map {
        it.getResourceModel().grafanaOrgName
    }
    val params = UserSyncParams(userModel.id, userModel.email, editOrgNames, readOrgNames)
    if (USER_SYNC_CACHE.get(params) == null) {
        USER_SYNC_CACHE.put(params, Unit)
        client.syncGrafanaUser(userModel.id, userModel.email, editOrgNames, readOrgNames)
    }
}

fun setClaimGrafana(ctx: AuthzContext, token: IDToken, userModel: UserModel) {
    getGrafanaClient()?.let { syncGrafanaUser(ctx, userModel, it) }
    token.setOtherClaims("preferred_username", userModel.id)
}

fun syncGrafanaOrgsForTenant(ctx: AuthzContext, tenant: String) {
    val groupsToSync = lookupResources(ctx, GROUPS_TYPE, mapOf("tenant" to tenant)).map {
        it.getResourceModel()
    }
    syncGrafanaOrgs(ctx, groupsToSync)
}

class AttributeIdentity(val attrs: Attributes) : Identity {
    override fun getId(): String {
        return "custom"
    }

    override fun getAttributes(): Attributes {
        return attrs
    }
}

// find projects that can be accessed by this group
fun projectsForGroup(ctx: AuthzContext, group: UdhGroup): List<String> {
    val evaluationContext = DefaultEvaluationContext(group.getIdentity(ctx), ctx.session)
    val authzContext = ctx.copy(evaluationContext = evaluationContext)
    val flatProjects = getFlatProjects(authzContext, null, listOf("prometheus-read"))
    LOGGER.debug("projectsForGroup, group: $group, projects: ${flatProjects.joinToString()}")
    return flatProjects
}

fun syncGrafanaOrgs(ctx: AuthzContext, groups: Collection<UdhGroup>) {
    groups.forEach { group ->
        run {
            syncGrafanaOrg(group.grafanaOrgName, projectsForGroup(ctx, group))
        }
    }
}

fun syncGrafanaOrg(name: String, projects: List<String>) {
    val client = getGrafanaClient() ?: return
    client.lookupOrg(name)?.let { client.syncOrgDatasource(it.id, projects) }
}

fun createGrafanaOrg(name: String) {
    val client = getGrafanaClient() ?: return
    val orgId = client.createOrg(name)
    client.syncOrgDatasource(orgId, listOf())
}

fun deleteOrgGrafana(name: String) {
    val client = getGrafanaClient() ?: return
    val org = client.lookupOrg(name)
    if (org == null) {
        LOGGER.warn("Grafana org $name not found, will not be deleted")
    } else {
        client.deleteOrg(org.id)
    }
}

fun syncAllGrafana(session: KeycloakSession) {
    LOGGER.info("starting daily grafana sync")
    // dummy evaluation context
    val ctx =
        getAuthzContext(session, DefaultEvaluationContext(AttributeIdentity(Attributes.from(mapOf())), session), null)
    val orgs = lookupResources(ctx, GROUPS_TYPE, mapOf()).associate {
        val group = it.getResourceModel()
        group.grafanaOrgName to projectsForGroup(ctx, group)
    }
    val grafanaClient = getGrafanaClient()
    if (grafanaClient == null) {
        LOGGER.warn("grafana client is null, can't do full sync!")
        return
    }
    grafanaClient.syncOrgsDatasources(orgs)
    grafanaClient.allNonAdminUsers().forEach {
        val kcUser = session.users().getUserById(ctx.realm, it.login)
        if (kcUser != null) {
            syncGrafanaUser(ctx, kcUser, grafanaClient)
        } else {
            LOGGER.info("deleting grafana user ${it.login} ${it.email}")
            grafanaClient.deleteUser(it.id)
        }
    }
    LOGGER.info("daily grafana sync finished")
}

@Serializable
data class GrafanaUserModel(
    val id: Int,
    val name: String,
    val login: String,
    val email: String,
    // this is marked as optional because grafana can't decide if it should be isAdmin or isGrafanaAdmin
    val isAdmin: Boolean = false
)

@Serializable
data class GrafanaOrgOverviewModel(
    val id: Int,
    val name: String,
)

@Serializable
data class GrafanaOrgOverviewModelButWithOrgId(
    val orgId: Int,
    val name: String,
    val role: String,
)

@Serializable
data class IdResponse(val id: Int)

// I love the grafana API, it's so consistent...
@Serializable
data class OrgIdResponse(val orgId: Int)

@Serializable
// overwrite is only present when updating the datasource
data class GrafanaDatasourceModel(
    val name: String,
    val type: String,
    val uid: String,
    val access: String,
    val url: String,
    val jsonData: Map<String, String>,
    val secureJsonData: Map<String, String> = mapOf(),
    val version: Int,
    val overwrite: Boolean = false
)

fun getGrafanaClient(): GrafanaClient? {
    if (GRAFANA_HOST != null) {
        return GrafanaClient("http://$GRAFANA_HOST", GRAFANA_ADMIN_USER, GRAFANA_ADMIN_PASSWORD)
    }
    return null
}

class HttpException(message: String) : Exception(message)

class GrafanaClient(val host: String, user: String, password: String) {
    val httpClient = HttpClient.newHttpClient()
    val basicAuth: String = "Basic ${Base64.getEncoder().encodeToString("$user:$password".encodeToByteArray())}"
    val json = Json {
        ignoreUnknownKeys = true
    }

    fun httpRequest(uri: String, builderConfig: (HttpRequest.Builder) -> HttpRequest.Builder): HttpResponse<String> {
        return httpRequest(uri, null, builderConfig)
    }

    fun httpRequest(
        uri: String,
        orgId: Int?,
        builderConfig: (HttpRequest.Builder) -> HttpRequest.Builder
    ): HttpResponse<String> {
        var builder = builderConfig(HttpRequest.newBuilder())
            .uri(URI(uri))
            .header("Authorization", basicAuth)
            .header("Content-Type", "application/json")
        if (orgId != null) {
            builder = builder.header("X-Grafana-Org-Id", orgId.toString())
        }

        val response = httpClient.send(builder.build(), BodyHandlers.ofString())
        // 404 might be returned on lookups
        if (response.statusCode() >= 400 && response.statusCode() != 404) {
            throw HttpException("http error on ${uri}: ${response.body()}")
        }
        return response
    }

    fun allNonAdminUsers(): Sequence<GrafanaUserModel> {
        return getPaginated("/api/users", 1, GrafanaUserModel.serializer()).filter { !it.isAdmin }
    }

    // startIndex is necessary because of grafana API inconsistencies
    fun <T : Any> getPaginated(
        path: String,
        startIndex: Int,
        serializer: KSerializer<T>
    ): Sequence<T> {
        return generateSequence(startIndex) { it + 1 }.map {
            val response = httpRequest("$host$path?page=$it") { req -> req.GET() }
            json.decodeFromString(ListSerializer(serializer), response.body())
        }.takeWhile { it.isNotEmpty() }.flatten()
    }

    // creates a user with the specified username and email and returns the user id
    fun createUser(login: String, email: String): Int {
        val body = json.encodeToString(
            mapOf(
                "email" to email,
                "login" to login,
                "name" to login,
                "password" to UUID.randomUUID().toString()
            )
        )
        val response = httpRequest("$host/api/admin/users") { it.POST(BodyPublishers.ofString(body)) }
        return json.decodeFromString<IdResponse>(response.body()).id
    }

    fun lookupUser(login: String): GrafanaUserModel? {
        val response = httpRequest("$host/api/users/lookup?loginOrEmail=$login") { it.GET() }
        return if (response.statusCode() == 404) {
            null
        } else {
            json.decodeFromString<GrafanaUserModel>(response.body())
        }
    }

    fun deleteUser(userId: Int) {
        httpRequest("$host/api/admin/users/$userId") { it.DELETE() }
    }

    fun getUserOrgs(userId: Int): List<GrafanaOrgOverviewModelButWithOrgId> {
        val response = httpRequest("$host/api/users/$userId/orgs") { it.GET() }
        return json.decodeFromString(ListSerializer(GrafanaOrgOverviewModelButWithOrgId.serializer()), response.body())
    }

    fun addUserToOrg(login: String, orgId: Int, role: String) {
        val body = json.encodeToString(
            mapOf(
                "loginOrEmail" to login,
                "role" to role
            )
        )
        httpRequest("$host/api/orgs/$orgId/users") { it.POST(BodyPublishers.ofString(body)) }
    }

    fun removeUserFromOrg(userId: Int, orgId: Int) {
        httpRequest("$host/api/orgs/$orgId/users/$userId") { it.DELETE() }
    }

    fun updateUserRole(userId: Int, orgId: Int, role: String) {
        val body = json.encodeToString(
            mapOf(
                "role" to role,
            )
        )
        httpRequest("$host/api/orgs/$orgId/users/$userId") { it.method("PATCH", BodyPublishers.ofString(body))}
    }

    fun createOrg(name: String): Int {
        val body = json.encodeToString(
            mapOf(
                "name" to name
            )
        )
        val response = httpRequest("$host/api/orgs") { it.POST(BodyPublishers.ofString(body)) }
        return json.decodeFromString<OrgIdResponse>(response.body()).orgId
    }

    fun deleteOrg(id: Int) {
        httpRequest("$host/api/orgs/$id") { it.DELETE() }
    }

    fun lookupOrg(name: String): GrafanaOrgOverviewModel? {
        val sanitizedName = URLEncoder.encode(name, "utf-8")
        val response = httpRequest("$host/api/orgs/name/$sanitizedName") { it.GET() }
        return if (response.statusCode() == 404) {
            null
        } else {
            json.decodeFromString<GrafanaOrgOverviewModel>(response.body())
        }
    }

    fun lookupDatasource(orgId: Int, datasourceUid: String): GrafanaDatasourceModel? {
        val response = httpRequest("$host/api/datasources/uid/$datasourceUid", orgId) { it.GET() }
        return if (response.statusCode() == 404) {
            null
        } else {
            json.decodeFromString<GrafanaDatasourceModel>(response.body())
        }
    }

    fun createDatasource(orgId: Int, datasource: GrafanaDatasourceModel) {
        val body = json.encodeToString(datasource)
        httpRequest("$host/api/datasources", orgId) { it.POST(BodyPublishers.ofString(body)) }
    }

    fun updateDatasource(orgId: Int, datasource: GrafanaDatasourceModel) {
        val body = json.encodeToString(datasource)
        httpRequest("$host/api/datasources/uid/${datasource.uid}", orgId) { it.PUT(BodyPublishers.ofString(body)) }
    }

    fun allOrgs(): Sequence<GrafanaOrgOverviewModel> {
        return getPaginated("/api/orgs", 0, GrafanaOrgOverviewModel.serializer())
    }

    fun syncOrgsDatasources(orgs: Map<String, List<String>>) {
        val currentOrgs = getPaginated("/api/orgs", 0, GrafanaOrgOverviewModel.serializer()).toList()
        val desiredOrgNames = orgs.keys
        val currentOrgNames = currentOrgs.map { it.name }.toSet()
        val orgNameToId = orgs.filter { !currentOrgNames.contains(it.key) }.map {
            val orgId = createOrg(it.key)
            it.key to orgId
        }.toMutableList()
        currentOrgs.forEach {
            if (desiredOrgNames.contains(it.name)) {
                orgNameToId.add(it.name to it.id)
            } else {
                // don't delete main org
                if (it.id != 1) {
                    deleteOrg(it.id)
                }
            }
        }
        // update org datasources
        orgNameToId.forEach {
            syncOrgDatasource(it.second, orgs[it.first] ?: return@forEach)
        }
    }

    fun syncOrgDatasource(orgId: Int, projects: List<String>) {
        // get the prometheus datasource
        val existingPrometheusDatasource = lookupDatasource(orgId, "prometheus")
        val projectHeader = projects.distinct().sorted().joinToString("|")
        val desiredDatasource = GrafanaDatasourceModel(
            name = "Prometheus",
            type = "prometheus",
            uid = "prometheus",
            access = "proxy",
            url = "http://$PROMETHEUS_HOST/prometheus",
            jsonData = mapOf(
                "httpHeaderName1" to "X-Scope-OrgID",
                "httpHeaderValue1" to projectHeader // also store readable for future syncs
            ),
            secureJsonData = mapOf(
                "httpHeaderValue1" to projectHeader
            ),
            version = existingPrometheusDatasource?.let { it.version + 1 } ?: 1,
        )
        // if it exists, check if it needs to be updated
        if (existingPrometheusDatasource != null) {
            // ignore secure json data in the comparison
            if (desiredDatasource.copy(secureJsonData = mapOf()) != existingPrometheusDatasource.copy(secureJsonData = mapOf())) {
                updateDatasource(orgId, desiredDatasource)
            }
        } else {
            createDatasource(orgId, desiredDatasource)
        }
    }

    fun syncGrafanaUser(user: UserModel, desiredEditOrgNames: List<String>, desiredViewOrgNames: List<String>) {
        syncGrafanaUser(user.id, user.email, desiredEditOrgNames, desiredViewOrgNames)
    }

    fun syncGrafanaUser(username: String, email: String, desiredEditOrgNames: List<String>, desiredViewOrgNames: List<String>) {
        // lookup user by login (username)
        val existingUser = lookupUser(username)
        // if it doesn't exist, create it
        var userId = existingUser?.id ?: createUser(username, email)
        // if it exists with a different mail address, change it
        if (existingUser != null && existingUser.email != email) {
            // since this is an "external user" we need to delete and create
            deleteUser(existingUser.id)
            userId = createUser(username, email)
        }
        // get all orgs the user is currently part of
        val currentUserOrgs = getUserOrgs(userId)
        val currentUserOrgNames = currentUserOrgs.map { it.name }.toSet()
        val desiredEditOrgNamesSet = desiredEditOrgNames.toSet()
        val desiredViewOrgNamesSet = desiredViewOrgNames.toSet()
        // if there are orgs the user isn't supposed to be in, remove them
        currentUserOrgs.filter { !desiredEditOrgNamesSet.contains(it.name) && !desiredViewOrgNamesSet.contains(it.name)}.forEach {
            removeUserFromOrg(userId, it.orgId)
        }
        // if there are orgs the user is supposed to be in, add them
        desiredEditOrgNames.forEach { editOrgName ->
            if(currentUserOrgNames.contains(editOrgName)) {
                //find org
                val currentUserOrg = currentUserOrgs.find { it.name == editOrgName && it.role != "Editor" }
                if(currentUserOrg != null) {
                    updateUserRole(userId, currentUserOrg.orgId, "Editor")
                }
            } else {
                val org = lookupOrg(editOrgName) ?: return@forEach

                addUserToOrg(username, org.id, "Editor")
            }
        }

        desiredViewOrgNames.filter {!desiredEditOrgNames.contains(it)}.forEach{ viewOrgName ->
            if(currentUserOrgNames.contains(viewOrgName)) {
                //find org
                val currentUserOrg = currentUserOrgs.find { it.name == viewOrgName && it.role != "Viewer" }
                if(currentUserOrg != null) {
                    updateUserRole(userId, currentUserOrg.orgId, "Viewer")
                }
            } else {
                val org = lookupOrg(viewOrgName) ?: return@forEach

                addUserToOrg(username, org.id, "Viewer")
            }
        }
    }

}
