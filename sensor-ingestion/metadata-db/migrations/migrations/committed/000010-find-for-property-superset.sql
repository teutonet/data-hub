--! Previous: sha1:b145d75f2a76bdeb68cec8abd3aec88398fcb71a
--! Hash: sha1:631d2001eff5ccd99fdf0a5ea3d88bb5ec470a12
--! Message: find-for-property-superset

CREATE OR REPLACE FUNCTION sensor.find_for_property_superset(property_names varchar[])
RETURNS SETOF uuid
LANGUAGE SQL
STABLE AS $$
  -- Return all sensor types, where all properties are contained within the parameter array
  -- This means it is fine if one of the property names given to this function is absent from a sensor,
  -- but not the other way around
  SELECT sensor_id from (select sensor_id, COALESCE(alias, name) as alias_or_name from sensor.sensor_property JOIN sensor.property ON sensor.property.id = sensor.sensor_property.property_id ORDER BY 2) as sub GROUP BY sensor_id HAVING array_agg(alias_or_name) <@ property_names;
$$;
