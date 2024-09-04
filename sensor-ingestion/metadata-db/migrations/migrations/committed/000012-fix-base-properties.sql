--! Previous: sha1:2285f47c5f73dc8b1ed2423615fecf10f61436b0
--! Hash: sha1:bed211d97198b7b58de8f0aee9a9881e93715d26
--! Message: fix base properties

UPDATE sensor.property SET description = 'Luftdruck', measure = 'mbar' WHERE project IS NULL AND name = 'airPressure';
UPDATE sensor.property SET description = 'Windgeschwindigkeit', measure = 'm/s' WHERE project IS NULL AND name = 'windSpeed';
UPDATE sensor.property SET description = 'Windrichtung', measure = 'Grad' WHERE project IS NULL AND name = 'windDeg';
UPDATE sensor.property SET description = 'Bewölkungsgrad', measure = '%' WHERE project IS NULL AND name = 'clouds';
UPDATE sensor.property SET description = 'rel. Luftfeuchtigkeit', measure = '%' WHERE project IS NULL AND name = 'relHumidity';
