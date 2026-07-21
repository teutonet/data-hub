# Installationsanleitung

Am einfachsten ist es, den teuto DataHub lokal in einer Minikube-Umgebung zu starten, die Anleitung dafür findet sich in der [Dokumentation zum Mitwirken](https://github.com/teutonet/data-hub/blob/main/CONTRIBUTING.md#dependencies).

Für das Deployment auf einem normalen Kubernetes Cluster werden folgende Tools benötigt:

- kubectl
- helm

## Anforderungen an den Kubernetes Cluster

Es müssen folgende Operatoren im Kubernetes Cluster installiert sein:

- [Cert Manager](https://cert-manager.io/)
- [Cloudnative Postgres](https://cloudnative-pg.io/)
- [Flux](https://fluxoperator.dev/)
- [Rook-Ceph](https://rook.io/)
- [Traefik Ingress](https://doc.traefik.io/traefik/getting-started/)
  - Folgende Optionen müssen aktiviert sein: `providers.kubernetesIngressNGINX.enabled=true` und `providers.kubernetesIngressNGINX.watchIngressWithoutClass=true`

## Bauen der Docker-Images

Alle Docker-Images dieses Projektes müssen gebaut und anschließend in eine Registry geschoben werden, auf die aus dem Kubernetes Cluster zugegriffen werden kann.

Der Registry Login mit `docker login <registry>` muss bereits erfolgt sein.

Mit folgenden Befehlen in Bash werden die Images gebaut und gepusht, außerdem wird die `$image_opts` Variable für den nächsten Schritt gesetzt.

```bash
shopt -s globstar
REGISTRY=<your registry here, eg. ghcr.io or docker.io>
REPOSITORY=<base path for images in the registry, eg. username/data-hub>
TAG=<your tag eg. v1.0.0>
image_opts=""
valuePath () {
  # kebab to camel case with support for at least the abbreviation ...DB, `/` becomes `.`
  sed 's/-\([a-zA-Z]\([a-zA-Z]\($\|[^a-zA-Z]\)\)\?\)/\U\1/g;s/\//./g' <<<$1
}
for dockerfile in **/Dockerfile
do
    context=`dirname $dockerfile`
    image=$REGISTRY/$REPOSITORY/$context:$TAG
    tar chC $context --exclude-vcs{,-ignores} . | docker build -t $image -
    docker push "$image"
    image_value_path="`valuePath $context`"
    if [[ "$image_value_path" == "keycloakExtensions" ]]
    then
        image_value_path="keycloak.extensions"
    fi
    image_opts="$image_opts --set $image_value_path.image.repository=$REPOSITORY/$context"
    image_opts="$image_opts --set $image_value_path.image.tag=$TAG"
    image_opts="$image_opts --set $image_value_path.image.registry=$REGISTRY"
done
```

## Konfigurieren

Zum Konfigurieren der Helm Values sollte eine Konfigurationsdatei (`my-values.yaml`) angelegt werden:

```yaml
global:
  baseDomain: data-hub.your-doma.in
  auth:
    issuer: https://login.data-hub.your-doma.in/realms/udh
  smtp_base_domain: udh-platform@your-doma.in
  imagePullSecrets:
    - pull-secret-name-if-the-image-registry-need-authentication
cloudnativePostgres:
  replicas: 3
grafana:
  replicas: 2
grafanaPublic:
  replicas: 2
keycloak:
  replicas: 2
  smtp: # smtp config for password reset mails etc.
    fromDisplayName: keycloak-udh-platform
    host: your.smtp-server.address
    port: 465
    auth: true
    ssl: true
    user: your-smtp-server-user
    password: your-smtp-server-password
```

Die Domain (`data-hub.your-doma.in`) muss mit allen Subdomains auf den Kubernetes Cluster zeigen, auf dem der teuto DataHub installiert werden soll.

Es empfiehlt sich, für alle Dienste mindestens 2 Pods zu starten, siehe `replicas` der einzelnen Komponenten in `values.yaml`.

## Installation/Upgrade

```bash
RELEASE_NAMESPACE=teuto-data-hub
RELEASE_NAME=production
helm upgrade --install --create-namespace -n $RELEASE_NAMESPACE $RELEASE_NAME charts/udh-platform --wait -f my-values.yaml $image_opts --timeout 15m
```

# Skalierbarkeit

Da der teuto DataHub für ein Deployment auf Kubernetes entwickelt wurde, sind alle wesentlichen Komponenten auf High Availability (HA) ausgelegt. Die Ausnahme bilden Komponenten, bei denen mehrere parallel laufende Instanzen hinderlich wären.

Folgende Komponenten sind daher nicht skalierbar:

- grafana-public-sync (periodischer Sync, daher nicht notwendig)
- owm-collector (periodische Abfrage, daher nicht notwendig)

Alle anderen Komponenten sind allerdings je nach erwarteter Last skalierbar und sollten in einer produktionsreifen Umgebung mit mindestens 2 Replicas laufen:

- oauth-proxy
- docs
- geojson-export
- grafana
- grafana-public
- lorawan-receiver
- mdb-frontend
- mdb-postgraphile
- mimir
- prometheus-writer

# Sicherheit

Um die einzelnen Komponenten voreinander zu schützen werden restriktive NetworkPolicies eingesetzt. Es wird eine NetworkPolicy ausgerollt, die generell allen Netzwerkverkehr verbietet, sodass jede Verbindung explizit erlaubt werden muss.
