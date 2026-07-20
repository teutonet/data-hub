package net.teuto.udh

import jakarta.ws.rs.BadRequestException
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

inline fun <reified T> decodeJson(str: String?): T {
    try {
        if (str != null) {
            return Json.decodeFromString<T>(str)
        } else {
            throw BadRequestException()
        }
    } catch (e: SerializationException) {
        throw BadRequestException()
    }
}

fun validateAttributeValue(v: String): String {
    if (v.codePoints().count() > 255) {
        throw BadRequestException("attribute value too long")
    }
    return v
}
