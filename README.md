# UDH Platform

This repository contains the UDH Platform components and Helm chart.

The main task of the platform is to integrate the different components
and to provide a uniform authentication and authorization layer
as well as management infrastructure such as frontends.

## Authorization / Resources

see [Resources and Authorization](doc/resources_authorization.md])

## Applications Details

This details how the Data HUB concepts correspond to the application concepts.

### Grafana

An organization named `tenant:group` is created for each group.

For udh-sync to operate correctly please keep the "current organization" of the default admin account created by the Helm chart set to 1 / public.
This will be reset before each organization synchronization but changing it can cause problems and might cause users to temporarily be assigned to the wrong organizations.

In this README, the documentation for the data used by external Grafana data sources can be found in two specific locations. The regular data is documented in a [GitLab issue](https://gitlab.teuto.net/4teuto/dev/udh/teuto-data-hub/-/issues/194), which contains all relevant information and configuration details. This approach ensures transparent and traceable management of the data sources. On the other hand, the secret data is stored in a [SOPS-encrypted file](./charts/udh-platform/grafana-external-datasource-secrets.yaml) for security reasons. This file ensures that sensitive information remains protected and can only be decrypted and accessed by authorized users. Further details on handling and decrypting the SOPS file can also be found in this README.

### Mimir

Tenant IDs set through `X-Scope-OrgID` HTTP header correspond to a Data HUB project and are named `tenant:project`.

### sensor-ingestion MetadataDB

Projects are named `tenant:project`.

### Ceph Object Gateway S3 API

Bucket names correspond to Data HUB projects and are named `tenant.project`.

see [Object Storage](doc/object_storage.md])

## Operations

### Add Tenant

Using an admin user `PUT /tenants/XXX`, see [Resources and Authorization](doc/resources_authorization.md])

### Get LoRaWAN credentials for Project

`PUT /tenants/mytenant/projects/myproject/sensor-credentials/mycredential`, see [Resources and Authorization](doc/resources_authorization.md])

To use the credentials in a header from Chirpstack / TTN set the `Authorization` header to `Basic <base64'ed client:secret>`, e.g. `Basic bG9yYXdhbi10ZXN0OnRlc3Rwdw==` for the client `lorawan-test` and the secret `testpw`. See [RFC 7617](https://datatracker.ietf.org/doc/html/rfc7617) for details about the actual conversion including escaping.

### Add User

1. (Create the tenants and groups first, see Add Tenant.)
1. Log into Keycloak and add user with verified email address, assign groups. This can be done as a platform administrator or as a user with admin permissions for a group.
1. Set temporary password for user and send it to them over a secure channel.

## Development

### Debug Helm chart

Use `test-env/start.sh`.

### Helm Chart conventions

Use the [Bitnami Common](https://github.com/bitnami/charts/tree/main/bitnami/common) helpers as standard building blocks where it makes sense.

### Commit conventions

Make modifications via branches, only fast-foward merge (both enfored by GitLab).

Use the capitalized imperative form for commit message headers and limit them to 72 characters (ideally 50) (enforced by [conform](https://github.com/siderolabs/conform)).
Include a body if you think it might provide helpful context about what you did and why.

### Subtrees

sensor-ingestion and Chirpstack are currently included in this project as [Git subtree](https://git.kernel.org/pub/scm/git/git.git/plain/contrib/subtree/git-subtree.txt)s.

Use the documented subtree commands to push and pull from upstream projects, such as

```
git subtree pull -m 'Update sensor-ingestion' SENSOR_INGESTION_REPO_TO_USE -P sensor-ingestion HEAD
```

### Merge Request tips

```bash
git push -u origin HEAD -o merge_request.create -o merge_request.merge_when_pipeline_succeeds
```

creates a MR, and set's it to auto-merge if the pipeline passes and no rebasing is necessary.

Leave off the last option if the MR needs manual review / approval.

### udh-sync

Synchronization of Grafana organizations and users as well as token mapping in Keycloak is currently implemented with Clojure to allow for rapid development.

An easy way to develop is [Calva](https://calva.io/) for VS Code.

Find the REPL jack-in instruction in `helm -n dev get notes udh`.
