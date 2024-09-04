package net.teuto.data_hub.resource;

import org.keycloak.models.KeycloakSession;
import org.keycloak.services.resource.RealmResourceProvider;

public class DatahubResourceProvider implements RealmResourceProvider {

    private final KeycloakSession session;

    public DatahubResourceProvider(KeycloakSession session) {
        this.session = session;
    }

    @Override
    public Object getResource() {
        return new DatahubResource(session);
    }

    @Override
    public void close() {
    }

}
