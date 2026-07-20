#!/bin/bash

source "$(dirname "$BASH_SOURCE")/../test-env/.common"

export KEYCLOAK_ADMIN_PASSWORD="`$KUBECTL get secret -n udh local-udh-platform-sso-keycloak -o jsonpath='{.data.admin-password}' | base64 -d`"
export DATA_HUB_ADMIN_PASSWORD="`helm get values -n udh local -o json | jq -r '.keycloak.testUsers."data-hub-admin".password'`"
export SMTP_PASSWORD="`helm get values -n udh local -o json | jq -r '.mailpit.auth.users.admin'`"

export NODE_EXTRA_CA_CERTS="$(dirname "$BASH_SOURCE")/../doc/local-ca.crt"

exec npx playwright test --reporter=html $@
