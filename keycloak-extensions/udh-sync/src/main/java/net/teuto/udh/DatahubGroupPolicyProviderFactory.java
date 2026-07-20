package net.teuto.udh;

import org.keycloak.Config.Scope;
import org.keycloak.authorization.AuthorizationProvider;
import org.keycloak.authorization.model.Policy;
import org.keycloak.authorization.policy.provider.PolicyProvider;
import org.keycloak.authorization.policy.provider.PolicyProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.representations.idm.authorization.PolicyRepresentation;


public class DatahubGroupPolicyProviderFactory implements PolicyProviderFactory<PolicyRepresentation> {


    @Override
    public String getName() {
        return "data-hub-group";
    }

    @Override
    public String getGroup() {
        return "data-hub-group";
    }

    @Override
    public PolicyProvider create(AuthorizationProvider authorization) {
        return new DatahubGroupPolicyProvider(authorization.getKeycloakSession());
    }

    @Override
    public PolicyRepresentation toRepresentation(Policy policy, AuthorizationProvider authorization) {
        return new PolicyRepresentation();
    }

    @Override
    public Class<PolicyRepresentation> getRepresentationType() {
        return PolicyRepresentation.class;
    }

    @Override
    public PolicyProvider create(KeycloakSession session) {
        return new DatahubGroupPolicyProvider(session);
    }

    @Override
    public void init(Scope config) {
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
    }

    @Override
    public void close() {
    }

    @Override
    public String getId() {
        return "data-hub-group";
    }
}
