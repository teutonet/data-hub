#!/usr/bin/env bash

source "$(dirname "$BASH_SOURCE")/../test-env/.common"

docker run \
  --rm \
  -v "$(readlink -f "$(dirname "$BASH_SOURCE")/..")":/udp:ro \
  -p 8000:8000 \
  --entrypoint sh \
  squidfunk/mkdocs-material:$MKDOCS_VERSION \
  -c 'cd /udp/doc/user && pip install mkdocs-render-swagger-plugin mkdocs-print-site-plugin && mkdocs serve -a 0.0.0.0:8000 --dirty -f /udp/doc/user/mkdocs.yml'
