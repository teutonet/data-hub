/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
	T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type CollectorConfigInput = {
	interval: number;
	latitude: number;
	longitude: number;
	token: string;
};

export type GroupInput = {
	group: string;
	tenant: string;
};

export type PermissionInput = {
	groupPrincipals?: Array<GroupInput> | null | undefined;
	name: string;
	projectPrincipals?: Array<ProjectInput> | null | undefined;
	scopes: Array<string>;
	tenantPrincipals?: Array<TenantInput> | null | undefined;
	userPrincipals?: Array<UserInput> | null | undefined;
	vizGroupPrincipals?: Array<VizGroupInput> | null | undefined;
};

export type ProjectInput = {
	project: string;
	tenant: string;
};

export type TenantInput = {
	tenant: string;
};

export type UserInput = {
	userId: string;
};

export type VizGroupInput = {
	tenant: string;
	vizGroup: string;
};

export type GetAllTenantsQueryVariables = Exact<{ [key: string]: never }>;

export type GetAllTenantsQuery = {
	tenants: Array<{ resourceName: string; displayName: string | null }>;
};

export type CreateTenantMutationVariables = Exact<{
	resourceName: string;
	displayName: string;
}>;

export type CreateTenantMutation = { createTenant: { patchAttributes: Array<{ key: string }> } };

export type GetAllResourcesQueryVariables = Exact<{
	tenant: string;
}>;

export type GetAllResourcesQuery = {
	tenant: {
		resourceName: string;
		groups: Array<{ resourceName: string; displayName: string | null }>;
		vizGroups: Array<{ resourceName: string; displayName: string | null }>;
		projects: Array<{ resourceName: string; displayName: string | null }>;
	} | null;
};

export type GetTenantDisplayNameQueryVariables = Exact<{
	tenant: string;
}>;

export type GetTenantDisplayNameQuery = { tenant: { displayName: string | null } | null };

export type CreateGroupMutationVariables = Exact<{
	tenant: string;
	resourceName: string;
	displayName: string;
}>;

export type CreateGroupMutation = {
	tenant: { createGroup: { patchAttributes: Array<{ key: string }> } };
};

export type CreateVizGroupMutationVariables = Exact<{
	tenant: string;
	resourceName: string;
	displayName: string;
}>;

export type CreateVizGroupMutation = {
	tenant: { createVizGroup: { patchAttributes: Array<{ key: string }> } };
};

export type CreateProjectMutationVariables = Exact<{
	tenant: string;
	resourceName: string;
	displayName: string;
}>;

export type CreateProjectMutation = {
	tenant: { createProject: { patchAttributes: Array<{ key: string }> } };
};

export type GetGroupDisplayNameQueryVariables = Exact<{
	tenant: string;
	resourceName: string;
}>;

export type GetGroupDisplayNameQuery = { group: { displayName: string | null } | null };

export type GetVizGroupDisplayNameQueryVariables = Exact<{
	tenant: string;
	resourceName: string;
}>;

export type GetVizGroupDisplayNameQuery = { vizGroup: { displayName: string | null } | null };

export type GetProjectDisplayNameQueryVariables = Exact<{
	tenant: string;
	resourceName: string;
}>;

export type GetProjectDisplayNameQuery = { project: { displayName: string | null } | null };

export type SetTenantDisplayNameMutationVariables = Exact<{
	tenant: string;
	displayName: string;
}>;

export type SetTenantDisplayNameMutation = { tenant: { patchAttributes: Array<{ key: string }> } };

export type SetGroupDisplayNameMutationVariables = Exact<{
	tenant: string;
	resourceName: string;
	displayName: string;
}>;

export type SetGroupDisplayNameMutation = {
	tenant: { group: { patchAttributes: Array<{ key: string }> } };
};

export type SetVizGroupDisplayNameMutationVariables = Exact<{
	tenant: string;
	resourceName: string;
	displayName: string;
}>;

export type SetVizGroupDisplayNameMutation = {
	tenant: { vizGroup: { patchAttributes: Array<{ key: string }> } };
};

export type SetProjectDisplayNameMutationVariables = Exact<{
	tenant: string;
	resourceName: string;
	displayName: string;
}>;

export type SetProjectDisplayNameMutation = {
	tenant: { project: { patchAttributes: Array<{ key: string }> } };
};

export type GetScopesQueryVariables = Exact<{
	tenant: string;
}>;

export type GetScopesQuery = {
	scopes: { granted: Array<string> };
	tenant: {
		scopes: { granted: Array<string> };
		groups: Array<{ group: string; scopes: { granted: Array<string> } }>;
		projects: Array<{ project: string; scopes: { granted: Array<string> } }>;
		vizGroups: Array<{ vizGroup: string; scopes: { granted: Array<string> } }>;
	} | null;
};

export type CreateTenantPermissionMutationVariables = Exact<{
	tenant: string;
	permission: PermissionInput;
}>;

export type CreateTenantPermissionMutation = { tenant: { createPermission: string } };

export type DeleteTenantPermissionMutationVariables = Exact<{
	tenant: string;
	permission: string;
}>;

export type DeleteTenantPermissionMutation = { tenant: { deletePermission: string } };

export type CreateGroupPermissionMutationVariables = Exact<{
	tenant: string;
	group: string;
	permission: PermissionInput;
}>;

export type CreateGroupPermissionMutation = { tenant: { group: { createPermission: string } } };

export type CreateVizGroupPermissionMutationVariables = Exact<{
	tenant: string;
	vizGroup: string;
	permission: PermissionInput;
}>;

export type CreateVizGroupPermissionMutation = {
	tenant: { vizGroup: { createPermission: string } };
};

export type CreateProjectPermissionMutationVariables = Exact<{
	tenant: string;
	project: string;
	permission: PermissionInput;
}>;

export type CreateProjectPermissionMutation = { tenant: { project: { createPermission: string } } };

export type CreateSensorCredentialMutationVariables = Exact<{
	tenant: string;
	project: string;
	sensorCredential: string;
}>;

export type CreateSensorCredentialMutation = {
	tenant: { project: { createSensorCredential: { password: string; username: string } } };
};

export type DeleteGroupMutationVariables = Exact<{
	tenant: string;
	group: string;
}>;

export type DeleteGroupMutation = { tenant: { deleteGroup: string } };

export type DeleteGroupPermissionMutationVariables = Exact<{
	tenant: string;
	group: string;
	permission: string;
}>;

export type DeleteGroupPermissionMutation = { tenant: { group: { deletePermission: string } } };

export type DeleteVizGroupMutationVariables = Exact<{
	tenant: string;
	vizGroup: string;
}>;

export type DeleteVizGroupMutation = { tenant: { deleteVizGroup: string } };

export type DeleteVizGroupPermissionMutationVariables = Exact<{
	tenant: string;
	vizGroup: string;
	permission: string;
}>;

export type DeleteVizGroupPermissionMutation = {
	tenant: { vizGroup: { deletePermission: string } };
};

export type DeleteProjectMutationVariables = Exact<{
	tenant: string;
	project: string;
}>;

export type DeleteProjectMutation = { tenant: { deleteProject: string } };

export type DeleteProjectPermissionMutationVariables = Exact<{
	tenant: string;
	project: string;
	permission: string;
}>;

export type DeleteProjectPermissionMutation = { tenant: { project: { deletePermission: string } } };

export type DeleteSensorCredentialMutationVariables = Exact<{
	tenant: string;
	project: string;
	sensorCredential: string;
}>;

export type DeleteSensorCredentialMutation = {
	tenant: { project: { deleteSensorCredential: string } };
};

export type RotateSensorCredentialMutationVariables = Exact<{
	tenant: string;
	project: string;
	sensorCredential: string;
}>;

export type RotateSensorCredentialMutation = {
	tenant: { project: { rotateSensorCredential: { password: string; username: string } } };
};

export type GetSensorBucketPermissionsQueryVariables = Exact<{ [key: string]: never }>;

export type GetSensorBucketPermissionsQuery = {
	tenants: Array<{
		tenant: string;
		projects: Array<{
			project: string;
			sensorMetadataWrite: boolean;
			bucketRead: boolean;
			bucketWrite: boolean;
		}>;
	}>;
};

export type GetOwmCollectorsFromProjectQueryVariables = Exact<{
	tenant: string;
	project: string;
}>;

export type GetOwmCollectorsFromProjectQuery = {
	project: {
		owmCollectors: Array<{
			collectorName: string;
			latitude: number;
			longitude: number;
			interval: number;
		}>;
	} | null;
};

export type CreateCollectorMutationVariables = Exact<{
	tenant: string;
	project: string;
	collectorName: string;
	collectorConfig: CollectorConfigInput;
}>;

export type CreateCollectorMutation = { tenant: { project: { createOwmCollector: string } } };

export type DeleteCollectorMutationVariables = Exact<{
	tenant: string;
	project: string;
	collectorName: string;
}>;

export type DeleteCollectorMutation = { tenant: { project: { deleteOwmCollector: string } } };
