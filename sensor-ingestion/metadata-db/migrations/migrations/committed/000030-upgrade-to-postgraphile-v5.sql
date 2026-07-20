--! Previous: sha1:d65b3ca1411a17f9a3b9252aaa758b22af96f5f3
--! Hash: sha1:8857a0ce5b80552074c3de6f423900aa952fba33
--! Message: upgrade to postgraphile v5

-- workaround for test query on postgraphile readiness probe
-- otherwise it would tell "unrecognized configuration pattern ..."
ALTER DATABASE mdb SET "jwt.claims.projects" = '[]';

CREATE OR REPLACE FUNCTION sensor.create_things(things jsonb[]) RETURNS void
  LANGUAGE plpgsql AS $$
DECLARE
  t jsonb;
BEGIN
  FOREACH t IN ARRAY things LOOP
    PERFORM sensor.create_thing_with_payload(
      (t->>'project')::varchar,
      (t->>'name')::varchar,
      (t->>'appid')::varchar,
      (t->>'devid')::varchar,
      (t->>'deveui')::varchar,
      (t->>'lat')::numeric,
      (t->>'long')::numeric,
      (t->>'status')::varchar,
      (t->>'sensorId')::uuid,
      COALESCE((t->>'install')::boolean, false),
      (t->>'altitude')::numeric,
      COALESCE((t->>'public')::boolean, false),
      (t->>'ownedby')::varchar,
      (t->>'locationname')::varchar,
      (t->>'locationdesc')::varchar,
      ARRAY(SELECT jsonb_array_elements_text(t->'customLabels')),
      (t->'payload')::jsonb,
      (t->'lastValues')::jsonb
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION sensor.create_things(jsonb[]) IS E'@name createThings';
