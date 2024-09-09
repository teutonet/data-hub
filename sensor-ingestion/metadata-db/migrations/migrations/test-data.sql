INSERT INTO sensor.sensor (project, id, name)
    VALUES ('some-project', 'deadbeef-0000-1111-2222-333333333333', 'some sensor')
		ON CONFLICT DO NOTHING;

INSERT INTO sensor.thing (project, id, name, sensor_id, deveui, devid, appid)
    VALUES ('some-project', 'deadbeef-0000-1111-2222-333333333333', 'some thing', 'deadbeef-0000-1111-2222-333333333333', 'example-deveui', 'example-devid', 'example-appid')
		ON CONFLICT DO NOTHING;

INSERT INTO sensor.property (project, id, name, metric_name)
    VALUES ('some-project', 'deadbeef-0000-1111-2222-333333333333', 'some label', NULL), ('some-project', 'deadbeef-9999-1111-2222-333333333333', 'some property', 'some metric')
		ON CONFLICT DO NOTHING;

INSERT INTO sensor.sensor_property (project, sensor_id, property_id, alias)
    VALUES ('some-project', 'deadbeef-0000-1111-2222-333333333333', 'deadbeef-0000-1111-2222-333333333333', 'some alias'), ('some-project', 'deadbeef-0000-1111-2222-333333333333', 'deadbeef-9999-1111-2222-333333333333', NULL)
		ON CONFLICT DO NOTHING;
