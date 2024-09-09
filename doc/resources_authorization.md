# Resources

## Hierarchy

Resources are organized in a hierarchy

```
(root)
└── tenant
    ├── project
    │   └── sensor-credential
    └── group
```

This implies that every sub-resource is scoped to all its ancestors.
There can be multiple resources with the same type and name if they are in different branches of the resource tree, e.g.
two group in different tenants.

## Naming

Depending on the type, resource names can be specified manually or are generated automatically.

Names must start and end with a lowercase character `a-z` or a digit, dashes are allowed in between.

In global namespaces such as object storage bucket names or "tenants" / "organizations" in integrated components the
resulting names are joined along the hierarchy.\
Example: not `{group}` (because a group with that name can exist in multiple tenants) but `{tenant}:{group}`.

For projects, flat names use a dot: `{tenant}.{project}`.

## Uses

Resources are the coarse domain objects of Data HUB.

Not every panel in every dashboard is and can be represented by a resource.
Instead, resources are only used as far down the hierarchy of concepts as is necessary to facilitate resource management
in parts of the platform deployment (object storage buckets, tenants in components) and sufficiently granular permission
management.

# Authorization

## Scopes

Resource types have different valid permission scopes which define what "can be done" with a resource.

Examples include "reading from Prometheus" on a project for reading from the time series associated with the project,
and "rotate" on a sensor credential used to push sensor data to the API.

All resource types have type-specific "view" and "admin" scopes.\
View scope is required for seeing the resource in a listing and to interact with sub-resources when using the resource
API.\
Admin scope is required for resource administration and includes all scopes in the affected resources and all
descendants.

Scopes are named `{type}:{scope}`: `tenant:admin`, `group:dashboard-view`, `sensor-credential:rotate`, ...

## Permissions

A permission grants one or more scopes on a single resource to the users in one or more groups in the same tenant.

Scopes are transitive: It is possible to grant `sensor-credential:admin` on a tenant resource.\
Even though this has no effect on managing the tenant, projects, or anything else, it does grant administrative
permissions on all sensor credentials belonging to that tenant.

## API

Users can manage resources and delegate access using an HTTP API.

### Authentication

A valid Bearer token must be provided with every request.

### Path Schema

The paths to API resources are constructed using key-value pairs with plural
keys: `/tenants/{tenant}/projects/{project}`\
If only the key is specified resources with that type and scope can be listed or (in case of automatic naming) created.

Permissions can be managed by
appending `/permissions`: `/tenants/{tenant}/permissions`, `/tenants/{tenant}/permissions/{permission}`

Valid scopes for a resource can be listed by appending `/scopes`.

Attributes can be managed by
appending `/attributes`: `/tenants/{tenant}/attributes`, `/tenants/{tenant}/attributes/{attribute}`

Resource-specific actions can be performed by appening `/{action}`.

### Administration

For bootstrapping and creating new tenants users with the `manage-realm` client role in the management client are granted full API access.

### Examples

- `GET /tenants`
  ```
  ["tenant1", "tenant2"]
  ```
- `PUT /tenants/tenant3`
  ```
  {"name": "tenant3"}
  ```
- `DELETE /tenants/tenant3`
- `POST /tenants/mytenant/projects/myproject/sensor-credentials/mycredential/rotate`
  ```
  {"user": "cb8e857b-bed7-40ba-9cd0-9989a1de7694",
   "password": "f7ed01de-8505-4447-85e8-d30d3a0c8614"}
  ```
- ```
  PUT /tenants/mytenant/projects/myproject/permissions/mypermission

  {"scopes": ["project:view", "project:prometheus-read"],
   "principals": [{"type": "group", "tenant": "mytenant", "group": "department1"}]}
  ```

- `GET /tenants/tenant1/groups/group1/scopes`

  ```
  ["group:admin", "group:dashboard-view", "group:dashboard-edit", "group:view"]
  ```

- `PUT /tenants/tenant1/attributes/color`

  ```
  green
  ```

- `GET /tenants/tenant1/attributes`
  ```
  {"color":"green"}
  ```
