#!/bin/bash

source "$(dirname "$BASH_SOURCE")/../test-env/.common"

export KEYCLOAK_ADMIN_PASSWORD="`$KUBECTL get secret -n udh local-udh-platform-sso-keycloak -o jsonpath='{.data.admin-password}' | base64 -d`"
export DATA_HUB_ADMIN_PASSWORD="`helm get values -n udh local -o json | jq -r '.keycloak.testUsers."data-hub-admin".password'`"

exec npx playwright test --reporter=html --grep-invert=@delete-tenants $@
