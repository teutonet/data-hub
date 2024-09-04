--! Previous: -
--! Hash: sha1:e6c261dbb78e96025b7c013eb80e8119204e2833
--! Message: initial schema

DROP SCHEMA IF EXISTS sensor CASCADE;
CREATE SCHEMA sensor;

DROP TABLE IF EXISTS sensor.sensor;
CREATE TABLE sensor.sensor (
    project varchar NOT NULL,
    id uuid NOT NULL CONSTRAINT sensor_pk PRIMARY KEY,
    name varchar NOT NULL,
    description varchar,
    appeui varchar,
    datasheet varchar
);

DROP POLICY IF EXISTS select_sensor ON sensor.sensor;
CREATE POLICY select_sensor ON sensor.sensor USING (project = current_setting('jwt.claims.project'));
ALTER TABLE sensor.sensor ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS sensor.property;
CREATE TABLE sensor.property (
    project varchar NOT NULL,
    id uuid NOT NULL CONSTRAINT property_pk PRIMARY KEY,
    name varchar NOT NULL,
    description varchar,
    measure varchar,
    metric_name varchar
);

DROP POLICY IF EXISTS select_property ON sensor.property;
CREATE POLICY select_property ON sensor.property USING (project = current_setting('jwt.claims.project'));
ALTER TABLE sensor.property ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS sensor.sensor_property;
CREATE TABLE sensor.sensor_property (
    project varchar NOT NULL,
    sensor_id uuid NOT NULL CONSTRAINT sensor_property_fk_sensor REFERENCES sensor.sensor,
    property_id uuid NOT NULL CONSTRAINT sensor_property_fk_property REFERENCES sensor.property,
    alias varchar,
    CONSTRAINT sensor_property_pk PRIMARY KEY (sensor_id, property_id)
);

DROP POLICY IF EXISTS select_sensor_property ON sensor.sensor_property;
CREATE POLICY select_sensor_property ON sensor.sensor_property USING (project = current_setting('jwt.claims.project'));
ALTER TABLE sensor.sensor_property ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS sensor.thing;
CREATE TABLE sensor.thing (
    project varchar NOT NULL,
    id uuid NOT NULL CONSTRAINT thing_pk PRIMARY KEY,
    name varchar NOT NULL,
    appid varchar,
    devid varchar,
    deveui varchar,
    lat varchar,
    long varchar,
    status varchar,
    install boolean,
    altitude varchar,
    public boolean,
    org varchar NOT NULL,
    ownedby varchar,
    locationname varchar,
    locationdesc varchar,
    sensor_id uuid NOT NULL CONSTRAINT thing_fk REFERENCES sensor.sensor,
    geohash varchar
);

DROP POLICY IF EXISTS select_thing ON sensor.thing;
CREATE POLICY select_thing ON sensor.thing USING (project = current_setting('jwt.claims.project'));
ALTER TABLE sensor.thing ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA sensor TO postgraphile;
GRANT ALL ON ALL tables IN SCHEMA sensor TO postgraphile;
