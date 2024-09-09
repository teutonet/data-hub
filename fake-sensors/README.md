# Fake Sensors

Fake sensors to send random data.

First, create a sensor credential, then use `CLIENT=<token username> SECRET=<token password> PROJECT=<project> python3 waste-baskets.py`

The scipt creates properties, sensortype, things and then pushes data to the prometheus writer api endpoint
