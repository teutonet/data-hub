--! Previous: sha1:667e1d2d409f04f71630202939894b87bf658b6e
--! Hash: sha1:f61ddc8378b398269f962a65555adb900445f10f
--! Message: add mass sensor copy function

CREATE OR REPLACE FUNCTION sensor.sensor_mass_copy(thing_ids UUID[], target_project_id varchar, find_sensortype boolean DEFAULT false, overwrite_values boolean DEFAULT false) RETURNS INTEGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
        count INTEGER;
        thing_id UUID;
        c_t sensor.thing;
        existing_thing sensor.thing;
        c_st_id UUID;
        v_status varchar;
    BEGIN
        count := 0;
        FOREACH thing_id IN ARRAY thing_ids LOOP
            --! reset loop variables
            c_t := NULL;
            existing_thing := NULL;
            c_st_id := NULL;
            v_status := NULL;
            --! find relevant data
            SELECT * FROM sensor.thing WHERE id = thing_id INTO c_t;
            SELECT * FROM sensor.thing WHERE deveui = c_t.deveui AND project = target_project_id INTO existing_thing;
            IF(find_sensortype) THEN
                SELECT s1.id
                    FROM sensor.sensor s1 JOIN sensor.sensor s2 ON s1.name = s2.name
                    WHERE
                        s1.project = target_project_id AND
                        s2.id = c_t.sensor_id        
                INTO c_st_id;
            END IF;

            --! if the target sensor type exists in the target project, copy status, otherwise set 'created'
            IF(c_st_id IS NOT NULL) THEN
                v_status := c_t.status;
            ELSE
                v_status := 'created';
            END IF;
            
            IF(existing_thing IS NULL) THEN
                INSERT INTO sensor.thing
                    (project, name, appid, devid, deveui, lat, long, status, install, altitude, public, ownedby, locationname, locationdesc, sensor_id, custom_labels) VALUES
                    (target_project_id, c_t.name, c_t.appid, c_t.devid, c_t.deveui, c_t.lat, c_t.long, v_status, c_t.install, c_t.altitude, c_t.public, c_t.ownedby, c_t.locationname, c_t.locationdesc, c_st_id, c_t.custom_labels);
            
                count := count + 1;
            ELSE
                IF(overwrite_values) THEN
                    UPDATE sensor.thing SET
                        (name, appid, devid, lat, long, status, install, altitude, public, ownedby, locationname, locationdesc, sensor_id, custom_labels) =
                        (c_t.name, c_t.appid, c_t.devid, c_t.lat, c_t.long, v_status, c_t.install, c_t.altitude, c_t.public, c_t.ownedby, c_t.locationname, c_t.locationdesc, c_st_id, c_t.custom_labels)
                        WHERE id = existing_thing.id;
                    
                    count := count + 1;
                END IF;
            END IF;
            
            
        END LOOP;

        RETURN count;
    END
$$;

COMMENT ON FUNCTION sensor.sensor_mass_copy(UUID[], varchar, boolean, boolean) IS E'@resultFieldName count';
