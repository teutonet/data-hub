ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}python:3.12.2-alpine as builder

# RUN apk add gcc g++ musl-dev snappy-dev

RUN pip install virtualenv

WORKDIR /python_app

RUN virtualenv .venv

COPY requirements.txt requirements.txt

RUN pip3 install --upgrade pip
RUN source .venv/bin/activate && pip3 install -r requirements.txt


FROM ${REGISTRY_MIRROR_LIB}python:3.12.2-alpine

RUN apk add --no-cache snappy

WORKDIR /python_app

ENV PYTHONUNBUFFERED=1

COPY --from=builder /python_app/ /python_app/
COPY sync.py docker-entrypoint.sh /python_app/

CMD ["./docker-entrypoint.sh"]
