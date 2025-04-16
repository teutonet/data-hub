ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}maven:3.9.9-eclipse-temurin-21-alpine AS java-build

RUN mkdir /target

# cache dependencies
WORKDIR /project
COPY theme/pom.xml /project/
RUN mvn package ; rm -r target/

COPY theme /project/
RUN mvn package && cp target/*.jar /target

FROM gradle:8.13-alpine AS kotlin-build
WORKDIR /home/gradle/src
COPY --chown=gradle:gradle udh-sync/*.kts ./
RUN gradle --write-verification-metadata sha256 help -i
COPY --chown=gradle:gradle udh-sync ./
RUN gradle fatJar -i

FROM ${REGISTRY_MIRROR_LIB}busybox:1.37.0
COPY --from=java-build /target /providers
COPY --from=kotlin-build /home/gradle/src/build/libs/udh-sync-all.jar /providers
CMD cp /providers/* /target/
