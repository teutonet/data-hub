--! Previous: sha1:f94e4e92f17769751a418d971284d9a04dcf2ed4
--! Hash: sha1:c36230496376903c3341e3960534216e3380000e
--! Message: remove-org

ALTER TABLE sensor.thing DROP COLUMN IF EXISTS org;
