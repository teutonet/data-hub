--! Previous: sha1:3946afa3526a6f4b972102d3501befb20649296b
--! Hash: sha1:2768b2193dc81bb213303db0842195ae0c1efe64
--! Message: move write_delta to sensor property

ALTER TYPE sensor.property_input ADD ATTRIBUTE write_delta BOOLEAN;
ALTER TABLE sensor.sensor_property ADD COLUMN IF NOT EXISTS write_delta BOOLEAN NOT NULL DEFAULT FALSE;

-- iterate over all sensors and add its write_delta value to all sensor_properties it references
DO $$
DECLARE
    column_exists INTEGER;
BEGIN
    select 1 from information_schema.columns where table_name = 'sensor' AND table_schema = 'sensor' AND column_name = 'write_delta' INTO column_exists;
    IF column_exists = 1 THEN
         UPDATE sensor.sensor_property SET write_delta = (SELECT write_delta FROM sensor.sensor WHERE sensor.id = sensor_id);
    END IF;
END$$;

ALTER TABLE sensor.sensor DROP COLUMN IF EXISTS write_delta;

DROP FUNCTION sensor.create_sensor_with_props;
CREATE OR REPLACE FUNCTION sensor.create_sensor_with_props(project varchar, name varchar, appeui varchar, description varchar, datasheet varchar, public boolean, properties sensor.property_input[]) RETURNS UUID
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
    #variable_conflict use_variable
    DECLARE
        created_sensor_id UUID;
        new_prop_loop sensor.property_input;
    BEGIN
        INSERT INTO sensor.sensor (project, name, description, appeui, datasheet, public)
            VALUES (project, name, description, appeui, datasheet, public) RETURNING id INTO created_sensor_id;

        -- Loop over properties and create sensor props
        FOREACH new_prop_loop IN ARRAY properties LOOP
            INSERT INTO sensor.sensor_property (project, property_id, sensor_id, alias, write_delta)
                VALUES (project, new_prop_loop.property_id, created_sensor_id, new_prop_loop.alias, new_prop_loop.write_delta);
        END LOOP;

        RETURN created_sensor_id;
    END
$$;

COMMENT ON FUNCTION sensor.create_sensor_with_props(varchar, varchar, varchar, varchar, varchar, boolean, sensor.property_input[]) IS E'@resultFieldName sensorId';
