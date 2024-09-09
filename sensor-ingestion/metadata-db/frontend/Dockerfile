ARG REGISTRY_MIRROR_LIB=""
ARG REGISTRY_MIRROR=""

FROM ${REGISTRY_MIRROR_LIB}node:21.5.0-alpine AS build

RUN mkdir /app
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci 

COPY svelte.config.js vite.config.ts tsconfig.json tailwind.config.cjs postcss.config.cjs ./
COPY static/ static/

COPY src/ src/

RUN npm run build

FROM ${REGISTRY_MIRROR}joseluisq/static-web-server:2.24.2

COPY --from=build /app/build /public 
