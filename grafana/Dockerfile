# syntax=docker/dockerfile:1

# to maintain formatting of multiline commands in vscode, add the following to settings.json:
# "docker.languageserver.formatter.ignoreMultilineInstructions": true

ARG BASE_IMAGE=alpine-base
ARG GO_IMAGE=go-builder-base
ARG JS_IMAGE=js-builder-base
ARG JS_PLATFORM=linux/amd64

# Default to building locally
ARG GO_SRC=go-builder
ARG JS_SRC=js-builder

# Dependabot cannot update dependencies listed in ARGs
# By using FROM instructions we can delegate dependency updates to dependabot
FROM alpine:3.24.1 AS alpine-base
FROM golang:1.26.5-alpine AS go-builder-base
FROM --platform=${JS_PLATFORM} node:24-alpine AS js-builder-base

### >>> CUSTOM CHANGE: SOURCE STAGE (git clone + patch)
FROM alpine-base AS source

ARG GRAFANA_REPO=https://github.com/grafana/grafana.git
# renovate: datasource=github-tags depName=grafana/grafana
ARG GRAFANA_VERSION=v13.0.6

RUN apk add --no-cache git patch

WORKDIR /src

RUN git clone --depth=1 --branch ${GRAFANA_VERSION} ${GRAFANA_REPO} .
# Patch wird beim docker build aus lokalem Kontext kopiert
COPY patches /patches

RUN git apply /patches/*.patch
### <<< CUSTOM CHANGE

# Javascript build stage
FROM --platform=${JS_PLATFORM} ${JS_IMAGE} AS js-builder
ARG JS_NODE_ENV=production
ARG JS_YARN_INSTALL_FLAG=--immutable
ARG JS_YARN_BUILD_FLAG=build

ENV NODE_OPTIONS=--max_old_space_size=8000

WORKDIR /tmp/grafana

RUN apk add --no-cache make build-base python3

### >>> CUSTOM CHANGE: komplette Source aus source Stage
COPY --from=source /src/ .
### <<< CUSTOM CHANGE

ENV NODE_ENV=production

RUN yarn install --immutable && yarn build && find . -maxdepth 1 -not -name LICENSE -not -name public -exec rm -r '{}' ';' && rm -r /root/.cache /root/.yarn

# Golang build stage
FROM ${GO_IMAGE} AS go-builder

ARG COMMIT_SHA=""
ARG BUILD_BRANCH=""
ARG GO_BUILD_TAGS="oss"
ARG WIRE_TAGS="oss"

RUN if grep -i -q alpine /etc/issue; then \
  apk add --no-cache \
  # This is required to allow building on arm64 due to https://github.com/golang/go/issues/22040
  binutils-gold \
  bash \
  # Install build dependencies
  gcc g++ make git; \
  fi

WORKDIR /tmp/grafana


### >>> CUSTOM CHANGE: komplette Source aus source Stage
COPY --from=source /src/ .
### <<< CUSTOM CHANGE

RUN go mod download && make build-go GO_BUILD_TAGS=${GO_BUILD_TAGS} WIRE_TAGS=${WIRE_TAGS} && rm -rf /go /root/.cache/go-build

RUN mkdir -p data/plugins-bundled

# helpers for COPY --from
FROM ${GO_SRC} AS go-src
FROM ${JS_SRC} AS js-src

# Final stage
FROM ${BASE_IMAGE}

LABEL maintainer="Grafana Labs <hello@grafana.com>"
LABEL org.opencontainers.image.source="https://github.com/grafana/grafana"

ARG GF_UID="472"
ARG GF_GID="0"

ENV PATH="/usr/share/grafana/bin:$PATH" \
  GF_PATHS_CONFIG="/etc/grafana/grafana.ini" \
  GF_PATHS_DATA="/var/lib/grafana" \
  GF_PATHS_HOME="/usr/share/grafana" \
  GF_PATHS_LOGS="/var/log/grafana" \
  GF_PATHS_PLUGINS="/var/lib/grafana/plugins" \
  GF_PATHS_PROVISIONING="/etc/grafana/provisioning"

WORKDIR $GF_PATHS_HOME

# Install dependencies
RUN if grep -i -q alpine /etc/issue; then \
  apk add --no-cache ca-certificates bash bubblewrap curl tzdata musl-utils && \
  apk info -vv | sort; \
  elif grep -i -q ubuntu /etc/issue; then \
  DEBIAN_FRONTEND=noninteractive && \
  apt-get update && \
  apt-get install -y ca-certificates curl tzdata musl && \
  apt-get autoremove -y && \
  rm -rf /var/lib/apt/lists/*; \
  else \
  echo 'ERROR: Unsupported base image' && /bin/false; \
  fi

# glibc support for alpine x86_64 only
# docker run --rm --env STDOUT=1 sgerrand/glibc-builder 2.40 /usr/glibc-compat > glibc-bin-2.40.tar.gz
ARG GLIBC_VERSION=2.40

RUN if grep -i -q alpine /etc/issue && [ `arch` = "x86_64" ]; then \
  wget -qO- "https://dl.grafana.com/glibc/glibc-bin-$GLIBC_VERSION.tar.gz" | tar zxf - -C / \
  usr/glibc-compat/lib/ld-linux-x86-64.so.2 \
  usr/glibc-compat/lib/libc.so.6 \
  usr/glibc-compat/lib/libdl.so.2 \
  usr/glibc-compat/lib/libm.so.6 \
  usr/glibc-compat/lib/libpthread.so.0 \
  usr/glibc-compat/lib/librt.so.1 \
  usr/glibc-compat/lib/libresolv.so.2 && \
  mkdir /lib64 && \
  ln -s /usr/glibc-compat/lib/ld-linux-x86-64.so.2 /lib64; \
  fi

COPY --from=source /src/conf ./conf

RUN if [ ! $(getent group "$GF_GID") ]; then \
  if grep -i -q alpine /etc/issue; then \
  addgroup -S -g $GF_GID grafana; \
  else \
  addgroup --system --gid $GF_GID grafana; \
  fi; \
  fi && \
  GF_GID_NAME=$(getent group $GF_GID | cut -d':' -f1) && \
  mkdir -p "$GF_PATHS_HOME/.aws" && \
  if grep -i -q alpine /etc/issue; then \
  adduser -S -u $GF_UID -G "$GF_GID_NAME" grafana; \
  else \
  adduser --system --uid $GF_UID --ingroup "$GF_GID_NAME" grafana; \
  fi && \
  mkdir -p "$GF_PATHS_PROVISIONING/datasources" \
  "$GF_PATHS_PROVISIONING/dashboards" \
  "$GF_PATHS_PROVISIONING/notifiers" \
  "$GF_PATHS_PROVISIONING/plugins" \
  "$GF_PATHS_PROVISIONING/access-control" \
  "$GF_PATHS_PROVISIONING/alerting" \
  "$GF_PATHS_LOGS" \
  "$GF_PATHS_PLUGINS" \
  "$GF_PATHS_DATA" && \
  cp conf/sample.ini "$GF_PATHS_CONFIG" && \
  cp conf/ldap.toml /etc/grafana/ldap.toml && \
  chown -R "grafana:$GF_GID_NAME" "$GF_PATHS_DATA" "$GF_PATHS_HOME/.aws" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_PROVISIONING" && \
  chmod -R 777 "$GF_PATHS_DATA" "$GF_PATHS_HOME/.aws" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_PROVISIONING"

COPY --from=go-src /tmp/grafana/bin/grafana* /tmp/grafana/bin/*/grafana* ./bin/
COPY --from=js-src /tmp/grafana/public ./public
COPY --from=js-src /tmp/grafana/LICENSE ./
COPY --from=go-src /tmp/grafana/data/plugins-bundled ./data/plugins-bundled

RUN grafana server -v | sed -e 's/Version //' > /.grafana-version
RUN chmod 644 /.grafana-version

EXPOSE 3000

ARG RUN_SH=./packaging/docker/run.sh

#COPY ${RUN_SH} /run.sh
COPY --from=source /src/packaging/docker/run.sh /run.sh

USER "$GF_UID"
ENTRYPOINT [ "/run.sh" ]
