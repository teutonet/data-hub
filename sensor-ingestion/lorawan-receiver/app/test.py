import sys

if 'unittest' in sys.modules.keys():
    from lorawan_receiver import convert_v3, convert_element, convert_regiopole
import unittest

test_message_v3 = {
    "end_device_ids": {
        "device_id": "example-devid",
        "application_ids": {
            "application_id": "example-appid"
        },
        "dev_eui": "example-deveui",
    },
    "received_at": "2001-02-03T04:05:06.789Z",
    "uplink_message": {
        "rx_metadata": [{}],
        "decoded_payload": {
            "some label": "some-label-value",
            "some sensor": {"value": 123, "vanish": None},
            "some boolean": True,
        },
        "locations": {
            "user": {
                "latitude": 37.97155556731436,
                "longitude": 23.72678801175413,
                "altitude": 10,
                "source": "SOURCE_REGISTRY"
            }
        },
    }
}

test_message_element = {
    "app_id": "example-appid",
    "dev_id": "example-devid",
    "hardware_serial": "example-deveui",
    "payload_fields": {
        "some sensor": {
            "value": "123"
        },
        "some label": {
            "value": "some-label-value"
        }
    },
    "metadata": {
        "time": "2001-02-03T04:05:06.789Z",
        "latitude": "1.23",
        "longitude": "4.56"
    }
}

test_message_regiopole = {
    "device_ids": {
        "device_id": "example-devid",
        "application_id": "example-appid",
        "dev_eui": "example-deveui",
        "join_eui": "abc"
    },
    "received_at": "2001-02-03T04:05:06.789Z",
    "decoded_payload": {
        "some label": "some-label-value",
        "some sensor": 123,
    },
    "location": {
        "latitude": 1.23,
        "longitude": 4.56
    }
}


class TestLorawanReceiver(unittest.TestCase):

    def test_convert_message_v3(self):
        self.assertDictEqual(
            {"resultTime": "2001-02-03T04:05:06.789Z",
             "sourcePath": {"appid": "example-appid",
                            "devid": "example-devid",
                            "deveui": "example-deveui"},
             "variables": {"some label": "some-label-value",
                           "some sensor.value": 123,
                           "some boolean": 1},
             "setLocation": {
                "latitude": 37.97155556731436,
                "longitude": 23.72678801175413,
             },
             "gateways": 1},
            convert_v3(test_message_v3))

    def test_convert_message_element(self):
        self.assertDictEqual(
            {"resultTime": "2001-02-03T04:05:06.789Z",
             "sourcePath": {"appid": "example-appid",
                            "devid": "example-devid",
                            "deveui": "example-deveui"},
             "variables": {"some label": "some-label-value",
                           # gets converted later, we just leave it as string
                           "some sensor": "123"},
             "setLocation": {"latitude": 1.23,
                             "longitude": 4.56}},
            convert_element(test_message_element))

    def test_convert_message_regiopole(self):
        self.assertDictEqual(
            {"resultTime": "2001-02-03T04:05:06.789Z",
             "sourcePath": {"appid": "example-appid",
                            "devid": "example-devid",
                            "deveui": "example-deveui"},
             "variables": {"some label": "some-label-value",
                           "some sensor": 123},
             "setLocation": {"latitude": 1.23,
                             "longitude": 4.56}},
            convert_regiopole(test_message_regiopole))
