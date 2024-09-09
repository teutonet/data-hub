from datetime import UTC, datetime

class SensorType:
  def __init__(self, name: str, project: str, name_to_metric: dict[str, str]):
    self.name = name
    self.project = project
    self.name_to_metric = name_to_metric
  
  def ensure_exists_get_id(self, client) -> str:
    find_sensor_type = """
    query findSensor($name: String!) {
      sensors(condition: {name: $name}) {
        id
        sensorProperties {
          alias
          property {
            id
            metricName
            name
          }
        }
      }
    }
    """
    sensors = client.post(url="https://mdb-frontend.data-hub.local/graphql",
                                json={"query": find_sensor_type,
                                      "variables": {
                                        "name": self.name,
                                        "project": self.project,
                                      }}).json()["data"]["sensors"]
    if len(sensors) == 1:
      sensortype_id = sensors[0]["id"]
      get_sensor_properties = """
      query sensorProperties($project: String!, $sensorId: UUID!) {
        sensorProperties(condition: {project: $project, sensorId: $sensorId}) {
          property {
            id
            metricName
            name
          }
          alias
        }
      }
      """
      sensor_properties = client.post(url="https://mdb-frontend.data-hub.local/graphql",
                                json={"query": get_sensor_properties,
                                      "variables": {
                                        "sensorId": sensortype_id,
                                        "project": self.project,
                                      }}).json()["data"]["sensorProperties"]
      current_properties = [{"name": prop['alias'] or prop['property']['name'], "metric": prop['property']['metricName'], "id": prop['property']['id']} for prop in sensor_properties]
    else:
      create_sensor_type = """
      mutation createSensor($name: String!, $project: String!) {
        createSensor(input: {sensor: {project: $project, name: $name}}) {
          sensor {
            id
          }
        }
      }
      """
      sensortype_id = client.post(url="https://mdb-frontend.data-hub.local/graphql",
                                json={"query": create_sensor_type,
                                      "variables": {
                                        "name": self.name,
                                        "project": self.project,
                                      }}).json()["data"]["createSensor"]["sensor"]["id"]
      current_properties = []
    
    # delete unwanted sensor properties
    for current_prop in current_properties:
      if self.name_to_metric.get(current_prop["name"]) != current_prop["metric"]:
        # TODO delete
        print(f"would delete {current_prop['id']} {sensortype_id}")
    
    get_properties_query = """
    query properties {
      properties {
        id
        metricName
        name
        project
      }
    }
    """
    properties = client.post(url="https://mdb-frontend.data-hub.local/graphql",
                              json={"query": get_properties_query,
                                    }).json()["data"]["properties"]
    properties_by_metric = {
      prop['metricName']: (prop['id'], prop['name']) for prop in properties if prop['project'] is None or prop['project'] == self.project 
    }
    # create properties
    for prop_name, metric in self.name_to_metric.items():
      # check if sensor property already exists
      if any((prop_name == cur_prop['name'] and metric == cur_prop['metric'] for cur_prop in current_properties)):
        print(f'prop {prop_name} {metric} already exists')
      else:
        # check if a property with the correct metric already exists
        if (prop := properties_by_metric.get(metric)):
          pass
        else:
          # create property
          create_property_query = """
          mutation createProperty($metricName: String!, $name: String!, $project: String!) {
            createProperty(
              input: {property: {name: $name, metricName: $metricName, project: $project}}
            ) {
              property {
                id
              }
            }
          }
          """
          res = client.post(url="https://mdb-frontend.data-hub.local/graphql",
                                json={"query": create_property_query,
                                      "variables": {
                                        "name": prop_name,
                                        "project": self.project,
                                        "metricName": metric,
                                      }}).json()
          print(res)
          property_id = res["data"]["createProperty"]["property"]["id"]
          prop = (property_id, prop_name)
        # create sensor property
        create_sensor_property_query = """
        mutation createSensorProperty($sensorId: UUID!, $propertyId: UUID!, $project: String!, $alias: String) {
          createSensorProperty(
            input: {sensorProperty: {project: $project, sensorId: $sensorId, propertyId: $propertyId, alias: $alias}}
          ) {
            clientMutationId
          }
        }
        """
        client.post(url="https://mdb-frontend.data-hub.local/graphql",
                              json={"query": create_sensor_property_query,
                                    "variables": {
                                      "project": self.project,
                                      "sensorId": sensortype_id,
                                      "propertyId": prop[0],
                                      "alias": None if prop_name == prop[1] else prop_name,
                                    }})

    return sensortype_id

class Thing:
  def __init__(self, project: str, name: str, sensortype_id: str, deveui: str, latitude: float, longitude: float) -> None:
    self.project = project
    self.name = name
    self.sensortype_id = sensortype_id
    self.deveui = deveui
    self.latitude = latitude
    self.longitude = longitude
  
  def ensure_exists(self, client, thing_list):
    if existing := next((x['deveui'] == self.deveui and x['project'] == self.project for x in thing_list), None):
      pass
    else:
      create_thing_query = """
      mutation createThing($deveui: String!, $project: String!, $name: String!, $sensorId: UUID!, $lat: BigFloat!, $long: BigFloat!) {
        createThing(
          input: {thing: {project: $project, name: $name, sensorId: $sensorId, status: "activated", deveui: $deveui, long: $long, lat: $lat}}
        ) {
          thing {
            id
          }
        }
      }
      """
      client.post(url="https://mdb-frontend.data-hub.local/graphql",
                            json={"query": create_thing_query,
                                  "variables": {
                                    "deveui": self.deveui,
                                    "project": self.project,
                                    "name": self.name,
                                    "sensorId": self.sensortype_id,
                                    "lat": self.latitude,
                                    "long": self.longitude,
                                  }})
  
  def calc_variables(self) -> None | dict[str, str | int | float]:
    return None
  
  def get_payload(self):
    if variables := self.calc_variables():
      return {
        "resultTime": datetime.now(tz=UTC).isoformat(),
        "sourcePath": {
          "deveui": self.deveui,
          "devid": '',
          "appid": ''
        },
        "variables": variables
      }
  
  # formatted for the element endpoint
  def get_element_payload(self):
    if variables := self.calc_variables():
      return {
        "app_id": '',
        "dev_id": '',
        "hardware_serial": self.deveui,
        "payload_fields": {k: {"value": v} for k, v in variables.items()},
        "metadata": {
          "time": datetime.now(tz=UTC).isoformat(),
          "latitude": str(self.latitude),
          "longitude": str(self.longitude),
        }
      }
  
  # formatted for the regiopole endpoint
  def get_regiopole_payload(self):
    if variables := self.calc_variables():
      return {
        'device_ids': {
          'device_id': '',
          'application_id': '',
          'dev_eui': self.deveui,
          'join_eui': ''
          },
          'received_at': datetime.now(tz=UTC).isoformat(),
          'decoded_payload': variables,
          'location': {
            'latitude': str(self.latitude),
            'longitude': str(self.longitude)
            }
          }

def get_all_things(client):
  get_things_query = """
  query things {
    things {
      deveui
      project
      name
      long
      lat
      id
      sensorId
      status
    }
  }
  """
  return client.post(url="https://mdb-frontend.data-hub.local/graphql",
                        json={"query": get_things_query}).json()['data']['things']
