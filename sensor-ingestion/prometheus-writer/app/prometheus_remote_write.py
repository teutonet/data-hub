import json
import logging
import os
import time
from copy import deepcopy
from datetime import datetime
from urllib.parse import urljoin

import snappy
import requests

from prometheus_pb2 import WriteRequest
import pygeohash as gh
from flask import Flask, request, abort
import requests.sessions
from waitress import serve
from openapi_core.contrib.flask.decorators import FlaskOpenAPIViewDecorator
from jsonschema_path import SchemaPath


GET_THING_WITH_PROPERTIES_QUERY = """
query Properties($deveui: String!) {
    things(condition: { deveui: $deveui }) {
        id
        appid
        devid
        deveui
        name
        lat
        long
        geohash
        locationname
        project
        status
        lastValues
        sensor {
            id
            name
            sensorProperties {
                alias
                writeDelta
                property {
                    metricName
                    name
                }
            }
        }
        thingOffsets {
            metricName
            offsetType
            offsetValue
        }
        customLabels
    }
}
"""

ACCESS_TO_PROJECTS_QUERY = """
query accessToProjects {
    accessToProjects
}
"""

SAME_SHAPE_QUERY = """
query sameShape($propertyNames: [String]) {
    findForPropertySuperset(propertyNames: $propertyNames)
}
"""

CREATE_THING_MUTATION = """
mutation createThing(
    $appid: String!
    $deveui: String!
    $devid: String!
    $sensorId: UUID
    $project: String!
    $name: String!
    $payload: JSON
    $lat: BigFloat
    $long: BigFloat
    ) {
    createThing(
        input: {
            thing: {
                project: $project
                name: $name
                sensorId: $sensorId
                appid: $appid
                deveui: $deveui
                devid: $devid
                status: "created"
                payload: $payload
                lat: $lat
                long: $long
            }
        }
    ) {
        clientMutationId
    }
}
"""


UPDATE_PAYLOAD_MUTATION = """
mutation updatePayload($id: UUID!, $payload: JSON!, $lastValues: JSON!) {
    updateThing(input: {patch: {payload: $payload, lastValues: $lastValues}, id: $id}) {
        clientMutationId
    }
}
"""

logging.basicConfig(level=os.environ.get("LOGLEVEL", "INFO").upper())

forward_token = os.environ.get("FORWARD_TOKEN", "false") == "true"

always_update_payload = os.environ.get("ALWAYS_UPDATE_PAYLOAD", "false") == "true"

app = Flask(__name__)
openapi = FlaskOpenAPIViewDecorator.from_spec(
    SchemaPath.from_file_path("write.yaml"))

ca_verify: bool | str = True
if local_ca_path := os.getenv("TRUST_LOCAL_CA_PATH"):
    ca_verify = local_ca_path

print(ca_verify)

@app.route("/livez")
def livez():
    return "I am alive."


@app.route("/readyz")
def readyz():
    def ready(base_url, path):
        try:
            if requests.get(urljoin(base_url, path), timeout=4,
                            allow_redirects=False, verify=ca_verify).ok:
                return True
        except requests.exceptions.RequestException:
            pass
        return False

    dependencies = {
        "mdb": ready(mdb_url, "/readyz"),
        "prometheus": ready(prometheus_url, prometheus_ready_path)
    }

    return ({d: "READY" if ready else "NOT READY"
             for d, ready in dependencies.items()},
            200 if all(dependencies.values())
            else 503)


def write(msg, project):
    logging.debug("writing to %s: %s", project, msg)
    write_request = WriteRequest()
    series = write_request.timeseries.add()

    for label in msg["labels"]:
        series_label = series.labels.add()
        series_label.name = label
        series_label.value = str(msg["labels"][label])

    sample = series.samples.add()
    sample.value = msg["value"]
    sample.timestamp = msg["timestamp"]

    uncompressed = write_request.SerializeToString()
    compressed = snappy.compress(uncompressed)

    headers = {
        "Content-Encoding": "snappy",
        "Content-Type": "application/x-protobuf",
        "X-Prometheus-Remote-Write-Version": "0.1.0",
        "X-Scope-OrgID": project,
        "User-Agent": "metrics-worker"
    }
    if forward_token:
        headers["Authorization"] = request.headers.get("Authorization")
    logging.debug("write headers: %s", headers)
    try:
        response = requests.post(prometheus_url, headers=headers,
                                 data=compressed, verify=ca_verify)
        if not response.ok:
            logging.error("error posting to prometheus: %s %s %s", response,
                          response.text, msg)
    except Exception as e:
        logging.error("Exception while posting: %s", e)


first_request = True


@app.route("/api/v1/write", methods=["POST"])
@openapi
def message_received():
    global first_request
    if first_request:
        logging.info("Got first request 🥳")
        first_request = False

    request_payload = request.json
    logging.debug("request: %s", request_payload)

    source_path = request_payload["sourcePath"]
    deveui = source_path["deveui"]
    authorization_header = request.headers.get("Authorization")

    def do_graphql(query: str, variables):
        mdb_request_args = dict(url=mdb_url,
                                json={"query": query,
                                    "variables": variables},
                                # this is just an adapter
                                # mdb validates token and performs authorization
                                headers={"Authorization": authorization_header})
        logging.debug("mdb request: %s", mdb_request_args)

        mdb_response = requests.post(**mdb_request_args)

        if mdb_response.status_code == 200:
            logging.debug("mdb response: %s", mdb_response)
        elif mdb_response.status_code in [401, 403]:
            logging.warning("authentication problem in mdb request: %s %s %s",
                            mdb_response, mdb_response.text,
                            authorization_header)
            # something is wrong with the token, tell the client
            abort(mdb_response.status_code, "Check your token")
        else:
            logging.error("unexpected response from mdb: %s %s", mdb_response,
                        mdb_response.text)
            abort(500)
        return mdb_response.json()

    things = do_graphql(GET_THING_WITH_PROPERTIES_QUERY, {"deveui": deveui})["data"]["things"]

    if len(things) == 0:
        # try creating a thing
        # projects needs to be unambiguous
        access_to_projects = do_graphql(ACCESS_TO_PROJECTS_QUERY, {})["data"]["accessToProjects"]
        if len(access_to_projects) != 1:
            logging.warning('tried to create new thing for %s but token has multiple projects: %s', deveui, access_to_projects)
            abort(400, "can't create thing, multiple projects")
        # Try to find a thing that matches the shape 
        sensor_ids = do_graphql(SAME_SHAPE_QUERY, {"propertyNames": list(request_payload["variables"].keys())})["data"]["findForPropertySuperset"]
        sensor_id = None
        if len(sensor_ids) == 1:
            sensor_id = sensor_ids[0]
        else:
            logging.info("tried to guess sensor_id for deveui %s but got %d responses", deveui, len(sensor_ids))

        longitude = None
        latitude = None
        if set_location := request_payload.get("setLocation"):
            longitude = set_location["longitude"]
            latitude = set_location["latitude"]

        response = do_graphql(CREATE_THING_MUTATION, {
                "appid": source_path["appid"],
                "deveui": source_path["deveui"],
                "devid": source_path["devid"],
                "sensorId": sensor_id,
                "project": access_to_projects[0],
                "name": f"auto-{source_path['deveui']}",
                "payload": json.dumps(request_payload),
                "lat": latitude,
                "long": longitude,
            })
        
        logging.debug('created thing, got %s', response)
        return "SUCCESS", 200

    # TODO should deveui be unique?
    thing = things[0]

    try:
        last_values = json.loads(thing["lastValues"] or "{}")
    except:
        last_values = {}

    updated_last_values = last_values.copy()

    for key, value in request_payload["variables"].items():
        updated_last_values[key] = {"value": value, "time": round(time.time_ns() / 1_000_000)}

    # if always_update_payload:
    do_graphql(UPDATE_PAYLOAD_MUTATION, {"id": thing["id"], "payload": json.dumps(request_payload), "lastValues": json.dumps(updated_last_values)})


    if thing["status"] != "activated":
        logging.debug("got data for thing with deveui %s that is not yet activated", deveui)
    else:
        custom_labels_arr = thing["customLabels"]
        custom_labels = {}
        if custom_labels_arr:
            for custom_label_raw in custom_labels_arr:
                label_key, label_value = custom_label_raw.split(":", 1)
                custom_labels[label_key] = label_value
        for sample in create_samples(request_payload, source_path, thing, last_values,
                                    ooo_window=ooo_seconds, custom_labels=custom_labels):
            write(**sample)

    return "SUCCESS", 200


def legal_timestamp(ts, now, ooo_window):
    return min(max(now - ooo_window * 1000, ts), now)


def create_samples(request_payload, id_labels, thing_metadata, last_values,
                   now=None, ooo_window=0, custom_labels=None):
    now = now or round(time.time_ns() / 1000000)

    logging.debug("creating samples for %s %s %s", request_payload, id_labels,
                  thing_metadata)

    variables = request_payload["variables"]
    set_location = request_payload.get("setLocation")
    sensor = thing_metadata["sensor"]
    sensor_properties = sensor["sensorProperties"]
    thing_offsets = thing_metadata["thingOffsets"]

    labels = id_labels.copy()
    for label_property in filter(
            lambda sensor_property: not sensor_property["property"][
                "metricName"],
            sensor_properties):
        variable_name = (label_property["alias"]
                         or label_property["property"]["name"])
        if variable_name in variables:
            labels[label_property["property"]["name"]] = variables[
                variable_name]
        else:
            # TODO should this behavior be kept?
            # was this used for attaching constant labels to sensors
            labels[variable_name] = label_property["property"]["name"]
    if set_location and len(set_location) > 0:
        labels["geohash"] = gh.encode(longitude=set_location["longitude"],
                                      latitude=set_location["latitude"],
                                      precision=12)
    elif thing_metadata["geohash"]:
        labels["geohash"] = thing_metadata["geohash"]

    if locationname := thing_metadata["locationname"]:
        labels["location"] = locationname

    if name := thing_metadata["name"]:
        labels["name"] = name

    labels["sensortype_id"] = sensor["id"]

    labels = custom_labels | labels

    ts = round(datetime.fromisoformat(
        request_payload["resultTime"]).timestamp() * 1000)
    base_msg = {
        "labels": labels,
        "timestamp": legal_timestamp(ts, now, ooo_window)
    }
    samples = []
    for metric_property in filter(
            lambda sensor_property: sensor_property["property"]["metricName"],
            sensor_properties):
        variable_name = (metric_property["alias"] or
                         metric_property["property"]["name"])
        if variable_name in variables:
            # write metric as is
            metric_name = metric_property["property"]["metricName"]
            msg = deepcopy(base_msg)
            if not isinstance(variables[variable_name], int):
                variables[variable_name] = float(variables[variable_name])
            msg["value"] = variables[variable_name]
            msg["labels"]["__name__"] = metric_name
            samples.append(dict(msg=msg, project=thing_metadata["project"]))

            offset = next((x for x in thing_offsets if x["metricName"] == metric_name), None)

            if offset is not None:
                offset_value = float(offset["offsetValue"])
                operation = offset["offsetType"]
                
                msg = deepcopy(base_msg)
                current_value = variables[variable_name]
                match operation:
                    case "ADD":
                        msg["value"] = current_value + offset_value
                    case "SUB":
                        msg["value"] = current_value - offset_value
                    case "MULT":
                        msg["value"] = current_value * offset_value
                    case "DIV":
                        msg["value"] = current_value / offset_value
                    case _:
                        logging.error("Unexpected offset type: %s", operation)
                        continue
                
                msg["labels"]["__name__"] = metric_name + '_with_offset'
                samples.append(dict(msg=msg, project=thing_metadata["project"]))

            # write delta if requested as separate metric
            if metric_property["writeDelta"]:
                msg = deepcopy(base_msg)
                if (last_value := last_values.get(variable_name)) is not None and 'value' in last_value:
                    current_value = variables[variable_name]
                    if last_value['value'] <= current_value:
                        diff = current_value - last_value['value']
                    else:
                        # counters can reset
                        diff = current_value
                    msg["value"] = diff
                    msg["labels"]["__name__"] = metric_name + '_delta'
                    samples.append(dict(msg=msg, project=thing_metadata["project"]))

    logging.debug("samples: %s", samples)
    return samples


if __name__ == '__main__':
    mdb_url = os.environ["MDB_URL"]
    prometheus_url = os.environ["PROMETHEUS_URL"]
    prometheus_ready_path = os.environ["PROMETHEUS_READY_PATH"]
    ooo_seconds = int(os.environ["OUT_OF_ORDER_SECONDS"])

    logging.info("starting server")
    serve(app, host="0.0.0.0", port=8091)
