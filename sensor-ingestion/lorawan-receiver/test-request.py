# This is a debug script for making test requests against the lorawanReceiver
# Install dependencies with
#   pip install requests
# set env OAUTHLIB_INSECURE_TRANSPORT=1 for testing this, and ONLY for testing

from os import environ
import requests
from app.test import test_message

client_id = environ["CLIENT"]
client_secret = environ["SECRET"]

print(requests.post("http://localhost:8091/api/v1", json=test_message,
                    auth=(client_id, client_secret)).text)
