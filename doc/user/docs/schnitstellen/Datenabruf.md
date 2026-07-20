# Datenabruf

Der Datenabruf im DataHub kann sowohl über die API als auch über die grafische Benutzeroberfläche (GUI) erfolgen. Je nach Anwendungsfall stehen unterschiedliche Methoden und Werkzeuge zur Verfügung, um sowohl öffentliche als auch berechtigungsabhängige Daten effizient abzurufen.

## API

Über die API können derzeit Daten direkt aus Mimir mittels PromQL abgefragt werden.
Dabei wird der Auth-Token des jeweiligen Nutzers verwendet, um sicherzustellen, dass ausschließlich die Daten abgerufen werden, für die entsprechende Berechtigungen bestehen.

Für die Nutzung der API innerhalb von JupyterHub bzw. Python steht zudem eine Bibliothek zur Verfügung. Diese vereinfacht die Interaktion mit S3 sowie Prometheus, indem sie gängige Funktionen bündelt und standardisiert bereitstellt. Dies erleichtert insbesondere automatisierte Workflows, Analysen oder wiederkehrende Datenabfragen.

Der Abruf öffentlicher Daten erfolgt ohne Authentifizierung und kann somit auch von Nutzern ohne Login durchgeführt werden.

## GUI

Für Nutzer, die Daten ohne Programmieraufwand abrufen möchten, steht eine grafische Lösung bereit.
Der Abruf von Daten aus S3 ist über den S3 Explorer im DataHub-Frontend möglich. Hier können Dateien durchsucht, angezeigt und direkt heruntergeladen werden.

Weitere Datensätze lassen sich über Grafana visualisieren und filtern. Die so aufbereiteten Daten können anschließend direkt aus der Oberfläche in verschiedenen Formaten exportiert und weiterverwendet werden.
