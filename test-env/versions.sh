IMAGE_NODE=node:22.3.0-alpine
IMAGE_KEYCLOAK=keycloak/keycloak:26.6.1
# renovate: datasource=github-tags depName=fluxcd/flux2
FLUX_VERSION=v2.8.2
# renovate: datasource=github-tags depName=kubernetes/kubernetes
DEFAULT_KUBERNETES_VERSION=v1.35.0
# renovate: datasource=helm depName=cert-manager versioning=helm registryUrl=https://charts.jetstack.io
CERT_MANAGER_VERSION=v1.18.2
# renovate: datasource=helm depName=cloudnative-pg versioning=helm registryUrl=https://cloudnative-pg.io/charts
CNPG_VERSION=0.27.0
# renovate: datasource=github-tags depName=kubernetes-csi/csi-driver-host-path
HOSTPATH_VERSION=v1.17.0
# renovate: datasource=github-tags depName=kubernetes-csi/external-snapshotter
SNAPSHOTTER_VERSION=v8.3.0
# renovate: datasource=helm depName=rook-ceph versioning=helm registryUrl=https://charts.rook.io/release
ROOK_CEPH_VERSION=1.19.x
# renovate: datasource=github-tags depName=squidfunk/mkdocs-material
MKDOCS_VERSION=9.7.0
# renovate: datasource=helm depName=traefik versioning=helm registryUrl=https://traefik.github.io/charts
TRAEFIK_VERSION=41.0.2
