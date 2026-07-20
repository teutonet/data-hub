--! Previous: sha1:f61ddc8378b398269f962a65555adb900445f10f
--! Hash: sha1:d65b3ca1411a17f9a3b9252aaa758b22af96f5f3
--! Message: geosjon-export permissions

GRANT USAGE ON SCHEMA sensor TO mdb_geojson_reader;
GRANT SELECT ON TABLE sensor.public_queries TO mdb_geojson_reader;
GRANT SELECT ON TABLE sensor.sensor TO mdb_geojson_reader;
GRANT SELECT ON TABLE sensor.sensor_property TO mdb_geojson_reader;
GRANT SELECT ON TABLE sensor.property TO mdb_geojson_reader;
