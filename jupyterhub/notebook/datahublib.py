import time
import requests
import boto3, botocore
from  prometheus_api_client import PrometheusConnect
from requests_oauthlib import OAuth2Session
from os import environ
from types import SimpleNamespace

base_domain = environ.get("BASE_DOMAIN", "data-hub.local")

client_id = "usercode"
kc_url_prefix = "https://login." + base_domain + "/realms/udh/protocol/openid-connect"
resource_api = "https://login." + base_domain + "/realms/udh/data-hub"
auth_url = kc_url_prefix + "/auth/device"
token_url = kc_url_prefix + "/token"

def oauth2_session(scope: list[str]):
    """Obtains an OAuth2 Session object that can be used to make authenticated requests.

     :param scope: Scope to obtain a token for.

     Returns:
        OAuth2Session: OAuth2 Session object
     """
    auth_info = requests.post(auth_url, {"client_id": client_id, "scope": "openid " + " ".join(scope)}).json()
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

def prometheus_client(session) -> PrometheusConnect:
    """
    Obtains an authenticated prometheus session that can be used to run PromQL queries

    Returns:
        PrometheusConnect: Prometheus API client

    Examples:
        Instantiating -> *object* = prometheus_client()

        all accessible prometheus_api_client calls:
            *object*.get_current_metric_value("air_pressure_mbar")
            *object*.get_metric_range_data("air_pressure_mbar", start_time=(datetime.now() - timedelta(minutes=360)), end_time=(datetime.now()))
            *object*.get_label_names()
            *object*.get_label_values("air_pressure_mbar")
            *object*.custom_query("air_pressure_mbar", params={"time": f"{datetime.now() - timedelta(minutes=360)}"})

        For more information open https://prometheus-api-client-python.readthedocs.io/en/master/source/prometheus_api_client.html
    """
    prometheus_url = "https://prometheus." + base_domain
    return PrometheusConnect(prometheus_url, session=session)

def s3_client(session) -> botocore.client.BaseClient:
    """
    Obtains an authenticated s3 storage session

    Returns:
        botocore.client.BaseClient: S3 client

    Examples:
        Instantiating -> *object* = s3_client()
    """
    s3_url = "https://storage." + base_domain
    sts_client = boto3.client("sts", endpoint_url=s3_url)

    response = sts_client.assume_role_with_web_identity(
        RoleArn="arn:aws:iam::RGW99999999999999999:role/usercode",
        RoleSessionName="usercode",
        WebIdentityToken=session.token["id_token"],
        DurationSeconds=min(session.token["refresh_expires_in"], 36000))

    return boto3.client(
        "s3",
        aws_access_key_id=response["Credentials"]["AccessKeyId"],
        aws_secret_access_key=response["Credentials"]["SecretAccessKey"],
        aws_session_token=response["Credentials"]["SessionToken"],
        endpoint_url=s3_url)


_auth = None

def login(force=False):
    global _auth
    def refresh_tokens():
        try:
            _auth.http.refresh_token(token_url)
            _auth.s3 = s3_client(_auth.http)
            return True
        except:
            return False
    if not force and _auth and refresh_tokens():
        print("tokens refreshed")
        print("use login(force=True) to force a full login")
    else:
        session = oauth2_session(["data-hub", "buckets","prometheus_read"])
        _auth = SimpleNamespace(
            http=session,
            s3=s3_client(session),
            prometheus=prometheus_client(session))
    return _auth

