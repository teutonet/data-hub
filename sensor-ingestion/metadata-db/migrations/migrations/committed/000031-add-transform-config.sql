--! Previous: sha1:8857a0ce5b80552074c3de6f423900aa952fba33
--! Hash: sha1:b27f436080529f13c345f25da55fe0325473cfa6
--! Message: add transform config table

CREATE TABLE IF NOT EXISTS sensor.transform_config (
    project varchar NOT NULL,
    id uuid NOT NULL CONSTRAINT transform_config_pk PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar,
    description varchar,
    jsonata_expression varchar NOT NULL,
    active boolean NOT NULL DEFAULT true,
    CONSTRAINT transform_config_project_name_unique UNIQUE (project, name)
);

DROP POLICY IF EXISTS select_transform_config ON sensor.transform_config;
CREATE POLICY select_transform_config ON sensor.transform_config
  USING ((current_setting('jwt.claims.projects', true)::jsonb ? project));
ALTER TABLE sensor.transform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insert_transform_config ON sensor.transform_config;
CREATE POLICY insert_transform_config ON sensor.transform_config
  FOR INSERT WITH CHECK ((current_setting('jwt.claims.projects', true)::jsonb ? project));

DROP POLICY IF EXISTS update_transform_config ON sensor.transform_config;
CREATE POLICY update_transform_config ON sensor.transform_config
  FOR UPDATE USING ((current_setting('jwt.claims.projects', true)::jsonb ? project));

DROP POLICY IF EXISTS delete_transform_config ON sensor.transform_config;
CREATE POLICY delete_transform_config ON sensor.transform_config
  FOR DELETE USING ((current_setting('jwt.claims.projects', true)::jsonb ? project));

GRANT ALL ON sensor.transform_config TO postgraphile;
GRANT ALL ON sensor.transform_config TO mdb_backend;

COMMENT ON COLUMN sensor.transform_config.id IS E'@omit create,update';
