import unittest

from prometheus_remote_write import create_samples


def create_samples_args():
    """
    Create basic test arguments for invoking create_samples.
    :return: dict of args
    """
    return dict(request_payload={"variables": {},
                                 "setLocation": {},
                                 "resultTime": "2023-11-14T22:30:00.999Z"},
                id_labels={"test_id_label": "test-id"},
                thing_metadata={"sensor": {"sensorProperties": []},
                                "geohash": None,
                                "project": "some-org"},
                ooo_window=60,
                now=1700001000999)



def add_metric(args):
    args["request_payload"]["variables"]["metric name"] = 123
    args["request_payload"]["variables"]["metric name 2"] = "123"
    args["thing_metadata"]["sensor"]["name"] = "sensor name"
    args["thing_metadata"]["sensor"]["sensorProperties"].append(
        {"property": {"metricName": "metric metric name",
                      "name": "metric name"},
         "alias": None})


class TestPrometheusWrite(unittest.TestCase):

    def test_no_samples(self):
        self.assertEqual([], create_samples(**create_samples_args()))

    def test_no_extra_labels(self):
        args = create_samples_args()
        add_metric(args)

        samples = create_samples(**args)

        self.assertDictEqual({**args["id_labels"],
                              "__name__": "metric metric name"},
                             samples[0]["msg"]["labels"])
        self.assertEqual(123,
                         samples[0]["msg"]["value"])

    def test_extra_labels(self):
        args = create_samples_args()
        args["request_payload"]["variables"]["label alias"] = "label value"
        add_metric(args)
        args["thing_metadata"]["sensor"]["sensorProperties"].append(
            {"property": {"metricName": None, "name": "label name"},
             "alias": "label alias"})

        samples = create_samples(**args)

        self.assertEqual(1, len(samples))
        self.assertDictEqual({**args["id_labels"],
                              "__name__": "metric metric name",
                              "label name": "label value"},
                             samples[0]["msg"]["labels"])

    def test_constant_label(self):
        args = create_samples_args()
        add_metric(args)
        args["thing_metadata"]["sensor"]["sensorProperties"].append(
            {"property": {"metricName": None,
                          "name": "constant label value from label name"},
             "alias": "label alias"})

        samples = create_samples(**args)

        self.assertEqual(1, len(samples))
        self.assertDictEqual(
            {**args["id_labels"],
             "__name__": "metric metric name",
             "label alias": "constant label value from label name"},
            samples[0]["msg"]["labels"])

    def test_multiple_samples(self):
        args = create_samples_args()
        args["request_payload"]["variables"]["metric1 name"] = 123
        args["request_payload"]["variables"]["second metric alias"] = 456
        args["thing_metadata"]["sensor"]["name"] = "sensor name"
        args["thing_metadata"]["sensor"]["sensorProperties"].append(
            {"property": {"metricName": "metric1 metric name",
                          "name": "metric1 name"},
             "alias": None})
        args["thing_metadata"]["sensor"]["sensorProperties"].append(
            {"property": {"metricName": "metric2 metric name",
                          "name": "metric2 name"},
             "alias": "second metric alias"})

        samples = create_samples(**args)

        self.assertEqual({"metric1 metric name": 123,
                          "metric2 metric name": 456},
                         {s["msg"]["labels"]["__name__"]: s["msg"]["value"]
                          for s in samples})

    def test_past_timestamp(self):
        args = create_samples_args()
        add_metric(args)
        args["request_payload"]["resultTime"] = "2023-11-14T22:29:00.999Z"

        samples = create_samples(**args)

        self.assertEqual(1700000940999,
                         samples[0]["msg"]["timestamp"])

    def test_too_old_timestamp(self):
        args = create_samples_args()
        add_metric(args)
        args["request_payload"]["resultTime"] = "2000-01-01T00:00:00.999Z"

        samples = create_samples(**args)

        self.assertEqual(1700000940999,
                         samples[0]["msg"]["timestamp"])

    def test_future_timestamp(self):
        args = create_samples_args()
        add_metric(args)

        # possible through wrong clock on some systems
        args["request_payload"]["resultTime"] = "2023-11-14T22:31:00.999Z"

        samples = create_samples(**args)

        # clamp date back to now
        self.assertEqual(1700001000999,
                         samples[0]["msg"]["timestamp"])