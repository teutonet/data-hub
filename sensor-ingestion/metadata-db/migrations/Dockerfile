ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}node:24.18.0-alpine

RUN apk upgrade --no-cache

WORKDIR /migrate
ENTRYPOINT [ "node_modules/.bin/graphile-migrate" ]
COPY package.json pnpm-lock.yaml /migrate/

RUN corepack enable && pnpm i --frozen-lockfile --prod

COPY .gmrc.js .
COPY migrations migrations
RUN chmod 644 migrations/committed/*.sql

USER node
