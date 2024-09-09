--! Previous: sha1:3c63c67c7b26c92b0240a519071cb53a6ab56830
--! Hash: sha1:7264e6cf73635fcca3768a30bb2c863a56e2d0c5
--! Message: add last_values and write_delta

ALTER TABLE sensor.thing ADD COLUMN IF NOT EXISTS last_values JSONB;
ALTER TABLE sensor.sensor ADD COLUMN IF NOT EXISTS write_delta BOOLEAN NOT NULL DEFAULT FALSE;

DROP FUNCTION sensor.create_sensor_with_props;
CREATE OR REPLACE FUNCTION sensor.create_sensor_with_props(project varchar, name varchar, appeui varchar, description varchar, datasheet varchar, public boolean, write_delta boolean, properties sensor.property_input[]) RETURNS UUID
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
    #variable_conflict use_variable
    DECLARE
        created_sensor_id UUID;
        new_prop_loop sensor.property_input;
    BEGIN
        INSERT INTO sensor.sensor (project, name, description, appeui, datasheet, write_delta, public)
            VALUES (project, name, description, appeui, datasheet, write_delta, public) RETURNING id INTO created_sensor_id;

        -- Loop over properties and create sensor props
        FOREACH new_prop_loop IN ARRAY properties LOOP
            INSERT INTO sensor.sensor_property (project, property_id, sensor_id, alias)
                VALUES (project, new_prop_loop.property_id, created_sensor_id, new_prop_loop.alias);
        END LOOP;

        RETURN created_sensor_id;
    END
$$;

COMMENT ON FUNCTION sensor.create_sensor_with_props(varchar, varchar, varchar, varchar, varchar, boolean, boolean, sensor.property_input[]) IS E'@resultFieldName sensorId';
