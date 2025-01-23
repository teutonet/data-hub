ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}node:23.6.0-alpine as build

COPY package.json package-lock.json /postgraphile/

WORKDIR /postgraphile

RUN npm ci

COPY tsconfig.json /postgraphile/
COPY src /postgraphile/src

RUN npm run build

FROM ${REGISTRY_MIRROR_LIB}node:23.6.0-alpine

COPY package.json package-lock.json /postgraphile/

WORKDIR /postgraphile

RUN npm ci --omit=dev

COPY --from=build /postgraphile/build /postgraphile/build

USER node

ENTRYPOINT [ "node", "build/index.js" ]
