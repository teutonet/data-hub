{{- define "udh-platform.images.image" -}}
{{- $imageRootCopy := deepCopy .imageRoot -}}
{{- if not $imageRootCopy.tag -}}
{{- $imageRootCopy = set $imageRootCopy "tag" .global.udhImageTag -}}
{{- end -}}
{{- if not $imageRootCopy.registry -}}
{{- $imageRootCopy = set $imageRootCopy "registry" .global.udhImageRegistry -}}
{{- end -}}
{{- include "common.images.image" (dict "imageRoot" $imageRootCopy "global" .global) -}}
{{- end -}}

{{- define "udh-platform.images.keycloak.extensions" -}}
{{- include "udh-platform.images.image" (dict "imageRoot" .context.Values.keycloak.extensions.image "global" .context.Values.global) -}}
{{- end -}}

{{- define "udh-platform.imagePullSecrets" -}}
{{- $context := .context -}}
{{- $localImagePullSecrets := list -}}
{{- range $name := .context.Values.global.imageCredentials | keys -}}
{{- $localImagePullSecrets = append $localImagePullSecrets (include "common.secrets.name" (dict "defaultNameSuffix" (printf "pullsecret-%s" $name) "context" $context)) }}
{{- end -}}
{{- include "common.images.pullSecrets" (dict "images" (list .context.Values.keycloak.extensions.image (dict "pullSecrets" $localImagePullSecrets)) "global" .context.Values.global) -}}
{{- end -}}
