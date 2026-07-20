CREATE USER postgraphile WITH PASSWORD 'postgraphile';
CREATE USER mdb_backend WITH PASSWORD 'xxxx';
CREATE USER mdb_geojson_reader WITH PASSWORD 'xxxx'; 
CREATE DATABASE mdb;
\c mdb
-- renovate: datasource=github-tags depName=pgMemento/pgMemento extractVersion=^v(?<version>.*)$
CREATE EXTENSION IF NOT EXISTS pgmemento WITH VERSION '0.7.4';