FROM quay.io/jupyter/scipy-notebook:hub-5.5.0

# renovate: datasource=pypi depName=requests_oauthlib
ENV OAUTHLIB_VERSION=2.0.0
# renovate: datasource=pypi depName=prometheus_api_client
ENV PROMETHEUS_API_CLIENT_VERSION=0.7.2
# renovate: datasource=pypi depName=boto3
ENV BOTO_VERSION=1.43.67

RUN pip install requests_oauthlib==$OAUTHLIB_VERSION prometheus_api_client==$PROMETHEUS_API_CLIENT_VERSION boto3==$BOTO_VERSION \
 && jupyter labextension disable "@jupyterlab/apputils-extension:announcements"

USER root

RUN mkdir /platform_lib
ENV PYTHONPATH=/platform_lib
COPY datahublib.py /platform_lib/_.py

USER $NB_UID