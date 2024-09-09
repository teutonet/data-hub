--! Previous: sha1:75043793167664beddc6b631aec4c224c4e22028
--! Hash: sha1:fdfa32d47df529ed5fbfe1c4a10c786d76b310da
--! Message: compute geohash automatically

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE sensor.thing
DROP COLUMN geohash,
ADD COLUMN geohash VARCHAR GENERATED ALWAYS AS (ST_GeoHash(ST_Point(long, lat), 13)) STORED;

CREATE INDEX IF NOT EXISTS geohash ON sensor.thing (geohash);
