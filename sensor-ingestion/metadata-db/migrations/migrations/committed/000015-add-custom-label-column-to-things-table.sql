--! Previous: sha1:7264e6cf73635fcca3768a30bb2c863a56e2d0c5
--! Hash: sha1:15d437208f529a9546e4f86757009da7eef114e0
--! Message: add custom label column to things table

ALTER TABLE IF EXISTS sensor.thing
    ADD COLUMN IF NOT EXISTS custom_labels text[];

CREATE OR REPLACE FUNCTION sensor.check_custom_labels_format(arr text[]) RETURNS BOOLEAN
    LANGUAGE plpgsql stable
    AS $$
    DECLARE
        custom_label_loop TEXT;
        current_key TEXT;
        current_value TEXT;
    BEGIN

        IF arr IS NOT NULL THEN
            FOREACH custom_label_loop IN ARRAY arr LOOP
                IF NOT regexp_like(custom_label_loop, '(?!__)^[a-zA-Z_][a-zA-Z0-9_]*:[^\x00-\x1F\x7F]+$') THEN
                    RETURN false;
                END IF;
            END LOOP;
        END IF;
        RETURN true;
    END
$$;

ALTER TABLE IF EXISTS sensor.thing
    DROP CONSTRAINT IF EXISTS custom_label_format;

ALTER TABLE IF EXISTS sensor.thing
    ADD CONSTRAINT custom_label_format
    CHECK (sensor.check_custom_labels_format(custom_labels));
