ARG REGISTRY_MIRROR_LIB=""
ARG REGISTRY_MIRROR=""

FROM ${REGISTRY_MIRROR_LIB}node:24.18.0-alpine AS build

RUN mkdir /app
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm i --frozen-lockfile

COPY svelte.config.js vite.config.ts tsconfig.json tailwind.config.cjs ./
COPY static/ static/

COPY src/ src/

ARG IMAGE_BUILD_VERSION="0.0.0"

RUN VITE_BUILD_VERSION=$IMAGE_BUILD_VERSION npm run build

FROM ${REGISTRY_MIRROR}joseluisq/static-web-server:2.43.0

COPY --from=build /app/build /public 
