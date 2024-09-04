# Prometheus Remote-Writer

## Credentials generieren

Das Generieren von Credentials erfolgt auf Projektebene. Wie das geht, ist [hier](../sensor-onboarding/Sensor-Onboarding.md#sensor-credentials-anlegen) dokumentiert.

Um diese Credentials mit dem Remote-Writer zu verwenden, muss mit diesen Credentials erst vom Keycloak ein Bearer-Token beschafft werden.

Das geht z.B. mit einem Python-Skript:

```py
from os import environ
import requests
from requests_oauthlib import OAuth2Session
from oauthlib.oauth2 import BackendApplicationClient, OAuth2Error

if __name__ == '__main__':
  client_id = environ["USERNAME"]
  client_secret = environ["PASSWORD"]
  project = environ["PROJECT"]

  ca_verify = True
  token_url = 'https://login.data-hub.teuto.net/realms/udh/protocol/openid-connect/token'

  oauth2_session = OAuth2Session(client=BackendApplicationClient(client_id))
  oauth2_session.verify = ca_verify

  oauth2_session.fetch_token(token_url, client_secret=client_secret, verify=ca_verify)
  print("token: %s", oauth2_session.token)
```

Dieses Beispiel-Skript verwendet das Paket `oauthlib` um vom Keycloak ein Bearer-Token für den angegebenen Client anzufragen. Dazu werden die Umgebungsvariablen `USERNAME`, `PROJECT` und `PASSWORD` benutzt, die vorher in der Shell gesetzt werden müssen.

`USERNAME` entspricht dabei dem Username aus dem mdb-Frontend, `PASSWORD` entspricht dem Passwort aus selbiger Quelle und `PROJECT` erwartet den Namen des Projekts mitsamt Tenant (z.B. `knuffingen-wvjrie.trainstation`, wobei `knuffingen-wvjrie` der Tenant und `trainstation` das Projekt sind).

Das Skript gibt dann auf der Konsole das Token aus.

## URL-Endpunkte

### `/readyz` (GET)

Zeigt an, ob der Remote-Writer betriebsbereit ist.

Liefert ein Objekt mit den Status der Abhängigkeiten:

```JSON
{
  "mdb": "READY",
  "prometheus": "READY"
}
```

Der Wert der einzelnen Schlüssel kann entweder `READY` oder `NOT READY` sein. Wenn alle Abhängigkeiten `READY` sind, ist der Status `200`, andernfalls `503`.

### `/livez` (GET)

Zeigt an, ob der Remote-Writer läuft und erreichbar ist. Liefert `I am alive.` wenn der Remote-Writer gestartet wurde. Das bedeutet nicht, dass bereits Messages verarbeitet werden!

### `/api/v1/write` (POST)

Die Route, zu der Messages zur Verarbeitung angeliefert werden.

#### Request-Format

Die Requests an den Remote-Writer brauchen einen Auth-Header mit einem gültigen Bearer-Token, sowie den Header für den content-type `application/json`.

Das Datenformat folgt dem [OpenAPI-Schema](https://swagger.io/specification/) und ist in der Datei `write.yaml` definiert. Eine gültige Payload sieht beispielsweise so aus:

```JSON
{
  "resultTime": "2024-08-08T08:40:24.711080+00:00",
  "sourcePath": {
    "deveui": "2948728934,
    "devid": "9830139013",
    "appid": "993846876"
  },
  "variables": {
    "FILL": 29,
    "TEMP_C": 27.4,
  }
}
```

Optional können unter dem Schlüssel `setLocation` auch Koordinaten des Geräts, was die Daten anliefert, angegeben werden:

```JSON
{
  "resultTime": "2024-08-08T08:40:24.711080+00:00",
  "sourcePath": {
    "deveui": "2948728934",
    "devid": "9830139013",
    "appid": "993846876"
  },
  "variables": {
    "FILL": 29,
    "TEMP_C": 27.4
  },
  "setLocation": {
    "latitude": 52.02227034481842,
    "longitude": 8.532386287853274
  }
}
```

| Schlüssel              | Werttyp                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| resultTime             | Datestring nach ISO 8601                                                         |
| sourcePath             | Objekt mit Schlüsseln `appid`, `deveui`, `devid`                                 |
| appid                  | String                                                                           |
| deveui                 | String                                                                           |
| devid                  | String                                                                           |
| variables              | Objekt, das eine beliebige Anzahl Strings oder Zahlen enthält (Sensor-Messwerte) |
| setLocation (optional) | Objekt mit Schlüsseln `latitude`, `longitude`                                    |
| latitude               | Zahl                                                                             |
| longitude              | Zahl                                                                             |
