<div align="center">
    <br />
    <a href="https://teuto.net/produkte-leistungen/data-hub/">
      <img width="300px" src="https://teuto.net/wp-content/uploads/2019/11/teuto.net-logo-600.png" alt="Docusaurus">
    </a>
    <br />
    <br />
</div>

# Data HUB

[![License](https://img.shields.io/github/license/teutonet/data-hub)](https://opensource.org/license/agpl-v3)

This repository contains the Data HUB components and Helm chart.

The main task of the platform is to integrate the different components
and to provide a uniform authentication and authorization layer
as well as management infrastructure such as frontends.

## Authorization / Resources

see [Resources and Authorization](doc/resources_authorization.md)

## Applications Details

This details how the Data HUB concepts correspond to the application concepts.

### Grafana

An organization named `tenant:group` is created for each group.

For udh-sync to operate correctly please keep the "current organization" of the default admin account created by the Helm chart set to 1 / public.
This will be reset before each organization synchronization but changing it can cause problems and might cause users to temporarily be assigned to the wrong organizations.

### Mimir

Tenant IDs set through `X-Scope-OrgID` HTTP header correspond to a Data HUB project and are named `tenant:project`.

### sensor-ingestion MetadataDB

Projects are named `tenant:project`.

### Ceph Object Gateway S3 API

Bucket names correspond to Data HUB projects and are named `tenant.project`.

## Operations

### Add Tenant

Using an admin user `PUT /tenants/XXX`, see [Resources and Authorization](doc/resources_authorization.md)

### Get LoRaWAN credentials for Project

`PUT /tenants/mytenant/projects/myproject/sensor-credentials/mycredential`, see [Resources and Authorization](doc/resources_authorization.md)

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

### Merge Request tips

```bash
git push -u origin HEAD -o merge_request.create -o merge_request.merge_when_pipeline_succeeds
```

creates a MR, and set's it to auto-merge if the pipeline passes and no rebasing is necessary.

Leave off the last option if the MR needs manual review / approval.

### udh-sync

Synchronization of Grafana organizations and users as well as token mapping in Keycloak is currently implemented with Kotlin.

### Local CA

The local deployment includes a fake CA certificate that is limited to issuing certificates for `.data-hub.local`.

You can import it into your web browser as "to identify websites" to skip certificate warnings using [local-ca.crt](./doc/local-ca.crt).
