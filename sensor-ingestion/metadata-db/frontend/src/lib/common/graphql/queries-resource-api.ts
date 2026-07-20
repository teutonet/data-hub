import { gql } from '@urql/svelte';

export const GET_ALL_TENANTS = gql`
	query getAllTenants {
		tenants {
			resourceName: tenant
			displayName: attribute(attribute: "display-name")
		}
	}
`;

export const CREATE_TENANT = gql`
	mutation createTenant($resourceName: String!, $displayName: String!) {
		createTenant(tenant: $resourceName) {
			patchAttributes(attributes: [{ key: "display-name", value: $displayName }]) {
				key
			}
		}
	}
`;

export const GET_ALL_RESOURCES = gql`
	query getAllResources($tenant: String!) {
		tenant(tenant: $tenant) {
			resourceName: tenant
			groups {
				resourceName: group
				displayName: attribute(attribute: "display-name")
			}
			vizGroups {
				resourceName: vizGroup
				displayName: attribute(attribute: "display-name")
			}
			projects {
				resourceName: project
				displayName: attribute(attribute: "display-name")
			}
		}
	}
`;

export const GET_TENANT_DISPLAY_NAME = gql`
	query getTenantDisplayName($tenant: String!) {
		tenant(tenant: $tenant) {
			displayName: attribute(attribute: "display-name")
		}
	}
`;

export const CREATE_GROUP = gql`
	mutation createGroup($tenant: String!, $resourceName: String!, $displayName: String!) {
		tenant(tenant: $tenant) {
			createGroup(group: $resourceName) {
				patchAttributes(attributes: [{ key: "display-name", value: $displayName }]) {
					key
				}
			}
		}
	}
`;

export const CREATE_VIZ_GROUP = gql`
	mutation createVizGroup($tenant: String!, $resourceName: String!, $displayName: String!) {
		tenant(tenant: $tenant) {
			createVizGroup(vizGroup: $resourceName) {
				patchAttributes(attributes: [{ key: "display-name", value: $displayName }]) {
					key
				}
			}
		}
	}
`;

export const CREATE_PROJECT = gql`
	mutation createProject($tenant: String!, $resourceName: String!, $displayName: String!) {
		tenant(tenant: $tenant) {
			createProject(project: $resourceName) {
				patchAttributes(attributes: [{ key: "display-name", value: $displayName }]) {
					key
				}
			}
		}
	}
`;

export const GET_GROUP_DISPLAY_NAME = gql`
	query getGroupDisplayName($tenant: String!, $resourceName: String!) {
		group(tenant: $tenant, group: $resourceName) {
			displayName: attribute(attribute: "display-name")
		}
	}
`;

export const GET_VIZGROUP_DISPLAY_NAME = gql`
	query getVizGroupDisplayName($tenant: String!, $resourceName: String!) {
		vizGroup(tenant: $tenant, vizGroup: $resourceName) {
			displayName: attribute(attribute: "display-name")
		}
	}
`;

export const GET_PROJECT_DISPLAY_NAME = gql`
	query getProjectDisplayName($tenant: String!, $resourceName: String!) {
		project(tenant: $tenant, project: $resourceName) {
			displayName: attribute(attribute: "display-name")
		}
	}
`;

export const SET_TENANT_DISPLAY_NAME = gql`
	mutation setTenantDisplayName($tenant: String!, $displayName: String!) {
		tenant(tenant: $tenant) {
			patchAttributes(attributes: [{ key: "display-name", value: $displayName }]) {
				key
			}
		}
	}
`;

export const SET_GROUP_DISPLAY_NAME = gql`
	mutation setGroupDisplayName($tenant: String!, $resourceName: String!, $displayName: String!) {
		tenant(tenant: $tenant) {
			group(group: $resourceName) {
				patchAttributes(attributes: [{ key: "display-name", value: $displayName }]) {
					key
				}
			}
		}
	}
`;

export const SET_VIZGROUP_DISPLAY_NAME = gql`
	mutation setVizGroupDisplayName($tenant: String!, $resourceName: String!, $displayName: String!) {
		tenant(tenant: $tenant) {
			vizGroup(vizGroup: $resourceName) {
				patchAttributes(attributes: [{ key: "display-name", value: $displayName }]) {
					key
				}
			}
		}
	}
`;

export const SET_PROJECT_DISPLAY_NAME = gql`
	mutation setProjectDisplayName($tenant: String!, $resourceName: String!, $displayName: String!) {
		tenant(tenant: $tenant) {
			project(project: $resourceName) {
				patchAttributes(attributes: [{ key: "display-name", value: $displayName }]) {
					key
				}
			}
		}
	}
`;

export const GET_SCOPES = gql`
	query getScopes($tenant: String!) {
		scopes {
			granted
		}
		tenant(tenant: $tenant) {
			scopes {
				granted
			}
			groups {
				group
				scopes {
					granted
				}
			}
			projects {
				project
				scopes {
					granted
				}
			}
			vizGroups {
				vizGroup
				scopes {
					granted
				}
			}
		}
	}
`;

export const CREATE_TENANT_PERMISSION = gql`
	mutation createTenantPermission($tenant: String!, $permission: PermissionInput!) {
		tenant(tenant: $tenant) {
			createPermission(permission: $permission)
		}
	}
`;

export const DELETE_TENANT_PERMISSION = gql`
	mutation deleteTenantPermission($tenant: String!, $permission: String!) {
		tenant(tenant: $tenant) {
			deletePermission(permission: $permission)
		}
	}
`;

export const CREATE_GROUP_PERMISSION = gql`
	mutation createGroupPermission($tenant: String!, $group: String!, $permission: PermissionInput!) {
		tenant(tenant: $tenant) {
			group(group: $group) {
				createPermission(permission: $permission)
			}
		}
	}
`;

export const CREATE_VIZ_GROUP_PERMISSION = gql`
	mutation createVizGroupPermission(
		$tenant: String!
		$vizGroup: String!
		$permission: PermissionInput!
	) {
		tenant(tenant: $tenant) {
			vizGroup(vizGroup: $vizGroup) {
				createPermission(permission: $permission)
			}
		}
	}
`;

export const CREATE_PROJECT_PERMISSION = gql`
	mutation createProjectPermission(
		$tenant: String!
		$project: String!
		$permission: PermissionInput!
	) {
		tenant(tenant: $tenant) {
			project(project: $project) {
				createPermission(permission: $permission)
			}
		}
	}
`;

export const CREATE_SENSOR_CREDENTIAL = gql`
	mutation createSensorCredential($tenant: String!, $project: String!, $sensorCredential: String!) {
		tenant(tenant: $tenant) {
			project(project: $project) {
				createSensorCredential(sensorCredential: $sensorCredential) {
					password
					username
				}
			}
		}
	}
`;

export const DELETE_GROUP = gql`
	mutation deleteGroup($tenant: String!, $group: String!) {
		tenant(tenant: $tenant) {
			deleteGroup(group: $group)
		}
	}
`;

export const DELETE_GROUP_PERMISSION = gql`
	mutation deleteGroupPermission($tenant: String!, $group: String!, $permission: String!) {
		tenant(tenant: $tenant) {
			group(group: $group) {
				deletePermission(permission: $permission)
			}
		}
	}
`;

export const DELETE_VIZ_GROUP = gql`
	mutation deleteVizGroup($tenant: String!, $vizGroup: String!) {
		tenant(tenant: $tenant) {
			deleteVizGroup(vizGroup: $vizGroup)
		}
	}
`;

export const DELETE_VIZ_GROUP_PERMISSION = gql`
	mutation deleteVizGroupPermission($tenant: String!, $vizGroup: String!, $permission: String!) {
		tenant(tenant: $tenant) {
			vizGroup(vizGroup: $vizGroup) {
				deletePermission(permission: $permission)
			}
		}
	}
`;

export const DELETE_PROJECT = gql`
	mutation deleteProject($tenant: String!, $project: String!) {
		tenant(tenant: $tenant) {
			deleteProject(project: $project)
		}
	}
`;

export const DELETE_PROJECT_PERMISSION = gql`
	mutation deleteProjectPermission($tenant: String!, $project: String!, $permission: String!) {
		tenant(tenant: $tenant) {
			project(project: $project) {
				deletePermission(permission: $permission)
			}
		}
	}
`;

export const DELETE_SENSOR_CREDENTIAL = gql`
	mutation deleteSensorCredential($tenant: String!, $project: String!, $sensorCredential: String!) {
		tenant(tenant: $tenant) {
			project(project: $project) {
				deleteSensorCredential(sensorCredential: $sensorCredential)
			}
		}
	}
`;

export const ROTATE_SENSOR_CREDENTIAL = gql`
	mutation rotateSensorCredential($tenant: String!, $project: String!, $sensorCredential: String!) {
		tenant(tenant: $tenant) {
			project(project: $project) {
				rotateSensorCredential(sensorCredential: $sensorCredential) {
					password
					username
				}
			}
		}
	}
`;

export const GET_PROJECT_SENSOR_BUCKET_PERMISSIONS = gql`
	query getSensorBucketPermissions {
		tenants {
			tenant
			projects {
				project
				sensorMetadataWrite: hasScopes(scopes: ["project:sensor-metadata-write"])
				bucketRead: hasScopes(scopes: ["project:bucket-read"])
				bucketWrite: hasScopes(scopes: ["project:bucket-write"])
			}
		}
	}
`;

export const GET_OWM_COLLECTORS_FROM_PROJECT = gql`
	query getOwmCollectorsFromProject($tenant: String!, $project: String!) {
		project(tenant: $tenant, project: $project) {
			owmCollectors {
				collectorName
				latitude
				longitude
				interval
			}
		}
	}
`;

export const CREATE_OWM_COLLECTOR = gql`
	mutation CreateCollector(
		$tenant: String!
		$project: String!
		$collectorName: String!
		$collectorConfig: CollectorConfigInput!
	) {
		tenant(tenant: $tenant) {
			project(project: $project) {
				createOwmCollector(collectorName: $collectorName, collectorConfig: $collectorConfig)
			}
		}
	}
`;

export const DELETE_OWM_COLLECTOR = gql`
	mutation DeleteCollector($tenant: String!, $project: String!, $collectorName: String!) {
		tenant(tenant: $tenant) {
			project(project: $project) {
				deleteOwmCollector(collectorName: $collectorName)
			}
		}
	}
`;
