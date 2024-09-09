ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}maven:3.9.4-eclipse-temurin-17-alpine AS java-build

RUN mkdir /target

# cache dependencies
WORKDIR /project
COPY theme/pom.xml /project/
RUN mvn package ; rm -r target/

COPY theme /project/
RUN mvn package && cp target/*.jar /target

FROM gradle:8.4-alpine AS kotlin-build
COPY --chown=gradle:gradle udh-sync /home/gradle/src
WORKDIR /home/gradle/src
RUN gradle fatJar

FROM ${REGISTRY_MIRROR_LIB}busybox:1.36.1
COPY --from=java-build /target /providers
COPY --from=kotlin-build /home/gradle/src/build/libs/udh-sync-all.jar /providers
CMD cp /providers/* /target/
