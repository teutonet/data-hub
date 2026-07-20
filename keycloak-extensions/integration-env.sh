#!/bin/bash

set -eu -o pipefail

: "${IMAGE=datahub-kc-extensions-integration}"
: "${VOLUME=$IMAGE}"
: "${REALM=udh}"
: "${SKIP_IMAGE_BUILD=0}"

source "$(dirname "$BASH_SOURCE")/../test-env/versions.sh"

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
	-e KEYCLOAK_EXTRA_ARGS="--features=admin-fine-grained-authz:v2" \
	-e DH_EXTERNAL_RECONCILIATION=false \
	-v "$VOLUME:/opt/keycloak/providers/" \
	$IMAGE_KEYCLOAK start-dev --debug 5005 --features=admin-fine-grained-authz:v2
kc_container=${containers[-1]}

kcadm () {
	arg1=$1
	shift
	docker exec "$kc_container" /opt/keycloak/bin/kcadm.sh $arg1 --server http://localhost:8080 --realm master --{user,password}=admin "$@"
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

userProfile='
{
  "attributes": [
    {
      "name": "username",
      "displayName": "${username}",
      "permissions": {
        "edit": [
          "admin"
        ],
        "view": [
          "admin"
        ]
      },
      "validations": {
        "length": {
          "min": 3,
          "max": 255
        },
        "username-prohibited-characters": {},
        "up-username-not-idn-homograph": {}
      },
      "annotations": {},
      "group": null
    },
    {
      "name": "email",
      "displayName": "${email}",
      "required": {
        "roles": [
          "user"
        ]
      },
      "permissions": {
        "view": [
          "admin",
          "user"
        ],
        "edit": [
          "admin",
          "user"
        ]
      },
      "validations": {
        "email": {},
        "length": {
          "max": 255
        }
      }
    },
    {
      "name": "firstName",
      "displayName": "${firstName}",
      "permissions": {
        "view": [
          "admin"
        ],
        "edit": [
          "admin"
        ]
      },
      "validations": {
        "length": {
          "max": 255
        }
      }
    },
    {
      "name": "lastName",
      "displayName": "${lastName}",
      "permissions": {
        "view": [
          "admin"
        ],
        "edit": [
          "admin"
        ]
      },
      "validations": {
        "length": {
          "max": 255
        }
      }
    }
  ]
}
'

# TODO: create user with admin permissions on udh

until kcadm create realms -s realm=udh -s enabled=true -s adminPermissionsEnabled=true &&\
kcadm update realms/udh/users/profile -b="$userProfile" &&\
kcadm create users -r udh -s enabled=true -s email=test@test.de -s emailVerified=true -s username=admin &&\
kcadm add-roles -r udh --uusername admin --cclientid realm-management --rolename realm-admin &&\
kcadm set-password -r udh --username=admin --new-password=admin &&\
kcadm create clients -r udh -b "$config"
do
	sleep 1
done &

docker logs -f "$kc_container"
