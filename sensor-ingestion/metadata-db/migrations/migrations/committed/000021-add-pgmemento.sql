--! Previous: sha1:934f6ee0fba0b63fe43481d4b50bc6e190077b08
--! Hash: sha1:bf5fd10a4bd372b6498df8cd9db3807e79ca337e
--! Message: add pgmemento

SELECT pgmemento.init('sensor', log_new_data => true, trigger_create_table => true);
SELECT pgmemento.drop_table_audit('thing_livedata', 'sensor', 'pgmemento_audit_id', TRUE, FALSE);

CREATE SCHEMA app_hidden;
SELECT pgmemento.init('app_hidden', log_new_data => true, trigger_create_table => true);

GRANT USAGE ON SCHEMA sensor TO mdb_backend;
GRANT USAGE ON SCHEMA app_hidden TO mdb_backend;

-- Required to make mdb_backend owner of functions
GRANT CREATE ON SCHEMA sensor TO mdb_backend;
GRANT CREATE ON SCHEMA app_hidden TO mdb_backend;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sensor TO mdb_backend;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_hidden TO mdb_backend;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA pgmemento TO mdb_backend;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA pgmemento TO postgraphile;

CREATE TYPE app_hidden.audit_event AS (
	id bigint,
	audit_id bigint,
	event_key text,
	transaction_id integer,
	user_name text,
	stmt_date timestamp with time zone,
	session_info jsonb,
	values_before jsonb,
	values_after jsonb
);

CREATE OR REPLACE FUNCTION app_hidden.get_audit_information (
_audit_id BIGINT,
_schema_name text,
_table_name text
) RETURNS SETOF app_hidden.audit_event AS $$
SELECT
	rl.id,
	rl.audit_id,
	rl.event_key,
	tr.id AS transaction_id,
	tr.user_name,
	te.stmt_time,
	tr.session_info AS session_info,
	rl.old_data AS values_before,
	rl.new_data AS values_after
FROM
	pgmemento.transaction_log tr
JOIN pgmemento.table_event_log te ON
	tr.id = te.transaction_id
JOIN pgmemento.row_log rl ON
	te.event_key = rl.event_key
WHERE
	rl.audit_id = _audit_id

$$ Language SQL stable;
ALTER FUNCTION app_hidden.get_audit_information OWNER TO mdb_backend;
