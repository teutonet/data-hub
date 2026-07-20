FROM ${REGISTRY_MIRROR}squidfunk/mkdocs-material:9.7.6 AS build

RUN pip install mkdocs-print-site-plugin

COPY user/ /docs/
RUN find -name '*.md' -o -name '*.json' \
    && mkdocs build --strict >/output 2>&1

RUN ! grep 'does not contain an anchor' /output

FROM ${REGISTRY_MIRROR}joseluisq/static-web-server:2.43.0
ENV SERVER_PORT=3000

COPY --from=build /docs/site/ /public
