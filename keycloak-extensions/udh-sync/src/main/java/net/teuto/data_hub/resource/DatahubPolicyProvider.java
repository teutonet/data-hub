package net.teuto.data_hub.resource;

import org.keycloak.authorization.AuthorizationProvider;
import org.keycloak.authorization.policy.evaluation.Evaluation;
import org.keycloak.authorization.policy.provider.PolicyProvider;

import static net.teuto.udh.sync.ClojureBridge.evaluatePolicy;

public class DatahubPolicyProvider implements PolicyProvider {
    private final AuthorizationProvider authorization;

    public DatahubPolicyProvider(AuthorizationProvider authorization) {
        this.authorization = authorization;
    }

    @Override
    public void evaluate(Evaluation evaluation) {
        evaluatePolicy.invoke(evaluation);
    }

    @Override
    public void close() {
    }
}
