--! Previous: sha1:bf5fd10a4bd372b6498df8cd9db3807e79ca337e
--! Hash: sha1:7c98eac481f29eae4c761a0f2cdbb4b1b07489e2
--! Message: make altitude numeric

ALTER TABLE sensor.thing
ALTER COLUMN altitude TYPE NUMERIC(16,12) USING lat::NUMERIC;

DROP FUNCTION sensor.create_thing_with_payload;

CREATE OR REPLACE FUNCTION sensor.create_thing_with_payload(project varchar, name varchar, appid varchar, devid varchar, deveui varchar, lat NUMERIC, long NUMERIC, status varchar, sensor_id uuid, install boolean DEFAULT false, altitude NUMERIC DEFAULT NULL, public boolean DEFAULT FALSE, ownedby varchar DEFAULT NULL, locationname varchar DEFAULT NULL, locationdesc varchar DEFAULT NULL, custom_labels text[] DEFAULT NULL, payload jsonb DEFAULT NULL, last_values jsonb DEFAULT NULL) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
    #variable_conflict use_variable
    DECLARE
        created_thing_id uuid;
    BEGIN
        INSERT INTO sensor.thing (
            project, name, appid, devid, deveui, lat, long, status, install, altitude, public, ownedby, locationname, locationdesc, sensor_id, custom_labels
        ) VALUES (
            project, name, appid, devid, deveui, lat, long, status, install, altitude, public, ownedby, locationname, locationdesc, sensor_id, custom_labels
        ) RETURNING id INTO created_thing_id;

        INSERT INTO sensor.thing_livedata (
            thing_id, last_values, payload
        ) VALUES (
            created_thing_id, last_values, payload
        );
    END
$$;
