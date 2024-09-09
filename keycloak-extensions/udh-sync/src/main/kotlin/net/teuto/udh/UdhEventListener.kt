package net.teuto.udh

import org.keycloak.authorization.common.DefaultEvaluationContext
import org.keycloak.authorization.common.UserModelIdentity
import org.keycloak.events.Event
import org.keycloak.events.EventListenerProvider
import org.keycloak.events.admin.AdminEvent
import org.keycloak.models.KeycloakSession
import org.keycloak.services.scheduled.ClusterAwareScheduledTaskRunner
import org.keycloak.timer.TimerProvider
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

val syncScheduled = AtomicBoolean(false)

class UdhEventListener(val session: KeycloakSession) : EventListenerProvider {
    init {
        // Sets up the periodic reconciliation
        val udhRealm = session.realms().getRealmByName("udh")
        if (udhRealm != null) {
            if (!syncScheduled.getAndSet(true)) {
                val triggerInterval = TimeUnit.DAYS.toMillis(1)
                session.getProvider(TimerProvider::class.java)
                    .schedule(ClusterAwareScheduledTaskRunner(session.keycloakSessionFactory, { runSession ->
                        run {
                            runSession.context.realm = udhRealm
                            syncAllGrafana(runSession)
                        }
                    }, triggerInterval), triggerInterval, "udh-sync-daily")
            }
        }
    }

    override fun onEvent(event: Event?) {}

    override fun onEvent(event: AdminEvent?, includeRepresentation: Boolean) {
        if (event != null) {
            val resType = event.resourceTypeAsString
            if (resType == "USER" || resType == "GROUP_MEMBERSHIP") {
                val path = event.resourcePath?.split("/")
                if (path?.firstOrNull() == "users") {
                    val user = session.users().getUserById(session.context.realm, path[1])
                    if (user != null) {
                        val ctx = getAuthzContext(
                            session,
                            DefaultEvaluationContext(UserModelIdentity(session.context.realm, user), session),
                            user
                        )
                        getGrafanaClient()?.let { syncGrafanaUser(ctx, user, it) }
                    }
                }
            }
        }
    }

    override fun close() {

    }
}
