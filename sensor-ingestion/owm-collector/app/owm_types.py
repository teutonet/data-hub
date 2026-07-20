'''Fake OWM API Module for testing purposes'''
from typing import TypedDict, List

class Coord(TypedDict):
    '''Part of OWM-Fake API data'''
    lon: float
    lat: float

class Weather(TypedDict):
    '''Part of OWM-Fake API data'''

    id: int
    main: str
    description: str
    icon: str

class Main(TypedDict):
    '''Part of OWM-Fake API data'''

    temp: float
    feels_like: float
    temp_min: float
    temp_max: float
    pressure: int
    humidity: int
    sea_level: int
    grnd_level: int

class Wind(TypedDict):
    '''Part of OWM-Fake API data'''
    speed: float
    deg: int
    gust: float

Rain = TypedDict("Rain", {"1h": float})

class Clouds(TypedDict):
    '''Part of OWM-Fake API data'''
    all: int

class Sys(TypedDict):
    '''Part of OWM-Fake API data'''
    type: int
    id: int
    country: str
    sunrise: int
    sunset: int

class WeatherResponse(TypedDict):
    '''OWM-Fake API dataclass'''
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
