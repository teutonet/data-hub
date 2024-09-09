#!/bin/bash

set -eu -o pipefail

: "${IMAGE=datahub-kc-extensions-integration}"
: "${VOLUME=$IMAGE}"
: "${REALM=udh}"
: "${SKIP_IMAGE_BUILD=0}"

if [[ $SKIP_IMAGE_BUILD -eq 0 ]]
then
  docker build -t "$IMAGE" "$(dirname "$0")"
fi

docker volume rm "$VOLUME" || true
docker run --rm -v "$VOLUME:/target" "$IMAGE"

cat <<.
#########################
# http://localhost:8080 #
# admin admin           #
#########################
.

containers=()
trap 'docker rm -f "${containers[@]}"' EXIT

run_container () {
	containers+=($(docker run -d --net host "$@"))
}

run_container -e ALLOW_EMPTY_PASSWORD=yes bitnami/postgresql
run_container \
	-eKEYCLOAK_ADMIN{,_PASSWORD}=admin \
	-e KEYCLOAK_DATABASE_HOST=localhost \
	-eKEYCLOAK_DATABASE_{USER,NAME}=postgres \
	-e KEYCLOAK_EXTRA_ARGS_PREPENDED="--debug 5005" \
	-e KEYCLOAK_EXTRA_ARGS="--features=admin-fine-grained-authz" \
	-e DH_EXTERNAL_RECONCILIATION=false \
	-v "$VOLUME:/opt/bitnami/keycloak/providers/" \
	bitnami/keycloak:"23.0.6"
kc_container=${containers[-1]}

kcadm () {
	arg1=$1
	shift
	docker exec "$kc_container" kcadm.sh $arg1 --server http://localhost:8080 --realm master --{user,password}=admin "$@"
}

config='
{
  "clientId": "data-hub",
  "secret": "secret",
  "authorizationServicesEnabled": true,
  "serviceAccountsEnabled": true,
  "directAccessGrantsEnabled": true,
  "protocolMappers": [
    {
      "name": "audience",
      "protocol": "openid-connect",
      "protocolMapper": "oidc-audience-mapper",
      "config": {
        "included.custom.audience": "data-hub",
        "access.token.claim": "true"
      }
    }
  ]
}'

until kcadm create clients -b "$config"
do
	sleep 1
done &

docker logs -f "$kc_container"
