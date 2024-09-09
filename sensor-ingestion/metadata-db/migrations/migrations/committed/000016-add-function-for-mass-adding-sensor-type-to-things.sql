--! Previous: sha1:15d437208f529a9546e4f86757009da7eef114e0
--! Hash: sha1:3946afa3526a6f4b972102d3501befb20649296b
--! Message: add function for mass adding sensor type to things

CREATE OR REPLACE FUNCTION sensor.assign_sensortype_to_new_devices(sensor_id UUID, device_ids UUID[]) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
    #variable_conflict use_variable
    DECLARE
        device_id_loop UUID;
    BEGIN
        IF device_ids IS NOT NULL THEN
            FOREACH device_id_loop IN ARRAY device_ids LOOP
                UPDATE sensor.thing SET sensor_id = sensor_id WHERE id = device_id_loop;
            END LOOP;
        END IF;

        RETURN;
    END
$$;
