import json
import logging
from urllib.parse import urljoin
import requests
from flask import Flask, request, abort
from waitress import serve
import os
from requests_oauthlib import OAuth2Session
from oauthlib.oauth2 import BackendApplicationClient, OAuth2Error
from openapi_core.contrib.flask.decorators import FlaskOpenAPIViewDecorator
from jsonschema_path import SchemaPath

logging.basicConfig(level=os.environ.get("LOGLEVEL", "INFO").upper())

app = Flask(__name__)
openapi = FlaskOpenAPIViewDecorator.from_spec(
    SchemaPath.from_file_path("lorawanReceiver.yaml"))

ca_verify: bool | str = True
if local_ca_path := os.getenv("TRUST_LOCAL_CA_PATH"):
    ca_verify = local_ca_path

@app.route("/livez")
def livez():
    return "I am alive."


@app.route("/readyz")
def readyz():
    def ready(base_url, path):
        try:
            if requests.get(urljoin(base_url, path), timeout=2,
                            allow_redirects=False, verify=ca_verify).ok:
                return True
        except requests.exceptions.RequestException:
            pass
        return False

    dependencies = {"token_issuer": ready(token_url, issuer_ready_path)}
    for i, t in enumerate(targets):
        dependencies[f"target_{i}"] = ready(t, "/readyz")

    return ({d: "READY" if ready else "NOT READY"
             for d, ready in dependencies.items()},
            200 if all(dependencies.values())
            else 503)


def get_value(v):
    return v["value"] if isinstance(v, dict) else v

def flatten_nested(data):
    out = {}
    _flatten_nested_inner(out, [], data)
    return out

def _flatten_nested_inner(out: dict, path: list[str], data):
    if isinstance(data, dict):
        for key, value in data.items():
            _flatten_nested_inner(out, path + [key], value)
    elif isinstance(data, list):
        for key, value in enumerate(data):
            _flatten_nested_inner(out, path + [str(key)], value)
    else:
        if isinstance(data, bool):
            data = int(data)
        if data is not None:
            out['.'.join(path)] = data


def convert_v3(message):
    app_id = message["end_device_ids"]["application_ids"][
        "application_id"].lower()
    dev_id = message["end_device_ids"]["device_id"].lower()
    dev_eui = message["end_device_ids"]["dev_eui"].lower()
    result_time = message["received_at"]
    gateways = len(message["uplink_message"]["rx_metadata"])
    msg_items = flatten_nested(message["uplink_message"]["decoded_payload"])
    result = {
        "resultTime": result_time,
        "sourcePath": {
            "appid": app_id,
            "devid": dev_id,
            "deveui": dev_eui,
        },
        "variables": msg_items,
        "gateways": gateways
    }
    if user_location := message["uplink_message"].get('locations', {}).get('user'):
        result["setLocation"] = {
            "latitude": user_location["latitude"],
            "longitude": user_location["longitude"],
        }
    return result


def convert_default(message):
    return convert_v3(message)


def convert_element(message):
    app_id = message["app_id"].lower()
    dev_id = message["dev_id"].lower()
    dev_eui = message["hardware_serial"].lower()
    result_time = message["metadata"]["time"]
    msg_items = {
        k: get_value(v)
        for (k, v) in message["payload_fields"].items()
    }
    result = {
        "resultTime": result_time,
        "sourcePath": {
            "appid": app_id,
            "devid": dev_id,
            "deveui": dev_eui,
        },
        "variables": msg_items,
    }

    if message["metadata"]["latitude"] and message["metadata"]["longitude"]:
        result["setLocation"] = {
            "latitude": float(message["metadata"]["latitude"]),
            "longitude": float(message["metadata"]["longitude"])
        }

    return result

def convert_regiopole(message):
    app_id = message["device_ids"]["application_id"].lower()
    dev_id = message["device_ids"]["device_id"].lower()
    dev_eui = message["device_ids"]["dev_eui"].lower()
    result_time = message["received_at"]
    msg_items = flatten_nested(message["decoded_payload"])
    result = {
        "resultTime": result_time,
        "sourcePath": {
            "appid": app_id,
            "devid": dev_id,
            "deveui": dev_eui,
        },
        "variables": msg_items
    }

    if loc := message.get("location"):
        result["setLocation"] = {
            "latitude": float(loc["latitude"]),
            "longitude": float(loc["longitude"])
        }

    return result


first_request = True


@app.route("/api/v1/sensordata",
           defaults={"convert": convert_default}, methods=["POST"])
@app.route("/api/v1/sensordata/v3",
           defaults={"convert": convert_v3}, methods=["POST"])
@app.route("/api/v1/sensordata/element",
           defaults={"convert": convert_element}, methods=["POST"])
@app.route("/api/v1/sensordata/regiopole",
           defaults={"convert": convert_regiopole}, methods=["POST"])

@openapi
def sensor_data(convert):
    global first_request
    if first_request:
        logging.info("Got first request 🥳")
        first_request = False

    oauth2_session = OAuth2Session(client=BackendApplicationClient(None))
    oauth2_session.verify = ca_verify
    try:
        oauth2_session.fetch_token(
            token_url,
            auth=lambda r: r,  # prevents OAuth2Session from overriding header
            headers={"Authorization": request.headers.get("Authorization")}, verify=ca_verify)
        logging.debug("token: %s", oauth2_session.token)
    except OAuth2Error:
        abort(401)

    message = request.json
    logging.debug("request: %s", message)
    msg = convert(message)
    if not msg:
        logging.warning("No processing scheme for Message: %s", message)
        abort(500)
    logging.debug("msg: %s", msg)

    for t in targets:
        response = oauth2_session.post(t, json=msg)
        if response.ok:
            logging.debug("response: %s %s", response, response.text)
        else:
            logging.info("response: %s %s", response, response.text)
            return response.text, response.status_code

    return "SUCCESS", 200


if __name__ == "__main__":
    targets = json.loads(os.environ["TARGETS"])
    token_url = urljoin(os.environ["AUTH_ISSUER"] + "/",
                        os.environ["AUTH_TOKEN_PATH"])
    issuer_ready_path = os.environ["AUTH_READY_PATH"]
    logging.info("starting server")
    serve(app, host="0.0.0.0", port=8091)
