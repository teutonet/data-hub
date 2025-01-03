--! Previous: sha1:eca6cf38061fb5b3cb3802ada100ea13f30f8442
--! Hash: sha1:80f73a97724e0b7d22c683994eda79257c5c9078
--! Message: add-out-of-order-seconds

ALTER TABLE sensor.sensor 
ADD IF NOT EXISTS out_of_order_seconds INT DEFAULT 0;

DROP FUNCTION sensor.create_sensor_with_props;
CREATE OR REPLACE FUNCTION sensor.create_sensor_with_props(project varchar, name varchar, appeui varchar, description varchar, out_of_order_seconds int, datasheet varchar, public boolean, properties sensor.property_input[]) RETURNS UUID
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
    #variable_conflict use_variable
    DECLARE
        created_sensor_id UUID;
        new_prop_loop sensor.property_input;
    BEGIN
        INSERT INTO sensor.sensor (project, name, description, out_of_order_seconds, appeui, datasheet, public)
            VALUES (project, name, description, out_of_order_seconds, appeui, datasheet, public) RETURNING id INTO created_sensor_id;

        -- Loop over properties and create sensor props
        FOREACH new_prop_loop IN ARRAY properties LOOP
            INSERT INTO sensor.sensor_property (project, property_id, sensor_id, alias, write_delta)
                VALUES (project, new_prop_loop.property_id, created_sensor_id, new_prop_loop.alias, new_prop_loop.write_delta);
        END LOOP;

        RETURN created_sensor_id;
    END
$$;

COMMENT ON FUNCTION sensor.create_sensor_with_props(varchar, varchar, varchar, varchar, int, varchar, boolean, sensor.property_input[]) IS E'@resultFieldName sensorId';
