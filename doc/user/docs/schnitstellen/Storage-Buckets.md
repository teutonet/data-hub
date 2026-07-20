# Storage Buckets

Für jedes Projekt wird ein eigener S3-kompatibler Storage-Bucket eingerichtet, der zur Ablage beliebiger Dateien genutzt werden kann. Der Bucketname folgt dabei dem Muster `mandant.projekt`.

Der zentrale Zugriffspunkt lautet: https://storage.data-hub.teuto.net/.

## Berechtigungen

Der Zugriff auf die Buckets wird über die Scopes `project:bucket-read` und `project:bucket-write` geregelt.

Dateien, die unter dem Präfix `_public/` gespeichert werden, sind ohne Authentifizierung öffentlich abrufbar. Die öffentlichen Objekte können direkt über folgende Struktur aufgerufen werden:
https://storage.data-hub.teuto.net/mandant.projekt/_public/

## Zugangsdaten

Temporäre Zugangsdaten werden über den Mechanismus [AssumeRoleWithWebIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html) bereitgestellt.

Dazu holt sich der auszuführende Code (z. B. ein Python-Skript in einem Jupyter Notebook) zunächst einen Token von Keycloak. Dieser Token wird anschließend beim Storage-Endpunkt in kurzlebige Zugangs­schlüssel umgewandelt.
Während des Prozesses fordert Keycloak eine ausdrückliche Bestätigung des Nutzers an, dass der entsprechende Code im Namen des Nutzers auf die Plattform zugreifen darf.

<!-- prettier-ignore -->
!!! danger "Achtung!"
    Die Zustimmung sollte nur Code erteilt werden, der bewusst vom Nutzer selbst ausgeführt wird.
    Eine Bestätigung von fremden Links oder unbekannten Anwendungen würde einer Weitergabe der eigenen Zugangsdaten entsprechen.

## Hilfsbibliothek

In JupyterLab steht eine integrierte [Hilfsbibliothek](hilfsbibliothek.md) zur Verfügung, mit der sich ein fertig konfigurierter [boto3](https://github.com/boto/boto3)-Client erzeugen lässt.

```python title="Login"
from _ import login
auth = login()
```

```
Log in at https://login.DOCS_BASE_DOMAIN/realms/udh/device?user_code=XXXX-XXXX
Still waiting for login confirmation...
Login successful
```

```python title="Objekte in Bucket auflisten"
auth.s3.list_objects(Bucket="mandant.projekt")
```
