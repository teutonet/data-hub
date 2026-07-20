ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}node:24.18.0-alpine as build

COPY package.json pnpm-lock.yaml /postgraphile/

WORKDIR /postgraphile

RUN corepack enable && pnpm i --frozen-lockfile

COPY tsconfig.json /postgraphile/
COPY src /postgraphile/src

RUN npm run build

FROM ${REGISTRY_MIRROR_LIB}node:24.18.0-alpine

RUN apk upgrade --no-cache

COPY package.json pnpm-lock.yaml /postgraphile/

WORKDIR /postgraphile

RUN corepack enable && pnpm i --frozen-lockfile --prod

COPY --from=build /postgraphile/build /postgraphile/build

USER node

ENTRYPOINT [ "node", "build/index.js" ]
