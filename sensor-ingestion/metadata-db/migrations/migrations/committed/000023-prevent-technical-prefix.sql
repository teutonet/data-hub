--! Previous: sha1:7c98eac481f29eae4c761a0f2cdbb4b1b07489e2
--! Hash: sha1:eca6cf38061fb5b3cb3802ada100ea13f30f8442
--! Message: prevent technical prefix

ALTER TABLE sensor.property
   ADD constraint technicalPrefix check (metric_name IS NULL OR metric_name NOT ILIKE 'technical\_%');
