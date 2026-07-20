{{- define "udh.migrations.repair" -}}
name: {{ .name }}
image: {{ include "common.images.image" (dict "imageRoot" .context.Values.global.basePipeline.image "global" .context.Values.global) }}
command:
  - bash
  - -ce
  - |
    set -eu -o pipefail
    curl_ca () {
      curl -sSf {{ if .context.Values.global.trustCaSecretName }}--cacert /tls/ca.crt{{ end }} "$@"
    }

    token=$(curl_ca -u "$CLIENT_ID:$CLIENT_SECRET" "$KEYCLOAK_REALM_URL/protocol/openid-connect/token" -d grant_type=client_credentials | jq -r .access_token)
    curl_ca --oauth2-bearer "$token" -X POST "$KEYCLOAK_REALM_URL/data-hub/{{ .path }}"
env:
  - name: KEYCLOAK_REALM_URL
    value: {{ include "udh.keycloak.realmUrl" .context }}
  - &clientId
    name: CLIENT_ID
    value: auto-provisioning
  - &clientSecret
    name: CLIENT_SECRET
    valueFrom:
      secretKeyRef:
        name: {{ printf "%s-auto-provisioning-client-secret" (include "common.names.fullname" .context) | quote }}
        key: auto-provisioning-client-secret
{{- if .context.Values.global.trustCaSecretName }}
volumeMounts:
  - mountPath: /tls
    name: ca-cert
{{- end }}
{{- end }}
