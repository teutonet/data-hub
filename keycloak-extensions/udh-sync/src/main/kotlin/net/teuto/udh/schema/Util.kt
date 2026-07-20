package net.teuto.udh.schema

import com.expediagroup.graphql.server.extensions.getFromContext
import graphql.schema.DataFetchingEnvironment
import jakarta.ws.rs.NotAuthorizedException
import net.teuto.udh.AuthzContext

fun DataFetchingEnvironment.getAuthzContextOrThrow(): AuthzContext =
    getFromContext<AuthzContext>() ?: throw NotAuthorizedException("unauthorized")
