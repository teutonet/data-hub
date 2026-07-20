# Grafana

## Veröffentlichung von Dashboards

Standardmäßig sind alle Grafana Dashboards nur für die Personen erreichbar, denen gemäß des Berechtigungskonzeptes Zugriff gewährt wurde.

Allerdings sollen Dashboards manchmal auch öffentlich gemacht werden, um ohne Anmeldung aufgerufen werden zu können.

Um ein Dashboard öffentlich teilen zu können, muss aus dem Dropdown neben "Share" "Share Externally" ausgewählt werden:

<figure>
   <img src="/screenshots/grafana-share-dashboard.webp">
   <figcaption>Dropdown, um ein Dashboard extern zu teilen</figcaption>
</figure>

Es öffnet sich eine Seitenleiste, bei der noch einmal bestätigt werden muss, dass das Dashboard für alle Personen mit dem entsprechenden Link einsehbar sein soll:

<figure>
   <img src="/screenshots/grafana-share-create.webp">
   <figcaption>Mit einem Klick auf "Accept" wird das Dashboard veröffentlicht</figcaption>
</figure>

Damit ist das Dashboard für alle Personen einsehbar, die über den externen Link verfügen.

<figure>
   <img src="/screenshots/grafana-share-copy-url.webp">
   <figcaption>Mit einem Klick auf den Button wird die öffentliche URL in die Zwischenablage kopiert</figcaption>
</figure>

Soll die Veröffentlichung wieder rückgängig gemacht werden, genügt hier im gleichen Menü ein Klick auf "Revoke access".
