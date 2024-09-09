--! Previous: sha1:9a67ded3ee910b16fabe8fd24183dde608ea235d
--! Hash: sha1:714b3dab0d5ae4a237e02897c367c3d378da94ec
--! Message: initial-properties

-- NULL for project means it's usable by everyone, nobody can edit it though
ALTER TABLE sensor.property ALTER COLUMN project DROP NOT NULL;

DROP POLICY IF EXISTS public_select_properties ON sensor.property;
CREATE POLICY public_select_properties ON sensor.property FOR SELECT USING (project IS NULL);

DELETE FROM sensor.property WHERE project IS NULL;
INSERT INTO sensor.property (name, description, measure, metric_name) VALUES
('airPressure', 'rel.', '%', 'air_pressure_mbar'),
('airTemp_max','max.','°C','max_air_temperature_degrees_celsius'),
('airTemp_min','min.','°C','min_air_temperature_degrees_celsius'),
('airTemperature','Lufttemperatur','°C','air_temperature_degrees_celsius'),
('axles','Anzahl',NULL,'vehicle_axles_total'),
('batteryLevel','Batterieladezustand','%','battery_level_percents'),
('batteryVoltage','Batteriespannung','V','battery_voltage_volts'),
('batteryVoltageMean24h','Batteriespannung','V','battery_voltage_volts_mean_day'),
('caseTemperature','Gehäusetemperatur','°C','case_temperature_degrees_celsius'),
('class','Fahrzeugklasse',NULL,NULL),
('clouds','Windrichtung','Grad','cloudage_percents'),
('direction','Fahrtrichtung',NULL,NULL),
('firmwareVersion','FirmwareVersion',NULL,NULL),
('healthStatus','HealthStatus',NULL,NULL),
('lane','Fahrspur',NULL,NULL),
('len','Fahrzeuglänge','m','vehicle_length_meters'),
('luminousFlux','Lichtstrom','lm','luminous_flux_lumens'),
('messageType','MessageType',NULL,NULL),
('pluvio','Niederschlagsmenge','mm','pluvio_millimeters'),
('relHumidity',NULL,NULL,'releative_humidity_percents'),
('speed','Geschwindigkeit','km/h','speed_kilometers_per_hour'),
('vehiclesCnt','Anzahl',NULL,'vehicle_detected_total'),
('vol','Schalldruck','dB','acoustic_pressure_decibels'),
('waterLevel','Wasserpegel','mm','water_level_millimeters'),
('waterTemperature','Wassertemperatur','°C','water_temperature_degrees_celsius'),
('windDeg','Windgeschwindigkeit','m/s','wind_direction_degrees'),
('windSpeed','Luftdruck','mbar','wind_speed_meters_per_second') ON CONFLICT DO NOTHING;
