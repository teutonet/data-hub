package net.teuto.udh

import org.keycloak.authorization.common.DefaultEvaluationContext
import org.keycloak.authorization.identity.UserModelIdentity
import org.keycloak.events.Event
import org.keycloak.events.EventListenerProvider
import org.keycloak.events.EventType
import org.keycloak.events.admin.AdminEvent
import org.keycloak.models.KeycloakSession
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.atomic.AtomicBoolean

val syncScheduled = AtomicBoolean(false)

const val LAST_LOGIN_TIME_ATTRIBUTE = "lastLoginTime"

class UdhEventListener(
    val session: KeycloakSession,
) : EventListenerProvider {
    override fun onEvent(event: Event?) {
        if (event != null) {
            if (event.type == EventType.CLIENT_LOGIN) {
                session
                    .users()
                    .getUserById(session.context.realm, event.userId)
                    ?.serviceAccountClientLink
                    ?.let {
                        session.context.realm.getClientById(it)
                    }?.setAttribute(
                        UdhSensorCredential.CLIENT_LAST_USED_AT_ATTRIBUTE,
                        OffsetDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME),
                    )
            } else if (event.type == EventType.LOGIN) {
                session.users().getUserById(session.context.realm, event.userId)?.setSingleAttribute(
                    LAST_LOGIN_TIME_ATTRIBUTE,
                    OffsetDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME),
                )
            }
        }
    }

    override fun onEvent(
        event: AdminEvent?,
        includeRepresentation: Boolean,
    ) {
    }

    override fun close() {
    }
}
