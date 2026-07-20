# Hilfsbibliothek

Die Teuto-DataHub-Library ermöglicht es Ihnen, über die Prometheus- und S3-Schnittstellen Daten abzufragen und zu übertragen. Diese Bibliothek steht Ihnen im JupyterHub standardmäßig zur Verfügung. Sie können sie – wie im folgenden Beispiel gezeigt – bequem per import in Ihrem Notebook nutzen.

```python
from _ import login

auth = login()

auth.prometheus # Prometheus-Client
auth.s3 # S3-Client

```

## Abhängigkeiten

Die Teuto-DataHub-Library (kurz: datahublib) basiert auf und benötigt folgende Abhängigkeiten:

- [requests_oauthlib](https://pypi.org/project/requests-oauthlib/)
- [prometheus_api_client](https://pypi.org/project/prometheus-api-client/)
- [boto3](https://pypi.org/project/boto3/)

Diese können durch folgenden Befehl installiert werden:

```python
pip install requests_oauthlib prometheus-api-client boto3
```

## Prometheus-Client

Mit dem Prometheus-Client lassen sich aus Ihrer IDE / Ihrem Terminal heraus Daten zu Metriken und Labels ausgeben

### Initialisieren

Um einen Prometheus-Client zu initialisieren muss zuerst die Klasse aus der
Teuto-DataHub-Library importiert werden:

```python
from datahublib import login
```

Um nun die Klasse zu initialisieren, kann ein Objekt erstellt werden:

```python
auth = login()                # Login wird durchgeführt
                              # Hier wird eine Anmeldung aufgefordert
auth.prometheus.all_metrics() # Beispielaufruf
```

Beim erstellen des Objektes wird in der Ausgabe ein Login-Link bereitgestellt, worüber der Client Authentifiziert werden kann.
Zum Beispiel: `Log in at https://login.data-hub.teuto.net/realms/...`  
Bei erfolgreichem Login wird `Login successful` in der Ausgabe ausgegeben.

### Funktionen

Im Prinzip sind es die Funktionen, die auch `prometheus-api-client` besitzt ([prometheus-api-client Dokumentation](https://prometheus-api-client-python.readthedocs.io/en/master/source/prometheus_api_client.html)). Sie können über die Auto-Vervollständigungs Funktion Ihrer IDE auf mögliche Funktionen einen Einblick erhalten.  
(**nicht alle Funktionen** können ohne einer bestimmten **Rollenzuweisung** aufgerufen werden)

Hier eine Liste der Grundlegenden Funktionen:

- `all_metrics()`: gibt die Namen aller verfügbaren Metriken zurück
- `get_current_metric_value(str metric, dict label_config)`: gibt den aktuellen Wert der Metrik **metric** zurück, falls diese existiert. Mithilfe von **label_config** lassen sich die Ergebnisse filtern (z.B. `label_config={ "name":"thing-abc" }`).
- `get_metric_range_data(str metric, dict label_config, datetime start_time, datetime end_time)`: gibt ein Array von Metriken zurück, mit Daten zwischen **start_time** und **end_time**, falls existiert. Mithilfe von label_config lassen sich die Ergebnisse filtern (z.B. `label_config={ "name":"thing-abc" }`).
- `get_label_names()`: gibt die Namen aller verfügbaren Labels zurück
- `get_label_values(str label)`: gibt ein Array mit den Werten des Labels zurück
- `custom_query(str metric, dict params)`:  
  Benutzerdefinierte Abfrage z.B. `custom_query("air_pressure_mbar", params={"time": f"{datetime.now() - timedelta(minutes=360)}"})`

## S3-Client

### Initialisieren

Um einen S3-Client zu initialisieren muss ebenfalls die Login Methode aus der
Teuto-DataHub-Library importiert werden:

```python
from _ import login
```

Auch hier muss die Login Methode genutzt werden. Wenn bereits ein Login für eine andere Komponente (z.B. dem Prometheus-Client) existiert, kann dieses Objekt auch für s3 verwendet werden:

```python
auth = login()                                           # Login wird durchgeführt
                                                         # Hier wird eine Anmeldung aufgefordert
auth.s3.list_objects(Bucket="mandantenname.projektname") # Beispielaufruf
```

Beim erstellen des Objektes wird in der Ausgabe ein Login-Link bereitgestellt, worüber der Client Authentifiziert werden kann.
Zum Beispiel: `Log in at https://login.data-hub.teuto.net/realms/...`  
Bei erfolgreichem Login wird `Login successful` in der Ausgabe ausgegeben.

### Funktionen

Im Prinzip sind es die Funktionen, die auch `boto3` besitzt ([boto3 Dokumentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)).

## Problembehandlung

Es könnten Probleme während der Nutzung der Library enstehen. Einige finden Sie hier samt Lösung wieder.  
Sollte das Problem nach dem ausprobieren der Lösung weiterhin bestehen, melden Sie sich bitte beim Kundensupport.

### Prometheus-Client

#### TokenExpiredError / InvalidGrantError

##### Fehlermeldungen:

```
TokenExpiredError: (token_expired)
InvalidGrantError: (invalid_grant) Token is not active
```

Deutet daraufhin, dass der Authentifizierungs-Token abgelaufen ist, welcher durch die Anmeldeaufforderung erzeugt worden ist

##### Lösung:

`prometheus_client()` erneut [initialisieren](#initialisieren)

#### TypeError

##### Fehlermeldungen:

```
TypeError: ... missing X required positional arguments: ...
```

Deutet daraufhin, dass es einen Fehler bei der Eingabe der Funktion gab. Die Funktion vermisst in diesem Fall X Argumente/Parameter da Sie dieser nicht mitgegeben wurden.

##### Lösung:

Die Funktion auf Ihre Richtigkeit überprüfen (Funktionsname korrekt? Alle Argumente/Parameter die erforderlich sind in den Klammern stehen?)

```python
# Beispiel get_label_values(str label_name)
...get_label_values() => TypeError   # Falsch
...get_label_values("name") => [...] # Richtig
```

#### AttributeError:

##### Fehlermeldungen:

```
AttributeError: 'PrometheusConnect' object has no attribute ...
```

Deutet daraufhin, dass die eingegebene Funktion entweder falsch eingegeben wurde oder beim Prometheus-Client nicht existiert.

##### Lösung:

Den Funktionsnamen auf Richtigkeit überprüfen.  
In der Dokumentation nachschauen ob die Funktion existiert.

```python
...all_metrics() => [...] # existiert

...All_Metrics() => AttributeError # existiert nicht
...all_metric() => AttributeError # existiert nicht
...allMetrics() => AttributeError # existiert nicht
```
