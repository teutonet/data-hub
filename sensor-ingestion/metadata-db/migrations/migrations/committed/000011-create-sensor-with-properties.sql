--! Previous: sha1:631d2001eff5ccd99fdf0a5ea3d88bb5ec470a12
--! Hash: sha1:2285f47c5f73dc8b1ed2423615fecf10f61436b0
--! Message: create sensor with properties

DROP TYPE IF EXISTS sensor.property_input CASCADE;
CREATE TYPE sensor.property_input AS (
    property_id UUID,
    alias varchar
);

CREATE OR REPLACE FUNCTION sensor.create_sensor_with_props(project varchar, name varchar, appeui varchar, description varchar, datasheet varchar, properties sensor.property_input[]) RETURNS UUID
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
    #variable_conflict use_variable
    DECLARE
        created_sensor_id UUID;
        new_prop_loop sensor.property_input;
    BEGIN
        INSERT INTO sensor.sensor (project, name, description, appeui, datasheet)
            VALUES (project, name, description, appeui, datasheet) RETURNING id INTO created_sensor_id;

        -- Loop over properties and create sensor props
        FOREACH new_prop_loop IN ARRAY properties LOOP
            INSERT INTO sensor.sensor_property (project, property_id, sensor_id, alias)
                VALUES (project, new_prop_loop.property_id, created_sensor_id, new_prop_loop.alias);
        END LOOP;

        RETURN created_sensor_id;
    END
$$;

COMMENT ON FUNCTION sensor.create_sensor_with_props(varchar, varchar, varchar, varchar, varchar, sensor.property_input[]) IS E'@resultFieldName sensorId';
