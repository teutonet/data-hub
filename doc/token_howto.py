#!/usr/bin/env python3

# The Prometheus API requires an access token that allows the client to query the data that the user is allowed to view.

# This is a demo script showing how to obtain and use access tokens to access the Prometheus API
# Install dependencies with
#   pip install requests requests-oauthlib

import time
import requests
from requests_oauthlib import OAuth2Session
from os import environ

base_domain = environ.get("BASE_DOMAIN", "data-hub.teuto.net")

client_id = "usercode"
kc_url_prefix = "https://login." + base_domain + "/realms/udh/protocol/openid-connect"
auth_url = kc_url_prefix + "/auth/device"
token_url = kc_url_prefix + "/token"


def log_in(scope):
    """Obtains an OAuth2 Session object that can be used to make authenticated requests.

     :param scope: Scope to obtain a token for.
     """
    auth_info = requests.post(auth_url, {"client_id": client_id, "scope": "openid " + scope}).json()
    print("Log in at " + auth_info["verification_uri_complete"])
    while True:
        time.sleep(auth_info["interval"])
        result = requests.post(token_url, {"client_id": client_id, "device_code": auth_info["device_code"],
                                           "grant_type": "urn:ietf:params:oauth:grant-type:device_code"})
        payload = result.json()

        if result.status_code == 200:
            print("Login successful")
            return OAuth2Session(client_id, auto_refresh_url=token_url, token=payload,
                                 auto_refresh_kwargs={"client_id": client_id}, token_updater=id)
        else:
            print("Still waiting for login confirmation...")
            if payload["error"] == "authorization_pending":
                pass
            elif payload["error"] == "slow_down":
                auth_info["interval"] += 5
            else:
                raise Exception("Login failed: " + result.text)


# This asks the user to log in at a URL where they can confirm the API access for this script.
# The resulting session can be used to perform authenticated queries against the data that the user is allowed to view.
oauth2_session = log_in("prometheus_read")

prometheus_url = "https://prometheus." + base_domain

result = oauth2_session.get(prometheus_url + "/api/v1/labels").json()
# result = oauth2_session.get(prometheus_url + "/api/v1/query", params={"query": "metricNameXYZ"}).json()
# For more information see https://prometheus.io/docs/prometheus/latest/querying/api/

print(result)
