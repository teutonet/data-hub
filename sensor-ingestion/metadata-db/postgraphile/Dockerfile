ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}node:21.6.1-alpine

COPY package.json package-lock.json /postgraphile/

WORKDIR /postgraphile

RUN npm ci --omit=dev

COPY index.js options.js /postgraphile/

USER node

ENTRYPOINT [ "node", "index.js" ]
