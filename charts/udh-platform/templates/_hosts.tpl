{{- define "data-hub.grafana.hostname" -}}
dashboard.{{ .Values.global.baseDomain }}
{{- end -}}

{{- define "data-hub.keycloak.hostname" -}}
login.{{ .Values.global.baseDomain }}
{{- end -}}

{{- define "data-hub.jupyterhub.hostname" -}}
jupyterhub.{{ .Values.global.baseDomain }}
{{- end -}}

{{- define "sensor-ingestion.mdb.frontend.hostname" -}}
mdb-frontend.{{ .Values.global.baseDomain }}
{{- end -}}

{{- define "sensor-ingestion.mdb.postgraphile.hostname" -}}
mdb.{{ .Values.global.baseDomain }}
{{- end -}}