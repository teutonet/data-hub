## GeoJSON Schnittstelle

Das Ziel ist es, eine GeoJSON Schnittstelle bereitzustellen, die eine möglich ähnliche Ausgabe zum FROST-Server hat

```json
{
	"features": [
		{
			"geometry": {
				"coordinates": [8.5322773642838, 52.022246243432164],
				"type": "Point"
			},
			"properties": {
				"__name__": "air_pressure_mbar",
				"appid": "test",
				"deveui": "8d62bcd8-3317-4bbc-b13e-256f1dab7115",
				"devid": "test",
				"geohash": "u1npfnm583x4",
				"name": "auto-8d62bcd8-3317-4bbc-b13e-256f1dab7115",
				"sensortype_id": "16b374a6-ac25-4916-a369-b8441d5bc654",
				"value": 100
			},
			"type": "Feature"
		}
	],
	"type": "FeatureCollection"
}
```

Dafür ist es nötig, eine PromQL Query zu schreiben, welche die gewünschten Daten zurückgibt. Dies kann eine einfache Query wie `air_pressure_mbar` für eine einzelne Metrik sein, oder komplexer wie `avg_over_time(air_pressure_mbar[24h])`.

Um die Queries zu erstellen, empfehlt es sich, diese im (Grafana explorer)[https://dashboard.data-hub.local/explore] erst zu erproben. Aus der Zeile über `Options` kann die fertige PromQL Query kopiert werden.

**Wichtig**: Der Sensortyp, der angefragt wird, muss auf "Öffentlich" stehen, sonst wird die GeoJSON Schnittstelle die entsprechenden Daten nicht ausgeben!

Die Abfrage erfolgt über `https://export.data-hub.teuto.net/geojson?project=tenantname.projectname&query=air_pressure_mbar`, wobei `tenantname.projectname` jeweils durch den Namen des Tenants sowie des Projektes ersetzt werden müssen, und `air_pressure_mbar` durch die PromQL Query.
