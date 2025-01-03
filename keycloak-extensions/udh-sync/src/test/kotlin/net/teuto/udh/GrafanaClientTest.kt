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
        client.syncGrafanaUser(username, email, listOf(), listOf())
        // user exists and is in no orgs
        var user = client.lookupUser(username)!!
        assertEquals(email, user.email)
        assertArrayEquals(client.getUserOrgs(user.id).map { it.name }.toTypedArray(), arrayOf<String>())
        // email has changed
        client.syncGrafanaUser(username, changedEmail, listOf(), listOf())
        user = client.lookupUser(username)!!
        assertEquals(user.email, changedEmail)
        // user has Editor role for orgName
        client.syncGrafanaUser(username, changedEmail, listOf(orgName), listOf())
        var userOrgs = client.getUserOrgs(user.id)
        assertArrayEquals(userOrgs.map { it.name }.toTypedArray(), arrayOf(orgName))
        assertEquals(1, userOrgs.filter { it.role == "Editor" }.size)
        // remove orgs
        client.syncGrafanaUser(username, changedEmail, listOf(), listOf())
        userOrgs = client.getUserOrgs(user.id)
        assertArrayEquals(userOrgs.map { it.name }.toTypedArray(), arrayOf())
        // give editor role first, then change to viewer
        client.syncGrafanaUser(username, changedEmail, listOf(orgName), listOf())
        userOrgs = client.getUserOrgs(user.id)
        assertEquals(1, userOrgs.filter { it.role == "Editor" }.size)
        client.syncGrafanaUser(username, changedEmail, listOf(), listOf(orgName))
        userOrgs = client.getUserOrgs(user.id)
        assertEquals(0, userOrgs.filter { it.role == "Editor" }.size)
        assertEquals(1, userOrgs.filter { it.role == "Viewer" }.size)
        // remove roles again
        client.syncGrafanaUser(username, changedEmail, listOf(), listOf())
        userOrgs = client.getUserOrgs(user.id)
        assertArrayEquals(userOrgs.map { it.name }.toTypedArray(), arrayOf())
        // add both editor and viewer for same org, should only get Editor
        client.syncGrafanaUser(username, changedEmail, listOf(orgName), listOf(orgName))
        userOrgs = client.getUserOrgs(user.id)
        assertEquals(1, userOrgs.filter { it.role == "Editor" }.size)
        assertEquals(0, userOrgs.filter { it.role == "Viewer" }.size)

        client.deleteUser(user.id)
        assertNull(client.lookupUser(username))
    }
}