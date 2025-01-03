--! Previous: sha1:b0ba2a45d18efa6b57476bc18ae69a247391dd07
--! Hash: sha1:934f6ee0fba0b63fe43481d4b50bc6e190077b08
--! Message: extract noisy columns from thing table

DROP TABLE IF EXISTS sensor.thing_livedata;
CREATE TABLE sensor.thing_livedata (
    thing_id uuid NOT NULL PRIMARY KEY,
    payload jsonb,
    last_values jsonb,
    CONSTRAINT fk_thing FOREIGN KEY (thing_id) REFERENCES sensor.thing(id) ON DELETE CASCADE
);

DROP POLICY IF EXISTS restrict_thing_livedata ON sensor.thing_livedata;
CREATE POLICY restrict_thing_livedata ON sensor.thing_livedata USING ((current_setting('jwt.claims.projects'::text))::jsonb ? (SELECT project FROM sensor.thing WHERE id = thing_id)::text);
ALTER TABLE sensor.thing_livedata ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    column_exists INTEGER;
    loop_thing RECORD;
BEGIN
    select 1 from information_schema.columns where table_name = 'thing' AND table_schema = 'sensor' AND column_name = 'payload' INTO column_exists;
    IF column_exists = 1 THEN
        -- Loop over all things and put their id, project, payload and last_values into thing_livedatas
        FOR loop_thing IN SELECT id, payload, last_values FROM sensor.thing LOOP
            INSERT INTO sensor.thing_livedata (thing_id, payload, last_values)
                VALUES (loop_thing.id, loop_thing.payload, loop_thing.last_values);
        END LOOP;
    END IF;
END$$;

ALTER TABLE sensor.thing DROP COLUMN IF EXISTS payload;
ALTER TABLE sensor.thing DROP COLUMN IF EXISTS last_values;

CREATE OR REPLACE FUNCTION sensor.create_thing_with_payload(project varchar, name varchar, appid varchar, devid varchar, deveui varchar, lat NUMERIC, long NUMERIC, status varchar, sensor_id uuid, install boolean DEFAULT false, altitude varchar DEFAULT NULL, public boolean DEFAULT FALSE, ownedby varchar DEFAULT NULL, locationname varchar DEFAULT NULL, locationdesc varchar DEFAULT NULL, custom_labels text[] DEFAULT NULL, payload jsonb DEFAULT NULL, last_values jsonb DEFAULT NULL) RETURNS void
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

GRANT USAGE ON SCHEMA sensor TO postgraphile;
GRANT ALL ON ALL tables IN SCHEMA sensor TO postgraphile;
