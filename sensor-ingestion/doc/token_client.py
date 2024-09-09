# This is a demo script showing how to obtain and use tokens
# using client credentials in Basic format to access the Metadata DB
# Install dependencies with
#   pip install requests requests-oauthlib
# set env OAUTHLIB_INSECURE_TRANSPORT=1 for testing this, and ONLY for testing
from os import environ

from requests_oauthlib import OAuth2Session

from oauthlib.oauth2 import BackendApplicationClient

token_url = environ["TOKEN_URL"]

oauth2_session = OAuth2Session(client=BackendApplicationClient(None))
oauth2_session.fetch_token(token_url, auth=lambda r: r,
                           headers={"Authorization": environ["BASIC_AUTH"]}, verify=False)

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
