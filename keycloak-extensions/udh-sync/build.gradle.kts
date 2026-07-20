plugins {
    kotlin("jvm") version "2.4.0"
    kotlin("plugin.serialization") version "2.4.0"
}
val keycloakVersion = "26.7.0"

repositories {
    mavenCentral()
}

dependencies {
    compileOnly("org.keycloak:keycloak-core:$keycloakVersion")
    testImplementation("org.keycloak:keycloak-core:$keycloakVersion")
    compileOnly("org.keycloak:keycloak-services:$keycloakVersion")
    testImplementation("org.keycloak:keycloak-services:$keycloakVersion")
    compileOnly("org.keycloak:keycloak-server-spi:$keycloakVersion")
    compileOnly("org.keycloak:keycloak-server-spi-private:$keycloakVersion")
    compileOnly("org.keycloak:keycloak-model-jpa:$keycloakVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")
    implementation("io.github.reactivecircus.cache4k:cache4k:0.14.0")
    testImplementation("org.jetbrains.kotlin:kotlin-test")
    implementation("aws.sdk.kotlin:s3:1.8.4")
    implementation("aws.sdk.kotlin:iam:1.8.4")

    implementation("com.expediagroup:graphql-kotlin-schema-generator:10.1.2")
    implementation("com.expediagroup:graphql-kotlin-server:10.1.2")
}

tasks.test {
    useJUnitPlatform()
}
kotlin {
    jvmToolchain(21)
}

tasks.register<Jar>("fatJar") {
    group = "build"
    description = "Creates a self contained fat JAR"
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
    val dependencies = configurations.runtimeClasspath.get().map(::zipTree)
    from(dependencies)
    archiveAppendix = "all"
    with(tasks.jar.get())
}
