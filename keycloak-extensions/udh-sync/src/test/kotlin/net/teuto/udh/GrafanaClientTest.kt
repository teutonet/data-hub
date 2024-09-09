package net.teuto.udh

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.util.*

class GrafanaClientTest {

    private val client = getGrafanaClient()!!

    @Test
    fun syncOrgs() {
        val orgName = UUID.randomUUID().toString()
        val orgWithProjects = mapOf(
            orgName to listOf<String>()
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
                orgName to listOf("trainstation", "my-cool-project")
            )
        )
        val org = client.lookupOrg(orgName)!!
        assertEquals(
            client.lookupDatasource(org.id, "prometheus")!!.jsonData["httpHeaderValue1"],
            "my-cool-project|trainstation"
        )
        client.syncOrgsDatasources(
            mapOf(
                orgName to listOf("trainstation", "my-cool-project", "awesome")
            )
        )
        assertEquals(
            client.lookupDatasource(org.id, "prometheus")!!.jsonData["httpHeaderValue1"],
            "awesome|my-cool-project|trainstation"
        )
    }

    @Test
    fun syncUsers() {
        val orgName = UUID.randomUUID().toString()
        client.syncOrgsDatasources(
            mapOf(
                orgName to listOf()
            )
        )
        val username = UUID.randomUUID().toString()
        val email = "$username@example.com"
        val changedEmail = "$username@company.tld"
        assertNull(client.lookupUser(username))
        client.syncGrafanaUser(username, email, listOf())
        var user = client.lookupUser(username)!!
        assertEquals(email, user.email)
        assertArrayEquals(client.getUserOrgs(user.id).map { it.name }.toTypedArray(), arrayOf<String>())
        client.syncGrafanaUser(username, changedEmail, listOf())
        user = client.lookupUser(username)!!
        assertEquals(user.email, changedEmail)
        client.syncGrafanaUser(username, changedEmail, listOf(orgName))
        assertArrayEquals(client.getUserOrgs(user.id).map { it.name }.toTypedArray(), arrayOf(orgName))
        client.syncGrafanaUser(username, changedEmail, listOf())
        assertArrayEquals(client.getUserOrgs(user.id).map { it.name }.toTypedArray(), arrayOf())
        client.deleteUser(user.id)
        assertNull(client.lookupUser(username))
    }
}