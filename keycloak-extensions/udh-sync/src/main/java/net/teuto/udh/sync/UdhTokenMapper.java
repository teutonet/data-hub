package net.teuto.udh.sync;

import org.keycloak.models.ClientSessionContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.ProtocolMapperModel;
import org.keycloak.models.UserSessionModel;
import org.keycloak.protocol.oidc.mappers.AbstractOIDCProtocolMapper;
import org.keycloak.protocol.oidc.mappers.OIDCAccessTokenMapper;
import org.keycloak.protocol.oidc.mappers.OIDCIDTokenMapper;
import org.keycloak.protocol.oidc.mappers.UserInfoTokenMapper;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.representations.IDToken;

import java.util.List;

import static java.util.Collections.emptyList;
import static net.teuto.udh.sync.ClojureBridge.setClaim;

public class UdhTokenMapper extends AbstractOIDCProtocolMapper implements OIDCAccessTokenMapper, OIDCIDTokenMapper, UserInfoTokenMapper {

    @Override
    protected void setClaim(IDToken token, ProtocolMapperModel mappingModel, UserSessionModel userSession, KeycloakSession keycloakSession, ClientSessionContext clientSessionCtx) {
        setClaim.invoke(token, mappingModel, userSession, keycloakSession, clientSessionCtx);
    }

    @Override
    public int getPriority() {
        return 50; // ensure our preferred_username is used
    }

    @Override
    public String getDisplayCategory() {
        return TOKEN_MAPPER_CATEGORY;
    }

    @Override
    public String getDisplayType() {
        return "UDH Sync / Mapper";
    }

    @Override
    public String getHelpText() {
        return "Ensures that the application user is configured properly before continuing with the login. " +
                "This is not a security feature but a convenience one that ensures new permissions are usable immediately." +
                "Also sets the appropriate claims for the application.";
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        return emptyList();
    }

    @Override
    public String getId() {
        return "udh-sync";
    }

}

