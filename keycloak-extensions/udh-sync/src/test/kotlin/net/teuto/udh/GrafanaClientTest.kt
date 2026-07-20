package net.teuto.udh

import kotlinx.serialization.json.JsonPrimitive
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.util.*

class GrafanaClientTest {
    private val client = getGrafanaClient()!!

    @Test
    fun syncOrgs() {
        val orgName = UUID.randomUUID().toString()
        val orgWithProjects =
            mapOf(
                orgName to listOf<String>(),
            )
        client.syncOrgsDatasources(orgWithProjects)
        assertNotNull(client.lookupOrg(orgName))
        client.syncOrgsDatasources(orgWithProjects)
        assertNotNull(client.lookupOrg(orgName))
        client.syncOrgsDatasources(mapOf())
        assertNull(client.lookupOrg(orgName))
    }

    @Test
    fun syncDatasource() {
        val orgName = UUID.randomUUID().toString()
        client.syncOrgsDatasources(
            mapOf(
                orgName to listOf("trainstation", "my-cool-project"),
            ),
        )
        val org = client.lookupOrg(orgName)!!
        assertEquals(
            client.lookupDatasource(org.id, "prometheus")!!.jsonData["httpHeaderValue1"],
            JsonPrimitive("my-cool-project|trainstation"),
        )
        client.syncOrgsDatasources(
            mapOf(
                orgName to listOf("trainstation", "my-cool-project", "awesome"),
            ),
        )
        assertEquals(
            client.lookupDatasource(org.id, "prometheus")!!.jsonData["httpHeaderValue1"],
            JsonPrimitive("awesome|my-cool-project|trainstation"),
        )
    }
}
