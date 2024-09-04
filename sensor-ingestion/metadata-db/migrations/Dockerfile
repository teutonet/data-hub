ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}node:21.6.1-alpine

WORKDIR /migrate
ENTRYPOINT [ "node_modules/.bin/graphile-migrate" ]
COPY package.json package-lock.json /migrate/

RUN npm ci --omit=dev

COPY .gmrc.js .
COPY migrations migrations
RUN chmod 644 migrations/committed/*.sql

USER node
