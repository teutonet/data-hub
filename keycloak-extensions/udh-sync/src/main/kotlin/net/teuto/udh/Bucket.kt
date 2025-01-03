package net.teuto.udh

import org.keycloak.representations.IDToken

fun setClaimBuckets(ctx: AuthzContext, token: IDToken) {
    val buckets = getResourcesForUser(ctx, PROJECTS_TYPE, mapOf(), listOf("bucket-write")).map {
        it.getResourceModel().flatName
    }
    token.setOtherClaims(
        "https://aws.amazon.com/tags", listOf(
            mapOf(
                "principal_tags" to mapOf(
                    "bucket" to buckets
                )
            )
        )
    )
}
