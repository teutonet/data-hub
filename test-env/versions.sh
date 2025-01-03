IMAGE_NODE=node:22.3.0-alpine
IMAGE_KEYCLOAK=bitnami/keycloak:26.0.7
# renovate: datasource=github-tags depName=fluxcd/flux2
FLUX_VERSION=v2.4.0
# renovate: datasource=helm depName=cert-manager versioning=helm registryUrl=https://charts.jetstack.io
CERT_MANAGER_VERSION=v1.16.2
# renovate: datasource=helm depName=postgres-operator versioning=helm registryUrl=https://opensource.zalando.com/postgres-operator/charts/postgres-operator
POSTGRES_OPERATOR_VERSION=1.14.0
