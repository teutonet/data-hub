package net.teuto.udh;

import org.keycloak.Config;
import org.keycloak.authorization.AuthorizationProvider;
import org.keycloak.authorization.model.Policy;
import org.keycloak.authorization.policy.provider.PolicyProvider;
import org.keycloak.authorization.policy.provider.PolicyProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.representations.idm.authorization.PolicyRepresentation;

import static net.teuto.udh.UdhResourceManagerKt.DATA_HUB_RESOURCE_POLICY;

public class DatahubResourcePolicyProviderFactory implements PolicyProviderFactory<DatahubResourcePolicyRepresentation> {

    private final DatahubResourcePolicyProvider provider = new DatahubResourcePolicyProvider(this::toRepresentation);

    @Override
    public String getName() {
        return DATA_HUB_RESOURCE_POLICY;
    }

    @Override
    public String getGroup() {
        return DATA_HUB_RESOURCE_POLICY;
    }

    @Override
    public String getId() {
        return DATA_HUB_RESOURCE_POLICY;
    }

    @Override
    public PolicyProvider create(AuthorizationProvider authorizationProvider) {
        return provider;
    }

    @Override
    public PolicyProvider create(KeycloakSession keycloakSession) {
        return provider;
    }

    @Override
    public DatahubResourcePolicyRepresentation toRepresentation(Policy policy, AuthorizationProvider authorizationProvider) {
        return new DatahubResourcePolicyRepresentation(getResource(policy));
    }

    @Override
    public Class<DatahubResourcePolicyRepresentation> getRepresentationType() {
        return DatahubResourcePolicyRepresentation.class;
    }

    @Override
    public void init(Config.Scope scope) {
    }

    @Override
    public void postInit(KeycloakSessionFactory keycloakSessionFactory) {
    }

    @Override
    public void close() {
    }

    @Override
    public void onCreate(Policy policy, DatahubResourcePolicyRepresentation representation, AuthorizationProvider authorization) {
        setResource(policy, representation.getResourcePrincipal());
    }

    @Override
    public void onUpdate(Policy policy, DatahubResourcePolicyRepresentation representation, AuthorizationProvider authorization) {
        setResource(policy, representation.getResourcePrincipal());
    }

    private String getResource(Policy policy) {
        return policy.getConfig().get(DATA_HUB_RESOURCE_POLICY);
    }

    private void setResource(Policy policy, String resource) {
        policy.putConfig(DATA_HUB_RESOURCE_POLICY, resource);
    }
}
