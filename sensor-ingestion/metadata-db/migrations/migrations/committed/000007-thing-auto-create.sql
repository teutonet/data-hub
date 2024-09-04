--! Previous: sha1:c36230496376903c3341e3960534216e3380000e
--! Hash: sha1:9a67ded3ee910b16fabe8fd24183dde608ea235d
--! Message: thing-auto-create

ALTER TABLE sensor.thing ALTER COLUMN sensor_id DROP NOT NULL;
ALTER TABLE sensor.thing ADD CONSTRAINT created_without_sensor_id CHECK (sensor_id IS NOT NULL or status = 'created');

ALTER TABLE sensor.thing ADD COLUMN IF NOT EXISTS payload JSONB;

CREATE OR REPLACE FUNCTION sensor.access_to_projects() RETURNS setof TEXT
LANGUAGE SQL
STABLE
RETURN jsonb_array_elements_text(current_setting('jwt.claims.projects')::jsonb);

CREATE OR REPLACE FUNCTION sensor.find_with_identical_properties(property_names varchar[])
RETURNS SETOF uuid
LANGUAGE SQL
STABLE AS $$
  SELECT sensor_id from (select sensor_id, COALESCE(alias, name) as alias_or_name from sensor.sensor_property JOIN sensor.property ON sensor.property.id = sensor.sensor_property.property_id ORDER BY 2) as sub GROUP BY sensor_id HAVING array_agg(alias_or_name) = property_names;
$$;
