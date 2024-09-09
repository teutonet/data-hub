import random
from oauthlib.oauth2 import BackendApplicationClient
import requests
from requests_oauthlib import OAuth2Session
from os import environ
import time
from fakesensors import SensorType, Thing, get_all_things

class FakeWasteBin(Thing):
  def __init__(self, project: str, name: str, sensortype_id: str, deveui: str, latitude: float, longitude: float) -> None:
    super().__init__(project, name, sensortype_id, deveui, latitude, longitude)
    self.fill_rate = random.randint(1, 5)
    self.fill_percent = random.randint(0, 100)
  
  def calc_variables(self) -> None | dict[str, str | int | float]:
    if self.fill_percent >= 100:
      if random.randint(0, 3) == 0:
        self.fill_percent = 0
    else:
      self.fill_percent += random.randint(0, self.fill_rate)


    return {
      "FILL": self.fill_percent,
    }

if __name__ == '__main__':
  client_id = environ["CLIENT"]
  client_secret = environ["SECRET"]
  project = environ["PROJECT"]

  oauth2_session = OAuth2Session(client=BackendApplicationClient(client_id))
  oauth2_session.fetch_token('https://login.data-hub.local/realms/udh/protocol/openid-connect/token', client_secret=client_secret, verify=False)

  oauth2_session.verify = False

  waste_bin_type = SensorType("Waste Bin", project, {
    "FILL": "waste_fill_percent",
  })

  waste_bin_type_id = waste_bin_type.ensure_exists_get_id(oauth2_session)

  things: list[Thing] = []

  existing_thing_list = get_all_things(oauth2_session)

  things.append(FakeWasteBin(project=project, name="node/4032064550", sensortype_id=waste_bin_type_id, deveui="node/4032064550", latitude=52.0221612, longitude=8.5317693))
  things.append(FakeWasteBin(project=project, name="node/4032064553", sensortype_id=waste_bin_type_id, deveui="node/4032064553", latitude=52.0223168, longitude=8.5324007))
  things.append(FakeWasteBin(project=project, name="node/2698386960", sensortype_id=waste_bin_type_id, deveui="node/2698386960", latitude=52.0224396, longitude=8.532667))
  things.append(FakeWasteBin(project=project, name="node/10006448806", sensortype_id=waste_bin_type_id, deveui="node/10006448806", latitude=52.0225938, longitude=8.5333142))
  things.append(FakeWasteBin(project=project, name="node/10006507296", sensortype_id=waste_bin_type_id, deveui="node/10006507296", latitude=52.0228109, longitude=8.533501))
  things.append(FakeWasteBin(project=project, name="node/4032109772", sensortype_id=waste_bin_type_id, deveui="node/4032109772", latitude=52.0212919, longitude=8.5327141))

  for thing in things:
    thing.ensure_exists(oauth2_session, existing_thing_list)

  while True:
    time.sleep(1)
    # oauth2_session.fetch_token('https://login.data-hub.local/realms/udh/protocol/openid-connect/token', client_secret=client_secret, verify=False)

    for thing in things:
      print(requests.post("https://api.data-hub.local/api/v1/sensordata/regiopole", auth=(client_id, client_secret), json=thing.get_regiopole_payload(), verify=False).text)
      # print(oauth2_session.post("https://api.data-hub.local/api/v1/write", json=thing.get_payload(), verify=False).text)
