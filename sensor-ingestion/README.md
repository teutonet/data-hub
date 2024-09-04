# Sensor Ingestion

This project contains the image sources and Helm chart
needed to create a Kubernetes deployment for ingesting sensor data
and persisting it in various databases.

It is designed to be used within a larger deployment
that supplies the connected services and configures required secrets.

## How does this work?

```
+-----------------+    +-----------------+
| LoRaWAN service |    | further systems |  ...
+-----------------+    +-----------------+
  |                      Λ
  | HTTP request         | HTTP requests /
  | sensor data          | MQTT / ...
  V                      V
+------------------+   +-----------------------+
| LoRaWAN receiver |   | further input modules |  ...
+------------------+   +-----------------------+
                 |       |
           intermediate format
                 V       V
+-------------------+  +---------------------+
| Prometheus writer |  | SensorThings writer |  ...
+---+-------------+-+  +---------------------+
  | | Metadata DB |      |
  | +-------------+      |
  |                      |
  | remote write         |
  V                      V
+------------+         +--------------+
| Prometheus |         | SensorThings |  ...
+------------+         +--------------+
```

1. Various input modules receive sensor data from their respective sources.
1. All data in converted into a unified intermediate format.
1. Various write modules write the data to their respective target systems.

This project provides input and write modules and allows for additional ones to be integrated into the data flow.
It does not include or deploy implementations of the services that can be connected to, such as SSO, Prometheus-compatible databases, SensorThings Servers etc.

## Available Modules

input

- LoRaWAN
- OpenWeatherMap
- RTB
- RUDIS

write

- Prometheus
- SensorThings

## Authentication / Authorization

Requests from the LoRaWAN service (TTN / Chirpstack / ...) need a Basic Auth header to prevent malicious actors from writing arbitrary data into the system.
The credentials are used by the LoRaWAN receiver to obtain an access token through an OAuth 2.0 Client Credentials Grant.

The access token is then added to the requests to writer modules which in turn use it for their requests to further services like the Metadata DB and optionally write targets such as Prometheus.

The access token needs to be a signed JWT with a `projects` claim
that is used by the Metadata DB to limit the access of that request to a subset of the database through Row Level Security.

An example configuration for a client for use in Keycloak can be found [in doc/](./doc/keycloak-client-client-credentials.yaml)
and be tried easily in the included local test environment.

Example Python code that shows how to obtain access tokens using the [client credentials](./doc/token_client.py) or [username and password (deprecated)](./doc/token_direct.py)
from a CLI application and how to use it to query the Metadata DB is also included in doc/ (see linked files).
Further examples of how to obtain a token from your SSO service can be found in many readily available guides online.

The SensorThings writer currently uses static credentials to write all data that it receives without further checks.

The OpenWeatherMap, RTB, and RUDIS modules use access tokens obtained using statically configured client credentials to send the data to writer modules.

Make sure to use HTTPS for any URLs that will be used with any kind of authentication (at least for connections over insecure networks)!

## Metadata DB

### Overview

The database schema used in this project serves as the backbone for managing master data and metadata related to data input in the Urban Data Hub. The goal is to enrich individual data points, making them suitable for subsequent analysis and usage.

### Database Structure

The database structure is a fusion of a device table, primarily focused on LoRaWAN sensor technology, and the SensorThings format. The City of Paderborn decided to migrate from the FROST server to the Mimir database to address minor issues and enhance data availability and performance. The master data format was maintained during migration to facilitate seamless population of both Mimir (Prometheus) and the FROST server (SensorThings). It is possible to use the data structure as a master data basis for other systems and will be checked if necessary.

### Tables

#### Thing Table

Describes an entity of a sensor, e.g., a temperature sensor measuring humidity and air temperature, with an additional output for the remaining battery level.

#### Sensor Table

Contains the sensor type and specific data, such as the location of the datasheet.

#### Sensor_Property Table

An intermediary table that allows assigning an alias to a measurement value in the incoming data for a sensor, facilitating standardization to the format in the Properties table.

#### Properties Table

Stores standardized names of measurements, including units. If a property has a "metric name" field, it is used as a metric in Prometheus; otherwise, it is added as a label to measurement results. This will be streamlined in the future to simplify the model.

### Georeferencing

By adding a geohash as a label, each measurement result can be georeferenced. The geohash is calculated on-the-fly from latitude and longitude values, allowing for changing locations while keeping latitude/longitude and geohash constant.

### Planned Changes

Further changes in metadata within the master data are planned to make the format suitable for ETL processes for publication in CKAN.

### Schema

The detailed description of each data field is provided in the schema, ensuring consistency with ongoing database development.

### GraphQL

The GraphQL interface can be exposed through an Ingress.

The GraphQL interface enables users without direct access to the Kubernetes cluster to manage their assigned sensors. By exposing GraphQL through Ingress, users can interact with and manage their sensors seamlessly. This setup also facilitates platform-to-platform communication in this context.

To enable GraphQL access, configure the Ingress accordingly. This will grant users the ability to manage their sensors.

The ongoing development includes plans to integrate this GraphQL interface into a administrative interface for better usability and management capabilities.

## Helm Chart

A Helm chart is included.
It depends on [Flux](https://fluxcd.io/) to deploy it's dependencies.

## Data Routing

For each input module a list of write modules can be configured.
You can extend the system by specifying additional URLs.

## Local Development

A local development setup is available, see [test-env/README.md](./test-env/README.md).

## OpenAPI Schemas

The LoRaWAN receiver and the writer endpoints have an OpenAPI specification.
[SwaggerEditor](https://editor-next.swagger.io/) can help with editing.

## Network Policies

This chart comes with network policies which can be disabled through Helm values.

Since the chart aims to be portable it only uses standard Kubernetes network policies, not the advanced ones that come with CNIs such as Cilium or Calico.
There are two categories of network rules

- Rules that almost always make sense, such as only allowing database access from the component that should access the database, and denying egress from the database. These rules are always enabled unless you disable network policies in the values. If you need to allow more access, you can just create additional network policies.
- Rules that might be required depending on your deployment. For example allowing ingress from your ingress controller, allowing egress to external APIs, allowing access to a potentially out-of-cluster Prometheus endpoints. Leaving `broadAllowRules` enabled will allow very broad access by default (for details see [the Helm values](./charts/sensor-ingestion/values.yaml)). If you need finer policies consider disabling `broadAllowRules` and utilizing the specific functionality of your CNI to only allow ingress and egress from and to required endpoints, for example only allow the RTB receiver to connect to IPs obtained by resolving a specific hostname (this is not possible with standard portable network policies).

The included network policies select pods through [well-known labels](https://kubernetes.io/docs/reference/labels-annotations-taints/) and through custom labels marking a certain property of the pod within sensor-ingestion.
For additional network policies in your deployment you can use the same labels.
The currently used additional labels are

- `network-http=true`: This pod has to be accessible from the ingress controller to receive HTTP traffic defined in an Ingress
- `network-input=true`: This pod has to access writer pods to write sensor values
- `network-write=true`: This pod has to allow access from input pods to receive sensor values
- `network-no-egress=true`: This pod usually does not require any egress, including DNS resolution
- (`network-no-egress=true`: This pod is part of the development / test environment (not deployed with the chart itself), the test Helm chart allows all traffic for these pods. Do not use this label outside of test / development environments!)
- `network-release-name=YOUR_HELM_RELEASE`: The included network policies only restrict traffic to and from pods that are part of this sensor-ingestion release. This label is also configured for the dependencies deployed through Flux which do not directly belong to the Helm "release" of the included components.

Almost every component except the ones marked as `no-egress` require access to the OAuth2 endpoints, therefore no dedicated label has been added so far. If you wish to use fine-grained policies simply allow access from all components not labeled `no-egress`.

## Contributing

### Adding Modules

To add a module for data input or writing follow the following steps

1. Add the source code. Even if the component does not provide an external HTTP endpoint, adding two small HTTP routes for use in [Kubernetes probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) is a simple way to enable Kubernetes to check the current status of your component, see the linked Kubernetes documentation for details about readiness and liveness and the existing modules for examples. You can use existing modules as guides:
   - external HTTP endpoint => LoRaWAN receiver
   - other input such as a service connecting to MQTT => RTB receiver
   - CronJob that fetches data at certain times => OpenWeatherMap collector
1. Add your module in the list of directories in [the pipeline file](./.gitlab-ci.yml).
1. Add templates in [the `templates` directory of the Helm chart](./charts/sensor-ingestion/templates/). Again, using a similar module as a starting point can make it easier to get started. The [helper templates](./charts/sensor-ingestion/templates/_helpers.tpl) can and should be used to avoid unnecessary duplication where it makes sense and ensure a unified deployment. In most cases it should be sufficient to pick the suitable template and only add the module-specific environment variables.
1. Add suitable default values for the configurable aspects of your module in [values.yaml](./charts/sensor-ingestion/values.yaml). Use the same name as your module directory as the top-level values key but converted to `camelCase` to comply with Helm conventions and requirements and to enable the local development scripts to configure the locally built images without needing additional explicit mappings.
1. Extend the [Helm values schema](./charts/sensor-ingestion/values.schema.json) accordingly. This ensures that malformed values - be it because of typos or misunderstandings - are rejected immediately instead of causing errors that would be harder to debug.

### Code Formatting

To keep code formatting consistent, multiple programs are run as part of the CI pipeline.

Most files are checked with [Prettier](https://prettier.io/).
Since the pipeline currently uses ad-hoc images from nixery.dev, the used version is the version they provide.
You can find out the current version using `docker run nixery.dev/nodepackages.prettier prettier --version`.
To re-format files simply run `npx prettier@2.8.8 --write FILES...` (replace version).

### Release Script

Call `./release.sh` with the desired version number and follow the instructions. Trigger the Helm upload pipeline job manually in GitLab after pushing the tag.

The target Helm repository can be used as described in the [GitLab documentation](https://docs.gitlab.com/ee/user/packages/helm_repository/), for example `https://gitlab.com/api/v4/projects/51761909/packages/helm/main`.

### Commit requirements

All commits require a [DCO](https://developercertificate.org/) sign-off, which can be generated automatically by [calling `git commit` with `--signoff`](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---signoff).

Please include a body in the commit message if you think it helps others understand what you did and why.

Basic commit requirements are enforced by the pipeline, for details see [.conform.yaml](./.conform.yaml).
