# This is a debug script for making test requests against the prometheusWriter
# Install dependencies with
#   pip install requests requests-oauthlib
# set env OAUTHLIB_INSECURE_TRANSPORT=1 for testing this, and ONLY for testing

from os import environ
from requests_oauthlib import OAuth2Session
from oauthlib.oauth2 import BackendApplicationClient
from datetime import UTC, datetime
from uuid import uuid4

client_id = environ["CLIENT"]
client_secret = environ["SECRET"]
# token_url = environ["TOKEN_URL"]

oauth2_session = OAuth2Session(client=BackendApplicationClient(client_id))
oauth2_session.fetch_token('https://login.data-hub.local/realms/udh/protocol/openid-connect/token', client_secret=client_secret, verify=False)

payload = {
    "resultTime": datetime.now(tz=UTC).isoformat(),
    "sourcePath": {
        "deveui": "0d6a0349-fd20-4d0a-bfb3-f307daae1969", # str(uuid4()),
        "devid": "7d395710-719f-4af6-8e42-55da608264fd", # str(uuid4()),
        "appid": "test"
    },
    "variables": {
        "airPressure": 35,
        "windSpeed": 23,
        "healthStatus": "good",
        "somethingElse": 42,
    }
}

print(oauth2_session.post("https://api.data-hub.local/api/v1/write", json=payload, verify=False).text)
