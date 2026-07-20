from typing import TypedDict, List
from urllib.parse import urlparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import random
import json

class Coord(TypedDict):
    lon: float
    lat: float

class Weather(TypedDict):
    id: int
    main: str
    description: str
    icon: str

class Main(TypedDict):
    temp: float
    feels_like: float
    temp_min: float
    temp_max: float
    pressure: int
    humidity: int
    sea_level: int
    grnd_level: int

class Wind(TypedDict):
    speed: float
    deg: int
    gust: float

Rain = TypedDict("Rain", {"1h": float}) 

class Clouds(TypedDict):
    all: int

class Sys(TypedDict):
    type: int
    id: int
    country: str
    sunrise: int
    sunset: int

class WeatherResponse(TypedDict):
    coord: Coord
    weather: List[Weather]
    base: str
    main: Main
    visibility: int
    wind: Wind
    rain: Rain
    clouds: Clouds
    dt: int
    sys: Sys
    timezone: int
    id: int
    name: str
    cod: int

def get_fake_weather_data() -> WeatherResponse:
    return {
        "coord": {
            "lon": 7.367,
            "lat": 45.133
        },
        "weather": [
            {
                "id": 501,
                "main": "Rain",
                "description": "moderate rain",
                "icon": "10d"
            }
        ],
        "base": "stations",
        "main": {
            "temp": random.uniform(-10, 40),
            "feels_like": random.uniform(-10, 40),
            "temp_min": random.uniform(-10, 40),
            "temp_max": random.uniform(-10, 40),
            "pressure": random.randint(1, 1100),
            "humidity": random.randint(0, 100),
            "sea_level": random.randint(1, 1100),
            "grnd_level": random.randint(1, 1100),
        },
        "visibility": 10000,
        "wind": {
            "speed": random.uniform(0, 30),
            "deg": random.randint(0, 360),
            "gust": random.uniform(0, 10)
        },
        "rain": {
            "1h": 2.73
        },
        "clouds": {
            "all": random.randint(0, 100)
        },
        "dt": 1726660758,
        "sys": {
            "type": 1,
            "id": 6736,
            "country": "IT",
            "sunrise": 1726636384,
            "sunset": 1726680975
        },
        "timezone": 7200,
        "id": 3165523,
        "name": "Province of Turin",
        "cod": 200
    }




OWM_API_ENDPOINT = os.getenv("OWM_API_ENDPOINT") or ""
endpoint_path = urlparse(OWM_API_ENDPOINT).path

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if endpoint_path and urlparse(self.path).path == endpoint_path:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(get_fake_weather_data()).encode())
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == '__main__':
    HTTPServer(("0.0.0.0", 5000), Handler).serve_forever()
