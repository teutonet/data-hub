#!/bin/bash

cd "$(dirname "$0")"

DB_CONTAINER_NAME=pg-schema-db
NETWORK_NAME=db
PGHOST=postgres

function tearDown {
  docker rm -f ${DB_CONTAINER_NAME}
	docker network rm ${NETWORK_NAME}
}

trap tearDown EXIT

docker network create ${NETWORK_NAME}

docker run --rm -dt \
  -v $(pwd)/../migrations/migrations/init:/docker-entrypoint-initdb.d:ro \
  -e POSTGRES_PASSWORD=postgres \
  --name ${DB_CONTAINER_NAME} \
  docker.io/bitnami/postgresql:14.10.0-debian-11-r23
docker network connect --alias ${PGHOST} ${NETWORK_NAME} ${DB_CONTAINER_NAME}

sleep 4

(cd ../postgraphile && npm i)
(cd ../migrations && npm i)
(cd ../frontend && npm i)

docker run --rm \
	--network ${NETWORK_NAME} \
  -e PGHOST=${PGHOST} \
  -e PGUSER=postgres \
  -e PGPASSWORD=postgres \
  -e PGDATABASE=mdb \
  -e PGSSLMODE=disable \
	-v $(pwd)/../migrations:/migrate:ro \
  --entrypoint npx \
  --workdir /migrate \
	node:21.6.1-bookworm graphile-migrate migrate

docker run --rm \
	--network ${NETWORK_NAME} \
  -e PGHOST=${PGHOST} \
  -e PGUSER=postgres \
  -e PGPASSWORD=postgres \
  -e PGDATABASE=mdb \
  -e PGSSLMODE=disable \
	-v $(pwd)/../migrations:/migrate:ro \
  --entrypoint npx \
  --workdir /migrate \
	node:21.6.1-bookworm graphile-migrate watch --once

docker run --rm \
	--network ${NETWORK_NAME} \
  -e DATABASE_URL=postgres://postgres:postgres@${PGHOST}:5432/mdb \
  -e OUT_SCHEMA_PATH=/frontend/src/lib/common/generated/schema.graphql \
	-v $(pwd):/postgraphile:ro \
	-v $(pwd)/../frontend:/frontend \
	-u `id -u`:`id -g` \
  --entrypoint node \
  --workdir /postgraphile \
	node:21.6.1-bookworm generate-schema.js

(cd ../frontend && npm run generate-types)
