# This is a demo script showing how to obtain and use tokens
# using a password to access the Metadata DB
# Install dependencies with
#   pip install requests requests-oauthlib
# set env OAUTHLIB_INSECURE_TRANSPORT=1 for testing this, and ONLY for testing

from os import environ
from requests_oauthlib import OAuth2Session

from oauthlib.oauth2 import LegacyApplicationClient

client_id = "lorawan"
token_url = environ["TOKEN_URL"]

oauth2_session = OAuth2Session(
    client=LegacyApplicationClient(client_id=client_id))
oauth2_session.fetch_token(token_url=token_url, username=environ["USERNAME"],
                           password=environ["PASSWORD"],
                           client_id=client_id)

body = """
query Query {
  sensors {
    name
  }
}
"""
print(oauth2_session.token)
print(oauth2_session.post("http://localhost:5000/graphql",
                          json={"query": body}).json())
