--! Previous: sha1:fdfa32d47df529ed5fbfe1c4a10c786d76b310da
--! Hash: sha1:f94e4e92f17769751a418d971284d9a04dcf2ed4
--! Message: generated UUIDs and unique names per project

--- Auto-generate UUIDs and make names unique for projects
ALTER TABLE IF EXISTS sensor.sensor
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    DROP CONSTRAINT IF EXISTS unique_sensor_name_per_project,
    ADD CONSTRAINT unique_sensor_name_per_project UNIQUE(project, name);

ALTER TABLE IF EXISTS sensor.property
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE IF EXISTS sensor.thing
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    DROP CONSTRAINT IF EXISTS unique_thing_name_per_project,
    ADD CONSTRAINT unique_thing_name_per_project UNIQUE(project, name);


--- Remove id creation and updating from postgraphile API
COMMENT ON COLUMN sensor.sensor.id IS E'@omit create,update';
COMMENT ON COLUMN sensor.property.id IS E'@omit create,update';
COMMENT ON COLUMN sensor.thing.id IS E'@omit create,update';
