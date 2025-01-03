package net.teuto.udh

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ResourceModelTest {
    private fun <T : UdhResourceModel> checkRoundTrip(res: T, fromAttributes: (Map<String, List<String>>) -> T) {
        val values = res.path.toAttributes()
        val newRes = fromAttributes(values.mapValues { listOf(it.value) })
        assertEquals(res, newRes)
    }

    @Test
    fun roundTrip() {
        checkRoundTrip(UdhTenant("test"), UdhTenant::fromAttributes)
        checkRoundTrip(UdhGroup("test", "group"), UdhGroup::fromAttributes)
        checkRoundTrip(UdhVizGroup("test", "viz-group"), UdhVizGroup::fromAttributes)
        checkRoundTrip(UdhProject("test", "project"), UdhProject::fromAttributes)
        checkRoundTrip(UdhSensorCredential("test", "project", "credential"), UdhSensorCredential::fromAttributes)
    }

}