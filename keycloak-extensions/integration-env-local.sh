#!/bin/bash

cd "$(readlink -f "$(dirname "$BASH_SOURCE")")"

(cd udh-sync && gradle fatJar)
(cd theme && mvn package)

image=localhost:5000/keycloak-extensions
docker build -t "$image" . --file Dockerfile.local

exec env IMAGE=$image VOLUME=datahub-kc-extensions-integration SKIP_IMAGE_BUILD=1 ./integration-env.sh
