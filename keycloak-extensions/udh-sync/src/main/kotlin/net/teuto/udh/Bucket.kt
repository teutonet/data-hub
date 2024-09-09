package net.teuto.udh

import org.keycloak.representations.IDToken

fun setClaimBuckets(ctx: AuthzContext, token: IDToken) {
    val buckets = getResourcesForUser(ctx, "project", mapOf(), listOf("bucket-write")).map {
        UdhProject.fromAttributes(it.attributes).flatName
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
