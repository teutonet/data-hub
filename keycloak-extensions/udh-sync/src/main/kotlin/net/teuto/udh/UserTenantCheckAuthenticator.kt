package net.teuto.udh

import jakarta.ws.rs.core.Response
import org.keycloak.authentication.AuthenticationFlowContext
import org.keycloak.authentication.AuthenticationFlowError
import org.keycloak.authentication.Authenticator
import org.keycloak.authentication.authenticators.access.DenyAccessAuthenticatorFactory
import org.keycloak.authorization.common.DefaultEvaluationContext
import org.keycloak.authorization.identity.UserModelIdentity
import org.keycloak.models.AuthenticatorConfigModel
import org.keycloak.models.KeycloakSession
import org.keycloak.models.RealmModel
import org.keycloak.models.UserModel

fun checkAccessOnTenant(
    ctx: AuthzContext,
    tenant: String,
): Boolean {
    return hasPermissionScopes(UdhTenant(tenant).path.getResource(ctx) ?: return false, listOf("tenant:view"), ctx, ctx.evaluationContext)
}

class UserTenantCheckAuthenticator : Authenticator {
    override fun authenticate(context: AuthenticationFlowContext) {
        LOGGER.info("user ${context.user?.email} attempting to authorize for ${context.authenticationSession?.client?.clientId}")
        val user = context.user
        if (user == null) {
            // this really shouldn't happen
            LOGGER.warn("user is null in UserTenantCheckAuthenticator")
            context.attempted()
            return
        }
        val tenant = context.authenticationSession.client.getAttribute("tenant")
        if (tenant == null) {
            LOGGER.warn("tenant is null in UserTenantCheckAuthenticator")
            context.attempted()
            return
        }
        val ctx = getAuthzContext(context.session, DefaultEvaluationContext(UserModelIdentity(context.realm, user), context.session), user)

        if (checkAccessOnTenant(ctx, tenant)) {
            context.success()
        } else {
            val errorMessage = "Sie haben nicht die nötigen Berechtigungen, um auf eine Anwendung dieses Mandanten zugreifen zu können"

            context.event.error(org.keycloak.events.Errors.ACCESS_DENIED)
            val challenge: Response? =
                context
                    .form()
                    .setError(errorMessage)
                    .createErrorPage(Response.Status.UNAUTHORIZED)
            context.failure(AuthenticationFlowError.ACCESS_DENIED, challenge)
        }
    }

    override fun action(context: AuthenticationFlowContext?) {}

    override fun requiresUser(): Boolean = false

    override fun configuredFor(
        session: KeycloakSession?,
        realm: RealmModel?,
        user: UserModel?,
    ): Boolean = false

    override fun setRequiredActions(
        session: KeycloakSession?,
        realm: RealmModel?,
        user: UserModel?,
    ) {}

    override fun close() {}
}
