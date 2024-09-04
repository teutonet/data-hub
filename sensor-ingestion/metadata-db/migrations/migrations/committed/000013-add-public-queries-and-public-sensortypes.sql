--! Previous: sha1:bed211d97198b7b58de8f0aee9a9881e93715d26
--! Hash: sha1:3c63c67c7b26c92b0240a519071cb53a6ab56830
--! Message: add public queries and public sensortypes

DROP TABLE IF EXISTS sensor.public_queries;
CREATE TABLE sensor.public_queries (
  project varchar NOT NULL,
  name varchar NOT NULL,
  query varchar NOT NULL,
  CONSTRAINT public_queries_pk PRIMARY KEY (project, name)
);

CREATE POLICY restrict_public_queries ON sensor.public_queries USING (sensor.access_to_project(project));
ALTER TABLE sensor.public_queries ENABLE ROW LEVEL SECURITY;

ALTER TABLE sensor.sensor ADD COLUMN public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE sensor.sensor_property ADD COLUMN public BOOLEAN;
