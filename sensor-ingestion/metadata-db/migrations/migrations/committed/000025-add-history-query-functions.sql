--! Previous: sha1:80f73a97724e0b7d22c683994eda79257c5c9078
--! Hash: sha1:05586ccff83f1e1687edc58c670ebaf3d4f0d5c8
--! Message: add history query functions

GRANT USAGE ON SCHEMA pgmemento TO mdb_backend;
GRANT SELECT ON ALL TABLES IN SCHEMA pgmemento TO mdb_backend;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA pgmemento TO mdb_backend;
GRANT SELECT ON pgmemento.transaction_log TO mdb_backend;
GRANT SELECT ON pgmemento.table_event_log TO mdb_backend;

CREATE OR REPLACE FUNCTION app_hidden.get_sensor_prop_audit_information(sensor_id UUID) RETURNS SETOF app_hidden.audit_event
    LANGUAGE plpgsql STABLE
    AS $$
    #variable_conflict use_variable
    DECLARE
        item app_hidden.audit_event;
        target_audit_id BIGINT;
        cust_id_obj text;
        curr_prop_id UUID;
    BEGIN
        cust_id_obj := format('{"sensor_id": "%s"}', sensor_id);
        FOR target_audit_id IN
            SELECT DISTINCT audit_id FROM pgmemento.row_log WHERE
                event_key LIKE '%sensor_property%' AND
                (old_data::jsonb @> cust_id_obj::jsonb OR new_data::jsonb @> cust_id_obj::jsonb)
        LOOP
            FOR item IN SELECT * FROM app_hidden.get_audit_information(target_audit_id, 'sensor', 'sensor_property') LOOP
                IF item.values_before IS NOT NULL AND item.values_after IS NOT NULL AND NOT
                    (item.values_before::jsonb ? 'property_id' OR item.values_after::jsonb ? 'property_id')
                THEN
                    SELECT property_id FROM sensor.sensor_property WHERE pgmemento_audit_id = target_audit_id INTO curr_prop_id;
                    RETURN NEXT (
                        item.id,
                        item.audit_id,
                        item.event_key,
                        item.transaction_id,
                        item.user_name,
                        item.stmt_date,
                        item.session_info,
                        (item.values_before || jsonb_build_object('property_id', curr_prop_id::text)),
                        (item.values_after || jsonb_build_object('property_id', curr_prop_id::text))
                    );
                ELSE
                    RETURN NEXT item;
                END IF;
            END LOOP;
        END LOOP;
    END;
$$;

CREATE OR REPLACE FUNCTION sensor.thing_changes(_id UUID) RETURNS SETOF app_hidden.audit_event
    LANGUAGE plpgsql STABLE
    SECURITY DEFINER
AS $$
    #variable_conflict use_variable
    BEGIN
        IF NOT(SELECT sensor.access_to_project((SELECT project FROM sensor.thing WHERE id = _id)::text)) THEN
            RAISE 'Access denied!';
        END IF;

        RETURN QUERY SELECT * FROM app_hidden.get_audit_information((SELECT pgmemento_audit_id FROM sensor.thing t WHERE t.id = _id LIMIT 1), 'sensor', 'thing') AS thing_changes
        UNION SELECT id, audit_id, event_key, transaction_id, user_name, stmt_date, session_info, values_before, values_after FROM (
            SELECT t_o.pgmemento_audit_id FROM sensor.thing_offset t_o WHERE t_o.thing_id = _id
        ) AS to_audit, app_hidden.get_audit_information(to_audit.pgmemento_audit_id, 'sensor', 'thing_offset') AS offset_changes
        ORDER BY stmt_date DESC;
    END;
$$;

ALTER FUNCTION sensor.thing_changes OWNER TO mdb_backend;

CREATE OR REPLACE FUNCTION sensor.sensor_changes(_id UUID) RETURNS SETOF app_hidden.audit_event
    LANGUAGE plpgsql STABLE
    SECURITY DEFINER
AS $$
    #variable_conflict use_variable
    BEGIN
        IF NOT(SELECT sensor.access_to_project((SELECT project FROM sensor.sensor WHERE id = _id)::text)) THEN
            RAISE 'Access denied!';
        END IF;

        RETURN QUERY SELECT * FROM app_hidden.get_audit_information(
            (SELECT pgmemento_audit_id FROM sensor.sensor s WHERE s.id = _id LIMIT 1), 'sensor', 'sensor'
        ) AS sensor_changes
        UNION SELECT * FROM app_hidden.get_sensor_prop_audit_information(_id) AS sensor_prop_changes
        ORDER BY stmt_date DESC;
    END;
$$;

ALTER FUNCTION sensor.sensor_changes OWNER TO mdb_backend;

CREATE OR REPLACE FUNCTION sensor.sensor_property_changes(_id UUID) RETURNS SETOF app_hidden.audit_event
    LANGUAGE plpgsql STABLE
    SECURITY DEFINER
AS $$
    #variable_conflict use_variable
    BEGIN
        IF NOT(SELECT sensor.access_to_project((SELECT project FROM sensor.sensor_property WHERE id = _id)::text)) THEN
            RAISE 'Access denied!';
        END IF;

        RETURN QUERY SELECT * FROM app_hidden.get_audit_information((SELECT pgmemento_audit_id FROM sensor.sensor_property sp WHERE sp.id = _id LIMIT 1), 'sensor', 'sensor_property') AS sensor_property_changes ORDER BY stmt_date DESC;
    END;
$$;

ALTER FUNCTION sensor.sensor_property_changes OWNER TO mdb_backend;

CREATE OR REPLACE FUNCTION sensor.property_changes(_id UUID) RETURNS SETOF app_hidden.audit_event
    LANGUAGE plpgsql STABLE
    SECURITY DEFINER
AS $$
    #variable_conflict use_variable
    BEGIN
        IF NOT(SELECT sensor.access_to_project((SELECT project FROM sensor.property WHERE id = _id)::text)) THEN
            RAISE 'Access denied!';
        END IF;

        RETURN QUERY SELECT * FROM app_hidden.get_audit_information((SELECT pgmemento_audit_id FROM sensor.property p WHERE p.id = _id LIMIT 1), 'sensor', 'property') AS property_changes ORDER BY stmt_date DESC;
    END;
$$;

ALTER FUNCTION sensor.property_changes OWNER TO mdb_backend;


COMMENT ON COLUMN "app_hidden"."audit_event"."user_name" IS E'@name audit_user_name';
