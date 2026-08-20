ARG REGISTRY_MIRROR_LIB=""

FROM ${REGISTRY_MIRROR_LIB}python:3.14.7-alpine

WORKDIR /python_app

ENV PYTHONUNBUFFERED=1

COPY ./app/ /python_app/

CMD ["python3", "fakeApi.py"]
