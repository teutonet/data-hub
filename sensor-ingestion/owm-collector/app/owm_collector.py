'''For collecting weatherdata in the teuto.net datahub'''
import array
import time
import os
import logging
from typing import ClassVar
from datetime import datetime
from time import sleep
from dataclasses import dataclass
from owm_types import WeatherResponse
import snappy
import requests
import owm_pb2 as prometheus_pb2


ca_verify: bool | str = True
if local_ca_path := os.getenv("TRUST_LOCAL_CA_PATH"):
    ca_verify = local_ca_path


LOG_LEVEL = os.getenv("LOG_LEVEL") or "INFO"
logger = logging.getLogger(__name__)
logging.basicConfig( level=LOG_LEVEL)

def getenv_or_die(var) -> str: 
    env: str = os.getenv(var, "")
    if env == "":
        logger.error("required environment variable %s is missing!", var)
    return env

OWM_API_ENDPOINT = getenv_or_die("OWM_API_ENDPOINT")
KEYCLOAK_CLIENT_SECRET = getenv_or_die("KEYCLOAK_CLIENT_SECRET")
KEYCLOAK_BASE_URL = getenv_or_die("KEYCLOAK_BASE_URL")
KEYCLOAK_COLLECTOR_CONFIG_ENDPOINT = KEYCLOAK_BASE_URL + "/realms/udh/data-hub/owm-configs"
PROMETHEUS_SERVICE_URL = getenv_or_die("PROMETHEUS_SERVICE_URL")
UNIT="metric"
@dataclass
class OWMData:
    '''Dataclass of what is send to Prometheus'''
    tenant: str
    project: str
    collector_name: str
    temp: float
    pressure: int
    humidity: int
    wind_speed: float
    wind_deg: int
    clouds: int

    def extract_metrics(self)-> list:
        return [
            ("up", 1),
            ("air_temperature_degrees_celsius", self.temp),
            ("air_pressure_mbar", self.pressure),
            ("releative_humidity_percents", self.humidity),
            ("wind_speed_meters_per_second", self.wind_speed),
            ("wind_direction_degrees", self.wind_deg),
            ("cloudage_percent", self.clouds),
        ]

@dataclass
class OWMCollector:
    '''A Class for getting the Weather from the OpenWeatherMap Current Weather API'''
    tenant: str
    project: str
    token: str
    longitude: float
    latitude: float
    name: str
    interval: int
    _last_calls: ClassVar[dict] = {}

    def __post_init__(self):
        self.key = (self.tenant, self.project, self.name)
        if self.key not in OWMCollector._last_calls:
            OWMCollector._last_calls[self.key] = time.time()
    def get_weather(self) -> OWMData | None:
        if OWMCollector._last_calls[self.key] + float(self.interval) <= time.time():
            OWMCollector._last_calls[self.key] = time.time()
            logger.debug("Interval has hit for %s time: %s", self.key, datetime.now())
            try:
                res = requests.get(OWM_API_ENDPOINT, params={
                    "lat": self.latitude,
                    "lon": self.longitude,
                    "appid": self.token,
                    "units": UNIT,
                },
                timeout=10)
                res.raise_for_status()
                weather: WeatherResponse = res.json()
                logger.debug("got weather for %s time: %s", self.key, datetime.now())
                return OWMData(
                    self.tenant, 
                    self.project,
                    self.name,
                    weather["main"]["temp"] , 
                    weather["main"]["pressure"],
                    weather["main"]["humidity"],
                    weather["wind"]["speed"],
                    weather["wind"]["deg"],
                    weather["clouds"]["all"],
                )
            except requests.exceptions.RequestException:
                logger.warning("Not able to get weather for %s time: %s", self.key, datetime.now(), exc_info=True)
                return None
        else:
            logger.debug("Interval has not been hit yet")
            return None
    @classmethod
    def get_all_last_calls(cls) -> dict:
        return cls._last_calls
class KeycloakClient:
    '''Class for sending authenicated requests to Keycloak'''
    def __init__(self, base_url, realm, client_id, client_secret):
        self.base_url = base_url.rstrip('/')
        self.realm = realm
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token"
        self.access_token = None
        self.expires_at = 0

    def authenticate(self):
        try:
            response = requests.post(
                self.token_url,
                data={
                    'grant_type': 'client_credentials',
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                },
                verify=ca_verify,
                timeout=10
            )
            response.raise_for_status()
            token_data = response.json()
            self.access_token = token_data['access_token']
            self.expires_at = time.time() + token_data['expires_in'] - 10 # Buffer time
        except requests.exceptions.RequestException:
            logger.warning("Not able to get valid token", exc_info=True)


    def get_token(self)-> str | None:
        if not self.access_token or time.time() >= self.expires_at:
            self.authenticate()
        return self.access_token

    def make_request(self, method, url, **kwargs) -> dict:
        headers = kwargs.get('headers', {})
        headers['Authorization'] = f"Bearer {self.get_token()}"
        kwargs['headers'] = headers
        response = requests.request(method, url, **kwargs, verify=ca_verify, timeout=10)
        response.raise_for_status()
        return response.json()
    
class PrometheusClient:
    '''Class for sending weather data to prometheus'''
    def __init__(self,url):
        self.url = url
    def create_metric(self, owmData: OWMData):
        current_time_unix = int(time.time() * 1000)
        write_request = prometheus_pb2.WriteRequest()

        for metric_type, value in owmData.extract_metrics():
            timeseries = write_request.timeseries.add()

            metric_name_label = timeseries.labels.add()
            metric_name_label.name = "__name__"
            metric_name_label.value = metric_type

            collector_label = timeseries.labels.add()
            collector_label.name = "appid"
            collector_label.value = "owm"

            collector_label = timeseries.labels.add()
            collector_label.name = "collector_name"
            collector_label.value = owmData.collector_name

            sample = timeseries.samples.add()
            sample.timestamp = current_time_unix
            sample.value = float(value)

        return write_request


    def send_request(self,tenant: str, project: str, write_request):
        headers = {
            "Content-Encoding": "snappy",
            "Content-Type": "application/x-protobuf",
            "X-Prometheus-Remote-Write-Version": "0.1.0",
            "X-Scope-OrgID": f"{tenant}.{project}",
            "User-Agent": "owm-collector"
        }
        uncompressed = write_request.SerializeToString()
        compressed = snappy.compress(uncompressed)
        try:
            requests.post(self.url, data=compressed, headers=headers, timeout=10)
        except requests.exceptions.RequestException:
            logger.warning("Could not send data to Prometheus", exc_info=True)

class OWMCollectorController:
    '''Class to create and manage OWMCollector-instances'''
    def __init__(self, keycloak_client: KeycloakClient, prometheus_client: PrometheusClient):
        self.owm_collectors: list[OWMCollector] = []
        self.keycloak_client = keycloak_client
        self.prometheus_client = prometheus_client

    def get_owm_collectors(self):
        logger.info("requesting Collector configs...")
        self.owm_collectors = []
        collector_dict = self.keycloak_client.make_request(
            "GET",
            KEYCLOAK_COLLECTOR_CONFIG_ENDPOINT
        )
        logger.info("got %s Collector configs...", len(collector_dict))
        self.owm_collectors = [OWMCollector(**collector) for collector in collector_dict]

    def run(self):
        while True:
            self.get_owm_collectors()
            for collector in self.owm_collectors:
                try:
                    weather: OWMData|None = collector.get_weather()
                    if weather:
                        write_request = self.prometheus_client.create_metric(weather)
                        logger.debug(
                            "Writing weather to Prometheus for %s time: %s",
                            collector.key,
                            datetime.now())
                        self.prometheus_client.send_request(
                            collector.tenant,
                            collector.project,
                            write_request
                        )
                except Exception:
                    logger.error(
                        "Could not execute collector %s",
                        collector.key,
                        exc_info=True)
            sleep(1)

if __name__ == '__main__':
    owm_keycloak_client = KeycloakClient(
        base_url=KEYCLOAK_BASE_URL,
        realm="udh",
        client_id="owm-collector",
        client_secret=KEYCLOAK_CLIENT_SECRET,
    )

    owm_prometheus_client = PrometheusClient(PROMETHEUS_SERVICE_URL)

    OWMCollectorController(
        owm_keycloak_client,
        owm_prometheus_client
    ).run()
