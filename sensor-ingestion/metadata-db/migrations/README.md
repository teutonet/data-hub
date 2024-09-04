# Metadata DB Migrations

## Develop New Migrations

1. Start the `./dev-db`
1. Let the migration tool `./graphile-migrate watch`
1. Develop the [current migration](./migrations/current.sql), keep it [idempotent](https://github.com/graphile/migrate/blob/main/docs/idempotent-examples.md)
1. (If you want to see the effects on the GraphQL interface, also run `../postgraphile/dev-graphiql`)
1. Once you're satisfied let `./graphile-migrate commit --message "change XYZ"`

## Other Tasks

For everything else refer to [the graphile-migrate documentation](https://github.com/graphile/migrate) and use `./graphile-migrate` as the binary wrapper.

## Prerequisites

### Users

We expect the database deployment to create the database as well as provide a separate, non-owner user "postgraphile" that we can grant permissions to.

For the development setup that is handled through scripts and hooks.

### Extensions

In order to provide geohash functionality at the DB layer, PostGIS is needed.
Many images such as the Bitnami ones are built with PostGIS support.
