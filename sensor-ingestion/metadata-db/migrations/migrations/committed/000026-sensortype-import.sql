--! Previous: sha1:05586ccff83f1e1687edc58c670ebaf3d4f0d5c8
--! Hash: sha1:60c4612a5a87abaacf6cc2a77c061eb903e26661
--! Message: sensortype import

CREATE OR REPLACE FUNCTION sensor.sensortype_import(IN data jsonb, IN current_project varchar) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
    DECLARE
        property_id uuid;
        sensortype_id uuid;
        property jsonb;
        property_name varchar;
    BEGIN
        -- get sensor values from json and create sensor
        INSERT INTO sensor.sensor (project, name, description, appeui, public, datasheet, out_of_order_seconds)
          VALUES (
            current_project,
            data->'sensordata' ->>'name',
            data->'sensordata' ->>'description',
            data->'sensordata' ->>'appeui',
            (data->'sensordata' ->>'public')::boolean,
            data->'sensordata' ->>'datasheet',
            (data->'sensordata' ->>'outOfOrderSeconds')::integer
          ) RETURNING id INTO sensortype_id;
        -- get sensor property values from json and create properties
        FOR property IN SELECT * FROM jsonb_array_elements((data->>'sensorprops')::jsonb) LOOP
            SELECT property->>'name' INTO property_name;
            SELECT id INTO property_id FROM sensor.property WHERE (project=current_project OR project IS NULL) AND name=property_name;
            IF property_id IS NULL THEN
              INSERT INTO sensor.property (project, name, description, measure, metric_name)
                VALUES (
                  current_project,
                  property_name,
                  property->>'description',
                  property->>'measure',
                  property->>'metricName'
                ) RETURNING id INTO property_id;
            END IF;
            INSERT INTO sensor.sensor_property (project, sensor_id, property_id, alias, write_delta)
              VALUES (
                current_project,
                sensortype_id,
                property_id,
                property->>'alias',
                (property->>'delta')::boolean
              );
        END LOOP;
        RETURN sensortype_id;
    END
$$;
