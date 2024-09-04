package net.teuto.udh.sync;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.models.KeycloakSession;

import static net.teuto.udh.sync.ClojureBridge.onEvent;

public class UdhEventListener implements EventListenerProvider {

    private final KeycloakSession session;

    public UdhEventListener(KeycloakSession session) {
        this.session = session;
        ClojureBridge.init.invoke(session);
    }

    @Override
    public void onEvent(Event event) {
        onEvent.invoke(session, event);
    }

    @Override
    public void onEvent(AdminEvent event, boolean includeRepresentation) {
        onEvent.invoke(session, event, includeRepresentation);
    }

    @Override
    public void close() {
    }
}

