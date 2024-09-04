--! Previous: sha1:ee54122e77d5de1833a9f13179ed968574f960f2
--! Hash: sha1:b0ba2a45d18efa6b57476bc18ae69a247391dd07
--! Message: sensor_property delete cascade

ALTER TABLE sensor.sensor_property DROP CONSTRAINT sensor_property_fk_sensor;
ALTER TABLE sensor.sensor_property ADD CONSTRAINT sensor_property_fk_sensor FOREIGN KEY (sensor_id) REFERENCES sensor.sensor ON DELETE CASCADE;
