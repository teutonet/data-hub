--! Previous: sha1:2768b2193dc81bb213303db0842195ae0c1efe64
--! Hash: sha1:ee54122e77d5de1833a9f13179ed968574f960f2
--! Message: add thing offsets

DROP TYPE IF EXISTS sensor.offset_type;
CREATE TYPE sensor.offset_type AS ENUM(
    'MULT', 'DIV', 'SUB', 'ADD'
);

DROP TABLE IF EXISTS sensor.thing_offset;
CREATE TABLE sensor.thing_offset (
    project varchar NOT NULL,
    id uuid NOT NULL DEFAULT gen_random_uuid() CONSTRAINT offset_pk PRIMARY KEY,
    thing_id uuid NOT NULL CONSTRAINT offset_fk_thing REFERENCES sensor.thing,
    metric_name varchar NOT NULL,
    offset_type sensor.offset_type NOT NULL,
    offset_value NUMERIC(1000, 4) NOT NULL,
    CONSTRAINT unique_metric_offset_per_thing UNIQUE(thing_id, metric_name),
    CONSTRAINT no_division_by_zero CHECK (offset_type != 'DIV' OR offset_value != 0)
);

--- Remove id creation and updating from postgraphile API
COMMENT ON COLUMN sensor.thing_offset.id IS E'@omit create,update';

DROP POLICY IF EXISTS restrict_thing_offset ON sensor.thing_offset;
CREATE POLICY restrict_thing_offset ON sensor.thing_offset USING (sensor.access_to_project(project));
ALTER TABLE sensor.thing_offset ENABLE ROW LEVEL SECURITY;

--- Trigger functions on sensor.sensor_property and sensor.property to delete dependent offset records

-- changing property metric name
CREATE OR REPLACE FUNCTION sensor.delete_prop_dependent_offsets() RETURNS TRIGGER
    LANGUAGE plpgsql
AS $$
    BEGIN
        --- Find sensor props that use the changed property, then find associated sensor types, then associated things, then associated offsets, then delete all offsets that used the changed property's metric name
        
        DELETE FROM sensor.thing_offset WHERE id IN (
            SELECT t_o.id 
                FROM sensor.sensor_property sp
                LEFT JOIN sensor.sensor s ON sp.sensor_id = s.id
                LEFT JOIN sensor.thing t ON t.sensor_id = s.id
                LEFT JOIN sensor.thing_offset t_o ON t.id = t_o.thing_id
                WHERE t_o.metric_name = OLD.metric_name AND sp.property_id = OLD.id
        );
        
        RETURN OLD;
    END
$$;

CREATE OR REPLACE TRIGGER delete_prop_dependent_offsets_update
    AFTER UPDATE
    ON sensor.property
    FOR EACH ROW
    WHEN ((OLD.metric_name <> NEW.metric_name))
    EXECUTE FUNCTION sensor.delete_prop_dependent_offsets();

CREATE OR REPLACE TRIGGER delete_prop_dependent_offsets_delete
    AFTER DELETE
    ON sensor.property
    FOR EACH ROW
    EXECUTE FUNCTION sensor.delete_prop_dependent_offsets();

-- deleting a sensor type
CREATE OR REPLACE FUNCTION sensor.delete_sensor_type_dependent_offsets() RETURNS TRIGGER
    LANGUAGE plpgsql
AS $$
    BEGIN
        DELETE FROM sensor.thing_offset WHERE id IN (
            SELECT t_o.id FROM sensor.thing t
                JOIN sensor.thing_offset t_o ON t.id = t_o.thing_id
                WHERE t.sensor_id = OLD.id
        );

        RETURN OLD;
    END
$$;

CREATE OR REPLACE TRIGGER delete_sensor_type_dependent_offsets
    AFTER DELETE
    ON sensor.sensor
    FOR EACH ROW
    EXECUTE FUNCTION sensor.delete_sensor_type_dependent_offsets();

-- deleting a sensor prop from a sensor type
CREATE OR REPLACE FUNCTION sensor.delete_sensor_prop_dependent_offsets() RETURNS TRIGGER
    LANGUAGE plpgsql
AS $$
    BEGIN
        DELETE FROM sensor.thing_offset WHERE id IN (
            SELECT t_o.id FROM sensor.sensor s
                JOIN sensor.thing t ON t.sensor_id = s.id
                JOIN sensor.thing_offset t_o ON t.id = t_o.thing_id
                JOIN sensor.property p ON p.id = OLD.property_id
                WHERE s.id = OLD.sensor_id AND t_o.metric_name = p.metric_name 
        );

        RETURN OLD;
    END
$$;

CREATE OR REPLACE TRIGGER delete_sensor_prop_dependent_offsets
    AFTER DELETE
    ON sensor.sensor_property
    FOR EACH ROW
    EXECUTE FUNCTION sensor.delete_sensor_prop_dependent_offsets();

-- changing a thing's sensor type
CREATE OR REPLACE FUNCTION sensor.delete_thing_sensor_dependent_offsets() RETURNS TRIGGER
    LANGUAGE plpgsql
AS $$
    BEGIN
        DELETE FROM sensor.thing_offset WHERE thing_id = OLD.id;

        RETURN OLD;
    END
$$;

CREATE OR REPLACE TRIGGER delete_thing_sensor_dependent_offsets_update
    AFTER UPDATE
    ON sensor.thing
    FOR EACH ROW
    WHEN ((OLD.sensor_id <> NEW.sensor_id))
    EXECUTE FUNCTION sensor.delete_thing_sensor_dependent_offsets();

CREATE OR REPLACE TRIGGER delete_thing_sensor_dependent_offsets_delete
    AFTER DELETE
    ON sensor.thing
    FOR EACH ROW
    EXECUTE FUNCTION sensor.delete_thing_sensor_dependent_offsets();

GRANT USAGE ON SCHEMA sensor TO postgraphile;
GRANT ALL ON ALL tables IN SCHEMA sensor TO postgraphile;
