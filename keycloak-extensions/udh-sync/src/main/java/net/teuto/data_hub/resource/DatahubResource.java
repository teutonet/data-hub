package net.teuto.data_hub.resource;

import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Request;
import jakarta.ws.rs.core.UriInfo;
import org.keycloak.models.KeycloakSession;

import static net.teuto.udh.sync.ClojureBridge.handleApiRequest;

/**
 * Proxy resource forwarding everything into Clojure code.
 * This is not implemented in Clojure yet because IIRC
 * https://github.com/quarkusio/quarkus/blob/caaf33f1bf38df89306916c6d3dbf62b746a67ff/independent-projects/resteasy-reactive/server/runtime/src/main/java/org/jboss/resteasy/reactive/server/handlers/ResourceLocatorHandler.java#L57
 * failed since there was a Locator but there were zero targets.
 * (Also note L49-51 ;)
 */
public class DatahubResource {
    private final KeycloakSession session;

    public DatahubResource(KeycloakSession session) {
        this.session = session;
    }

    @GET
    @Path("{s:.*}")
    public Object get(@Context UriInfo uriInfo) {
        return handleRequest(uriInfo, "GET", null);
    }

    @POST
    @Path("{s:.*}")
    public Object post(String body, @Context UriInfo uriInfo) {
        return handleRequest(uriInfo, "POST", body);
    }

    @PUT
    @Path("{s:.*}")
    public Object put(String body, @Context UriInfo uriInfo) {
        return handleRequest(uriInfo, "PUT", body);
    }

    @DELETE
    @Path("{s:.*}")
    public Object delete(@Context UriInfo uriInfo) {
        return handleRequest(uriInfo, "DELETE", null);
    }

    private Object handleRequest(UriInfo uriInfo, String method, String body) {
        return handleApiRequest.invoke(session, uriInfo, method, body);
    }
}
