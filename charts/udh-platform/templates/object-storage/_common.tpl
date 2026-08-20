{{- define "udh.objectstore.spec" -}}
preservePoolsOnDelete: false
metadataPool:
  failureDomain: host
  replicated:
    size: 1 # backing volume is replicated
dataPool:
  failureDomain: host
  replicated:
    size: 1 # backing volume is replicated
gateway:
  port: 80
  {{- if .Values.global.trustCaSecretName }}
  {{- if .Values.objectStorage.reuseClusterFromNamespace }}
  caBundleRef: {{ printf "ns-%s-ca" .Release.Namespace | quote }}
  {{- else }}
  caBundleRef: {{ printf "%s-ca" .Values.fakeCa.name | quote }}
  {{- end }}
  {{- end }}
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      {{- if .Values.global.testDeployment }}
      cpu: 20m
      memory: 256Mi
      {{- else }}
      cpu: 1000m
      memory: 1Gi
      {{- end }}
  instances: {{ .Values.objectStorage.singleNode | ternary 1 2 }}
  priorityClassName: system-cluster-critical
{{- end -}}

{{- define "udh.objectstore.ingress.annotations" -}}
{{- include "udh.ingress.annotations" (dict "context" $ "annotations" .Values.objectStorage.ingress.annotations) }}
nginx.ingress.kubernetes.io/proxy-buffer-size: "16k"
nginx.ingress.kubernetes.io/enable-cors: "true"
nginx.ingress.kubernetes.io/cors-allow-headers: '*'
nginx.ingress.kubernetes.io/cors-expose-headers: '*'
# explicit because the default is true, which disallows '*' for headers
# see https://github.com/traefik/traefik/pull/13368
nginx.ingress.kubernetes.io/cors-allow-credentials: 'false'
nginx.ingress.kubernetes.io/cors-allow-origin: 'https://{{ include "sensor-ingestion.mdb.frontend.hostname" . }}'
{{- end -}}

{{- define "udh.objectstore.userSecret" -}}
{{- if .context.Values.objectStorage.reuseClusterFromNamespace -}}
rook-ceph-object-user-ns-{{ .context.Release.Namespace }}-{{ include "common.names.fullname" .context }}-{{ .user }}
{{- else -}}
rook-ceph-object-user-bucket-{{ include "common.names.fullname" .context }}-{{ .user }}
{{- end -}}
{{- end }}

{{- define "udh.objectstore.userEnv" -}}
- name: {{ .accessKey | default "AWS_ACCESS_KEY_ID" }}
  valueFrom:
    secretKeyRef:
      name: {{ include "udh.objectstore.userSecret" . | quote }}
      key: AccessKey
- name: {{ .secretKey | default "AWS_SECRET_ACCESS_KEY" }}
  valueFrom:
    secretKeyRef:
      name: {{ include "udh.objectstore.userSecret" . | quote }}
      key: SecretKey
{{- end }}
