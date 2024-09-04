{{- define "data-hub.name" -}}
{{- $name := .name | required "name is required" -}}
{{- printf "%s-%s" (include "common.names.fullname" .context) $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "udh.secret" -}}
{{ (get ((lookup "v1" "Secret" $.Release.Namespace (printf "%s-%s" (include "common.names.fullname" $) .name)).data | default dict) .name) | b64dec | default (randAlphaNum 32) }}
{{- end -}}

{{- define "udh.secretManifest" -}}
---
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: {{ printf "%s-%s" (include "common.names.fullname" $) .name | quote }}
data:
  {{ .name }}: {{ .value | b64enc | quote }}
{{- end -}}

{{- define "udh.ingress.annotations" -}}
{{ merge .context.Values.global.ingress.annotations .annotations | toYaml }}
{{- end -}}

{{- define "udh.babashkaContainer" -}}
name: babashka
image: {{ include "common.images.image" (dict "imageRoot" .context.Values.global.babashka.image "global" .context.Values.global) }}
imagePullPolicy: {{ .context.Values.global.babashka.image.pullPolicy }}
command:
  - bb
  - | {{- .context.Files.Get "udh-sync-common.clj" | nindent 6 }}
      {{- if .extraDependencies -}}
      {{- range $d := .extraDependencies -}}
      {{- $.context.Files.Get $d | nindent 6 }}
      {{ end }}
      {{ end }}
      {{- .context.Files.Get .script | nindent 6 }}
  {{- if .args -}}
  {{- .args | toYaml | nindent 2 }}
  {{ end }}
env:
  {{- include (print "udh.babashkaContainer.env-" .script) (dict "context" .context) | nindent 2 }}
  - name: INSECURE_SSL_SKIP_VERIFY
    value: {{ .context.Values.global.sslInsecureSkipVerify | quote }}
resources:
  requests:
    memory: 32Mi
    cpu: 50m
  limits:
    memory: 128Mi
{{- end -}}

{{- define "udh.objectstore.storageclass" -}}
{{ .Release.Namespace}}-{{ .Release.Name }}-bucket
{{- end -}}

{{- define "sensor-ingestion.targets" -}}
{{- $targets := (list) -}}
{{- range $target := .targets -}}
{{- $t := "" -}}
{{- if contains "/" $target -}}
{{- $t = $target -}}
{{- else -}}
{{- $t = printf "http://%s-%s/api/v1/write" (include "common.names.fullname" $.context) $target -}}
{{- end -}}
{{- $targets = append $targets $t -}}
{{- end -}}
{{- $targets | toJson -}}
{{- end -}}

{{- define "sensor-ingestion.ingress.annotations" -}}
{{ merge .context.Values.global.ingress.annotations .annotations | toYaml }}
{{- end -}}

{{- define "sensor-ingestion.standard.probes" -}}
livenessProbe:
  httpGet:
    path: /livez
    port: api
readinessProbe:
  httpGet:
    path: /readyz
    port: api
{{- end -}}

{{- define "sensor-ingestion.secretValue" -}}
valueFrom:
  secretKeyRef:
    name: {{ tpl .secret.secret (merge (dict "kebab" (kebabcase .name)) .context) | quote }}
    key: {{ .secret.key | quote }}
{{- end -}}

{{- define "sensor-ingestion.securityContext" -}}
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault
{{- end -}}

{{- define "sensor-ingestion.standard.image" -}}
image: {{ include "udh-platform.images.image" (dict "imageRoot" .image "global" .context.Values.global) }}
{{- if .image.pullPolicy }}
imagePullPolicy: {{ .image.pullPolicy }}
{{- end }}
{{- end -}}

{{- define "sensor-ingestion.standard.networkLabels" -}}
network-release-name: {{ .Release.Name | quote }}
{{ range $label := .networkLabels -}}
network-{{ $label }}: "true"
{{ end -}}
{{- end -}}

{{- define "sensor-ingestion.standard.podTemplate" -}}
{{- $kebab := kebabcase .name -}}
{{- $image := dig .name "image" (dict) .Values.sensorIngestion -}}
metadata:
  labels: {{- include "common.labels.standard" . | nindent 4 }}
    app.kubernetes.io/component: {{ $kebab }}
    {{- include "sensor-ingestion.standard.networkLabels" . | nindent 4 }}
spec:
  {{- include "sensor-ingestion.securityContext" . | nindent 2 }}
  {{- include "common.images.pullSecrets" (dict "images" (list $image) "global" .Values.global) | indent 2 | trimAll " " }}
  containers:
  - name: {{ $kebab }}
    {{- include "sensor-ingestion.standard.image" (dict "image" $image "context" .) | nindent 4 }}
    {{- if (dig "http" true .) }}
    ports:
    - containerPort: 8091
      name: api
    {{- end }}
    env:
      - name: LOGLEVEL
        value: {{ dig .name "loglevel" .Values.global.loglevel .Values.AsMap | quote }}
      {{- if dig "sensorIngestion" .name "targets" false .Values.AsMap }}
      - name: TARGETS
        value: {{ include "sensor-ingestion.targets" (dict "targets" (dig "sensorIngestion" .name "targets" (list) .Values.AsMap) "context" .) | quote }}
      {{- end }}
      - name: AUTH_ISSUER
        value: {{ .Values.global.auth.issuer | quote }}
      - name: AUTH_TOKEN_PATH
        value: {{ .Values.global.auth.tokenPath | quote }}
      - name: AUTH_READY_PATH
        value: {{ .Values.global.auth.readyPath | quote }}
      {{- if dig .name "auth" false .Values.AsMap }}
      - name: AUTH_CLIENT
        value: {{ dig .name "auth" "client" "" .Values.AsMap | quote }}
      - name: AUTH_CLIENT_SECRET
        {{- include "sensor-ingestion.secretValue" (dict "name" .name "secret" (dig .name "auth" "clientSecret" (dict) .Values.AsMap) "context" .) | nindent 8 }}
      {{- end }}
      {{- if dig .name "apiKey" false .Values.AsMap }}
      - name: {{ print (regexFind "[a-z]+" .name | upper) "_API_KEY" }}
        {{- include "sensor-ingestion.secretValue" (dict "name" .name "secret" (dig .name "apiKey" (dict) .Values.AsMap) "context" .) | nindent 8 }}
      {{- end }}
      {{- if .Values.fakeCa.name }}
      - name: TRUST_LOCAL_CA_PATH
        value: /tls/ca.crt
      {{- end }}
      {{- include (printf "sensor-ingestion.%s.env" .name) . | trim | nindent 6 }}
    resources: {{- (dig .name "resources" (dict) .Values.AsMap) | toYaml | nindent 6 }}
    {{- if .Values.fakeCa.name }}
    volumeMounts:
      - mountPath: /tls
        readOnly: true
        name: ca-cert
    {{- end }}
    {{- if (dig "http" true .) }}
    {{- include "sensor-ingestion.standard.probes" . | nindent 4 }}
    {{ end -}}
{{- end -}}

{{- define "sensor-ingestion.standard.cronJob" -}}
{{- if (dig .name "enabled" false .Values.AsMap) -}}
{{- $kebab := kebabcase .name -}}
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: {{ printf "%s-%s" (include "common.names.fullname" .) $kebab | quote }}
  labels: {{- include "common.labels.standard" . | nindent 4 }}
    app.kubernetes.io/component: {{ $kebab }}
spec:
  schedule: {{ (dig .name "schedule" "0 * * * *" .Values.AsMap) | quote }}
  jobTemplate:
    metadata:
      labels: {{- include "common.labels.standard" . | nindent 8 }}
        app.kubernetes.io/component: {{ $kebab }}
    spec:
      ttlSecondsAfterFinished: 60
      template: {{- include "sensor-ingestion.standard.podTemplate" (merge (dict "http" false) .) | nindent 8 }}
          restartPolicy: OnFailure
      
          {{- if .Values.fakeCa.name }}
          volumes:
            - name: ca-cert
              secret:
                defaultMode: 0640
                secretName: {{ .Values.fakeCa.name }}
                items:
                  - key: ca.crt
                    path: ca.crt
          {{- end }}
{{- end -}}
{{- end -}}

{{- define "sensor-ingestion.standard.deployment" -}}
{{- if (dig "sensorIngestion" .name "enabled" false .Values.AsMap) -}}
{{- $kebab := kebabcase .name -}}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ printf "%s-%s" (include "common.names.fullname" .) $kebab | quote }}
  labels: {{- include "common.labels.standard" . | nindent 4 }}
    app.kubernetes.io/component: {{ $kebab }}
spec:
  replicas: {{ dig .name "replicas" 1 .Values.AsMap }}
  selector:
    matchLabels: {{- include "common.labels.matchLabels" . | nindent 6 }}
      app.kubernetes.io/component: {{ $kebab }}
  template: {{- include "sensor-ingestion.standard.podTemplate" . | nindent 4 }}
      {{- if .Values.fakeCa.name }}
      volumes:
        - name: ca-cert
          secret:
            defaultMode: 0640
            secretName: {{ .Values.fakeCa.name }}
            items:
              - key: ca.crt
                path: ca.crt
      {{- end }}
{{- end }}
{{ include "sensor-ingestion.standard.pdb" . }}
{{- end -}}

{{- define "sensor-ingestion.standard.service" -}}
{{- if (dig "sensorIngestion" .name "enabled" false .Values.AsMap) -}}
{{- $kebab := kebabcase .name -}}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ printf "%s-%s" (include "common.names.fullname" .) $kebab | quote }}
  labels: {{- include "common.labels.standard" . | nindent 4 }}
    app.kubernetes.io/component: {{ $kebab }}
spec:
  selector: {{- include "common.labels.matchLabels" . | nindent 4 }}
    app.kubernetes.io/component: {{ $kebab }}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8091
{{- end -}}
{{- end -}}

{{- define "sensor-ingestion.standard.serviceDeployment" -}}
{{ include "sensor-ingestion.standard.deployment" . }}
{{ include "sensor-ingestion.standard.service" . }}
{{- end -}}

{{- define "sensor-ingestion.standard.pdb" -}}
{{- if and .Values.global.pdb (dig .name "enabled" false .Values.AsMap) -}}
{{- $kebab := kebabcase .name -}}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ printf "%s-%s" (include "common.names.fullname" .) $kebab | quote }}
spec:
  minAvailable: 1
  selector:
    matchLabels: {{- include "common.labels.matchLabels" . | nindent 6 }}
      {{- if .component }}
      app.kubernetes.io/component: {{ .component }}
      app.kubernetes.io/part-of: {{ $kebab }}
      {{- else }}
      app.kubernetes.io/component: {{ $kebab }}
      {{- end -}}
{{- end -}}
{{- end -}}

{{- define "sensor-ingestion.standard.networkPolicy" }}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ printf "%s-%s-out" (include "common.names.fullname" .) .name | quote }}
spec:
  podSelector:
    matchLabels:
      network-release-name: {{ .Release.Name | quote }}
      {{- .src | toYaml | nindent 6 }}
  policyTypes:
    - Egress
  egress:
    - to:
      - podSelector:
          matchLabels:
            network-release-name: {{ .Release.Name | quote }}
            {{- .dst | toYaml | nindent 12 }}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ printf "%s-%s-in" (include "common.names.fullname" .) .name | quote }}
spec:
  podSelector:
    matchLabels:
      network-release-name: {{ .Release.Name | quote }}
      {{- .dst | toYaml | nindent 6 }}
  policyTypes:
    - Ingress
  ingress:
    - from:
      - podSelector:
          matchLabels:
            network-release-name: {{ .Release.Name | quote }}
            {{- .src | toYaml | nindent 12 }}
{{ end -}}
