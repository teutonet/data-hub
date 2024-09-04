DO $$
BEGIN
CREATE USER postgraphile NOCREATEDB PASSWORD 'postgraphile';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE '%, skipping', SQLERRM USING ERRCODE = SQLSTATE;
END
$$;
