--! Previous: sha1:60c4612a5a87abaacf6cc2a77c061eb903e26661
--! Hash: sha1:667e1d2d409f04f71630202939894b87bf658b6e
--! Message: add error columns to things

ALTER TABLE IF EXISTS sensor.thing
    ADD latest_error varchar,
    ADD error_timestamp timestamp,
    ADD has_error boolean generated always as (latest_error IS NOT NULL) STORED;
