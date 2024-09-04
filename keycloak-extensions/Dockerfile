ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}maven:3.9.4-eclipse-temurin-17-alpine AS build

# cache dependencies
WORKDIR /project
COPY udh-sync/pom.xml /project/
RUN mvn package ; rm -r target/

COPY . /project
RUN /project/build.sh

FROM ${REGISTRY_MIRROR_LIB}busybox:1.36.1
COPY --from=build /target /providers
COPY --from=build /keycloak-version /
CMD cp /providers/* /target/ && cat /keycloak-version
