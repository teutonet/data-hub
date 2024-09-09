--! Previous: sha1:e6c261dbb78e96025b7c013eb80e8119204e2833
--! Hash: sha1:8958f4c152de8ac7669897b34e1eb9b50c96844b
--! Message: RLS multiple projects

CREATE OR REPLACE FUNCTION sensor.access_to_project(project varchar) RETURNS boolean
LANGUAGE SQL
STABLE
RETURN current_setting('jwt.claims.projects')::jsonb ? project;

-- rename because select_ is no longer a suitable name when applied to mutations
DROP POLICY IF EXISTS select_sensor ON sensor.sensor;
DROP POLICY IF EXISTS select_property ON sensor.property;
DROP POLICY IF EXISTS select_sensor_property ON sensor.sensor_property;
DROP POLICY IF EXISTS select_thing ON sensor.thing;

DROP POLICY IF EXISTS restrict_sensor ON sensor.sensor;
CREATE POLICY restrict_sensor ON sensor.sensor USING (sensor.access_to_project(project));

DROP POLICY IF EXISTS restrict_property ON sensor.property;
CREATE POLICY restrict_property ON sensor.property USING (sensor.access_to_project(project));

DROP POLICY IF EXISTS restrict_sensor_property ON sensor.sensor_property;
CREATE POLICY restrict_sensor_property ON sensor.sensor_property USING (sensor.access_to_project(project));

DROP POLICY IF EXISTS restrict_thing ON sensor.thing;
CREATE POLICY restrict_thing ON sensor.thing USING (sensor.access_to_project(project));
