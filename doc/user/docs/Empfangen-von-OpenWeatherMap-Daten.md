# Empfangen von OpenWeatherMap-Daten

Wetterdaten der Current-Weather-API können mit wenigen Schritten in die Plattform integriert werden.
Hierfür können "OWM-Kollektoren" eingerichtet werden, die in selbstkonfigurierbaren Intervallen Wetterdaten von der Current-Weather-API abfragen und an die Plattform senden.

## Erstellen eines OpenWeatherMap-API-Keys

- Um Daten abfragen zu können, benötigen Sie einen OpenWeatherMap-API-Key.
- Registrieren Sie sich dafür bei OpenWeatherMap unter: [https://openweathermap.org/](https://openweathermap.org/)
- Erstellen Sie daraufhin einen API-Key unter: [https://home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys)

## Anlegen eines OWM-Kollektors innerhalb der Plattform

- Navigieren Sie über die `Berichtigungsverwaltung` auf das Projekt, für das Sie Wetterdaten empfangen wollen.

<figure>
    <img src="/screenshots/owm-collector-tab.webp">
</figure>

- Erstellen Sie unter dem Menüpunkt `OWM-Kollektoren` einen neuen Kollektor.

<figure>
    <img src="/screenshots/owm-collector-create-form.webp">
</figure>

- Geben Sie dem Kollektor einen Namen, damit Sie ihn später identifizieren können.
- Hinterlegen Sie den vorher erstellten API-Key.
- Geben Sie die Längen- und Breitengrade der Stelle, die Sie abfragen möchten, an.
- Geben Sie den Abfrageintervall an, achten Sie darauf, dass Sie die Nutzungsbedingungen der Current-Weather-API einhalten.

## Eingang der Daten überprüfen

- Die empfangenen Daten können über Grafana eingesehen werden. Um zu Grafana zu gelangen, klicken Sie auf `Daten-Visualisierungen`
- Sie können die Daten des OWM-Kollektors finden, indem Sie nach dem Kollektornamen filtern.
- Unter `Drilldown` > `Metrics` > `Filters` wählen Sie als Filter `collector_name`

<figure>
    <img src="/screenshots/owm-collector-grafana-filter-by-name.webp">
</figure>

## Löschen eines OWM-Kollektors

- Im OWM-Kollektor-Menü des jeweiligen Projekts können Sie eine Liste aller bestehenden Kollektoren einsehen.
- Klicken Sie auf den "Löschen"-Knopf (Achtung!: Diese Aktion ist irreversibel).

<figure>
    <img src="/screenshots/owm-collector-delete.webp">
</figure>
