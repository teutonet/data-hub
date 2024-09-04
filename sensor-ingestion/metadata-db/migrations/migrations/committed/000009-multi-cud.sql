--! Previous: sha1:714b3dab0d5ae4a237e02897c367c3d378da94ec
--! Hash: sha1:b145d75f2a76bdeb68cec8abd3aec88398fcb71a
--! Message: multi cud

-- These comments make 'postgraphile-plugin-many-create-update-delete' work on these tables
comment on table sensor.thing is
  E'@mncud';
comment on table sensor.property is
  E'@mncud';
comment on table sensor.sensor_property is
  E'@mncud';
