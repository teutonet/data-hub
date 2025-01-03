ARG REGISTRY_MIRROR=""

FROM ${REGISTRY_MIRROR}postgis/postgis:16-3.4-alpine AS extension-builder
RUN apk add git make

# renovate: datasource=github-tags depName=pgMemento/pgMemento extractVersion=^v(?<version>.*)$
ARG PGMEMENTO_VERSION=0.7.4

RUN mkdir /pgmemento
WORKDIR /pgmemento
RUN wget -O pgmemento.zip https://github.com/pgMemento/pgMemento/releases/download/v${PGMEMENTO_VERSION}/pgmemento-${PGMEMENTO_VERSION}.zip
RUN unzip pgmemento.zip
WORKDIR /pgmemento/pgmemento-${PGMEMENTO_VERSION}
RUN make
RUN make install

FROM ${REGISTRY_MIRROR_LIB}postgis/postgis:16-3.4-alpine
# Setup final image with extensions

# pgmemento (audit trail)
COPY --from=extension-builder /usr/local/share/postgresql/extension/pgmemento* /usr/local/share/postgresql/extension/
