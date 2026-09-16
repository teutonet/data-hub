{{- define "udh.gatewayapi.gateway" -}}
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: {{ printf "%s-%s" (include "common.names.fullname" .context) .name }}
  labels: {{- include "common.labels.standard" .context | nindent 4 }}
    app.kubernetes.io/component: {{ .name }}
  annotations: {{- .context.Values.global.gateway.annotations | toYaml | nindent 4 }}
spec:
  gatewayClassName: {{ .context.Values.global.gateway.className | quote }}
  listeners:
  - hostname: {{ .host }}
    name: http
    port: 8000
    protocol: HTTP
  - hostname: {{ .host }}
    name: https
    port: 8443
    protocol: HTTPS
    tls:
      certificateRefs:
      - group: ""
        kind: Secret
        name: {{ .host }}-tls
{{- end -}}

{{- define "udh.gatewayapi.https-redirect" -}}
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: {{ printf "%s-%s-http-redirect" (include "common.names.fullname" .context) .name }}
  labels: {{- include "common.labels.standard" .context | nindent 4 }}
    app.kubernetes.io/component: {{ .name }}
spec:
  hostnames:
  - {{ .host }}
  parentRefs:
  - name: {{ printf "%s-%s" (include "common.names.fullname" .context) .name }}
    sectionName: http
  rules:
  - filters:
    - requestRedirect:
        scheme: https
        statusCode: 301
      type: RequestRedirect
    matches:
    - path:
        type: PathPrefix
        value: /
{{- end -}}
