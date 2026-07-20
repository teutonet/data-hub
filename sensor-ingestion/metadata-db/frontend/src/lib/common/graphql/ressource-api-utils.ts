import { handleCombinedErrors, performMutation } from './utils';
import type {
	CreateGroupMutation,
	CreateGroupMutationVariables,
	CreateGroupPermissionMutation,
	CreateGroupPermissionMutationVariables,
	CreateProjectMutation,
	CreateProjectMutationVariables,
	CreateProjectPermissionMutation,
	CreateProjectPermissionMutationVariables,
	CreateSensorCredentialMutation,
	CreateSensorCredentialMutationVariables,
	CreateTenantMutation,
	CreateTenantMutationVariables,
	CreateTenantPermissionMutation,
	CreateTenantPermissionMutationVariables,
	CreateVizGroupMutation,
	CreateVizGroupMutationVariables,
	CreateVizGroupPermissionMutation,
	CreateVizGroupPermissionMutationVariables,
	DeleteGroupMutation,
	DeleteGroupMutationVariables,
	DeleteGroupPermissionMutation,
	DeleteGroupPermissionMutationVariables,
	DeleteProjectMutation,
	DeleteProjectMutationVariables,
	DeleteProjectPermissionMutation,
	DeleteProjectPermissionMutationVariables,
	DeleteSensorCredentialMutation,
	DeleteSensorCredentialMutationVariables,
	DeleteTenantPermissionMutation,
	DeleteTenantPermissionMutationVariables,
	DeleteVizGroupMutation,
	DeleteVizGroupMutationVariables,
	DeleteVizGroupPermissionMutation,
	DeleteVizGroupPermissionMutationVariables,
	PermissionInput,
	RotateSensorCredentialMutation,
	RotateSensorCredentialMutationVariables
} from '../generated/types-resource-api';
import {
	CREATE_GROUP,
	CREATE_GROUP_PERMISSION,
	CREATE_TENANT,
	CREATE_PROJECT,
	CREATE_PROJECT_PERMISSION,
	CREATE_SENSOR_CREDENTIAL,
	CREATE_TENANT_PERMISSION,
	CREATE_VIZ_GROUP,
	CREATE_VIZ_GROUP_PERMISSION,
	DELETE_GROUP,
	DELETE_GROUP_PERMISSION,
	DELETE_PROJECT,
	DELETE_PROJECT_PERMISSION,
	DELETE_SENSOR_CREDENTIAL,
	DELETE_TENANT_PERMISSION,
	DELETE_VIZ_GROUP,
	DELETE_VIZ_GROUP_PERMISSION,
	GET_GROUP_DISPLAY_NAME,
	GET_PROJECT_DISPLAY_NAME,
	GET_TENANT_DISPLAY_NAME,
	GET_VIZGROUP_DISPLAY_NAME,
	ROTATE_SENSOR_CREDENTIAL,
	SET_GROUP_DISPLAY_NAME,
	SET_PROJECT_DISPLAY_NAME,
	SET_TENANT_DISPLAY_NAME,
	SET_VIZGROUP_DISPLAY_NAME
} from './queries-resource-api';
import { error, success } from '../toast/toast';
import { goto } from '$app/navigation';
import { Client, createRequest, type OperationResult } from '@urql/svelte';
import type { ResourceType } from '$lib/nav/fetchUtils';
import { getContext } from 'svelte';
import type { Readable } from 'svelte/store';

export function getUserSensorBucketPerms(): Readable<
	Record<string, { sensorMetadataWrite: boolean; bucketRead: boolean; bucketWrite: boolean }>
> {
	return getContext<
		Readable<
			Record<string, { sensorMetadataWrite: boolean; bucketRead: boolean; bucketWrite: boolean }>
		>
	>('resourceApi-projectSensorBucketPerms');
}

export function getUserReadableProjects(): Readable<string[]> {
	return getContext<Readable<string[]>>('resourceApi-userReadableProjects');
}

export function getProjectsWithBucketPermissions(): Readable<
	{ project: string; permission: { read: boolean; write: boolean } }[]
> {
	return getContext<Readable<{ project: string; permission: { read: boolean; write: boolean } }[]>>(
		'resourceApi-projectsWithBucketPermissions'
	);
}

export function checkForGraphQLError<T>(result: OperationResult<T>): boolean {
	// Ressource-Api always returns an empty error array, check content for actual errors
	return !!((result.error?.graphQLErrors.length ?? 0) > 0 || result.error?.networkError);
}

async function handleThen<T>(
	result: OperationResult<T>,
	successMessage: string,
	gotoUrl?: string,
	refreshAccessToken?: () => void
) {
	if (result.error && checkForGraphQLError(result)) {
		handleCombinedErrors(result.error, { showToasts: true });
	} else {
		success(successMessage);
		refreshAccessToken?.();
		if (gotoUrl) {
			goto(gotoUrl);
		}
	}
}

export async function createTenant(
	client: Client,
	resourceName: string,
	displayName: string = '',
	refreshAccessToken?: () => void
) {
	await performMutation<CreateTenantMutation, CreateTenantMutationVariables>(
		client,
		CREATE_TENANT,
		{
			resourceName,
			displayName
		},
		{
			additionalTypenames: ['Tenant']
		}
	).then(async (result) => {
		await handleThen(
			result,
			'shared.message.savedSuccessfully',
			`/api/tenants/${resourceName}/permissions`,
			refreshAccessToken
		);
	});
}

export async function createGroup(
	client: Client,
	tenant: string,
	resourceName: string,
	displayName: string = '',
	refreshAccessToken?: () => void
) {
	await performMutation<CreateGroupMutation, CreateGroupMutationVariables>(
		client,
		CREATE_GROUP,
		{
			tenant,
			resourceName,
			displayName
		},
		{
			additionalTypenames: ['Group']
		}
	).then(async (result) => {
		await handleThen(
			result,
			'shared.message.savedSuccessfully',
			`/api/tenants/${tenant}/groups/${resourceName}`,
			refreshAccessToken
		);
	});
}

export async function createVizGroup(
	client: Client,
	tenant: string,
	resourceName: string,
	displayName: string = '',
	refreshAccessToken?: () => void
) {
	await performMutation<CreateVizGroupMutation, CreateVizGroupMutationVariables>(
		client,
		CREATE_VIZ_GROUP,
		{
			tenant,
			resourceName,
			displayName
		},
		{
			additionalTypenames: ['VizGroup']
		}
	).then(async (result) => {
		await handleThen(
			result,
			'shared.message.savedSuccessfully',
			`/api/tenants/${tenant}/viz-groups/${resourceName}`,
			refreshAccessToken
		);
	});
}

export async function createProject(
	client: Client,
	tenant: string,
	resourceName: string,
	displayName: string = '',
	refreshAccessToken?: () => void
) {
	await performMutation<CreateProjectMutation, CreateProjectMutationVariables>(
		client,
		CREATE_PROJECT,
		{
			tenant,
			resourceName,
			displayName
		},
		{
			additionalTypenames: ['Project']
		}
	).then(async (result) => {
		await handleThen(
			result,
			'shared.message.savedSuccessfully',
			`/api/tenants/${tenant}/projects/${resourceName}`,
			refreshAccessToken
		);
	});
}

export async function createResource(
	gqlClient: Client,
	resource: ResourceType,
	refreshAccessToken?: () => void
) {
	switch (resource.type) {
		case 'tenant':
			return createTenant(
				gqlClient,
				resource.resourceName,
				resource.displayName,
				refreshAccessToken
			);
		case 'group':
			return createGroup(
				gqlClient,
				resource.tenant,
				resource.resourceName,
				resource.displayName,
				refreshAccessToken
			);
		case 'vizGroup':
			return createVizGroup(
				gqlClient,
				resource.tenant,
				resource.resourceName,
				resource.displayName,
				refreshAccessToken
			);
		case 'project':
			return createProject(
				gqlClient,
				resource.tenant,
				resource.resourceName,
				resource.displayName,
				refreshAccessToken
			);
	}
}

export async function createTenantPermission(
	client: Client,
	tenant: string,
	permissionInput: PermissionInput
) {
	await performMutation<CreateTenantPermissionMutation, CreateTenantPermissionMutationVariables>(
		client,
		CREATE_TENANT_PERMISSION,
		{
			tenant,
			permission: permissionInput
		},
		{
			additionalTypenames: ['Permission']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.savedSuccessfully', `.`);
	});
}

export async function createGroupPermission(
	client: Client,
	tenant: string,
	group: string,
	permissionInput: PermissionInput
) {
	await performMutation<CreateGroupPermissionMutation, CreateGroupPermissionMutationVariables>(
		client,
		CREATE_GROUP_PERMISSION,
		{
			tenant,
			group,
			permission: permissionInput
		},
		{
			additionalTypenames: ['Permission']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.savedSuccessfully', `.`);
	});
}

export async function createVizGroupPermission(
	client: Client,
	tenant: string,
	vizGroup: string,
	permissionInput: PermissionInput
) {
	await performMutation<
		CreateVizGroupPermissionMutation,
		CreateVizGroupPermissionMutationVariables
	>(
		client,
		CREATE_VIZ_GROUP_PERMISSION,
		{
			tenant,
			vizGroup,
			permission: permissionInput
		},
		{
			additionalTypenames: ['Permission']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.savedSuccessfully', `.`);
	});
}

export async function createProjectPermission(
	client: Client,
	tenant: string,
	project: string,
	permissionInput: PermissionInput
) {
	await performMutation<CreateProjectPermissionMutation, CreateProjectPermissionMutationVariables>(
		client,
		CREATE_PROJECT_PERMISSION,
		{
			tenant,
			project,
			permission: permissionInput
		},
		{
			additionalTypenames: ['Permission']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.savedSuccessfully', `.`);
	});
}

export async function createSensorCredential(
	client: Client,
	tenant: string,
	project: string,
	sensorCredential: string
): Promise<{ username: string; password: string } | undefined> {
	return await performMutation<
		CreateSensorCredentialMutation,
		CreateSensorCredentialMutationVariables
	>(
		client,
		CREATE_SENSOR_CREDENTIAL,
		{
			tenant,
			project,
			sensorCredential
		},
		{
			additionalTypenames: ['Project']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.savedSuccessfully', undefined);
		return result.data?.tenant.project.createSensorCredential;
	});
}

export async function rotateSensorCredential(
	client: Client,
	tenant: string,
	project: string,
	sensorCredential: string
): Promise<{ username: string; password: string } | undefined> {
	return await performMutation<
		RotateSensorCredentialMutation,
		RotateSensorCredentialMutationVariables
	>(
		client,
		ROTATE_SENSOR_CREDENTIAL,
		{
			tenant,
			project,
			sensorCredential
		},
		{
			additionalTypenames: ['Project']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.savedSuccessfully', undefined);
		return result.data?.tenant.project.rotateSensorCredential;
	});
}

export async function deleteTenantPermission(
	client: Client,
	tenant: string,
	permission: string,
	refreshAccessToken?: () => void
) {
	await performMutation<DeleteTenantPermissionMutation, DeleteTenantPermissionMutationVariables>(
		client,
		DELETE_TENANT_PERMISSION,
		{
			tenant,
			permission
		},
		{
			additionalTypenames: ['Permission']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.deletedSuccessfully', undefined, refreshAccessToken);
	});
}

export async function deleteGroup(
	client: Client,
	tenant: string,
	group: string,
	refreshAccessToken?: () => void
) {
	await performMutation<DeleteGroupMutation, DeleteGroupMutationVariables>(
		client,
		DELETE_GROUP,
		{
			tenant,
			group
		},
		{
			additionalTypenames: ['Group']
		}
	).then(async (result) => {
		await handleThen(
			result,
			'shared.message.deletedSuccessfully',
			`/api/tenants/${tenant}`,
			refreshAccessToken
		);
	});
}

export async function deleteGroupPermission(
	client: Client,
	tenant: string,
	group: string,
	permission: string,
	refreshAccessToken?: () => void
) {
	await performMutation<DeleteGroupPermissionMutation, DeleteGroupPermissionMutationVariables>(
		client,
		DELETE_GROUP_PERMISSION,
		{
			tenant,
			group,
			permission
		},
		{
			additionalTypenames: ['Permission']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.deletedSuccessfully', undefined, refreshAccessToken);
	});
}

export async function deleteVizGroup(
	client: Client,
	tenant: string,
	vizGroup: string,
	refreshAccessToken?: () => void
) {
	await performMutation<DeleteVizGroupMutation, DeleteVizGroupMutationVariables>(
		client,
		DELETE_VIZ_GROUP,
		{
			tenant,
			vizGroup
		},
		{
			additionalTypenames: ['VizGroup']
		}
	).then(async (result) => {
		await handleThen(
			result,
			'shared.message.deletedSuccessfully',
			`/api/tenants/${tenant}`,
			refreshAccessToken
		);
	});
}

export async function deleteVizGroupPermission(
	client: Client,
	tenant: string,
	vizGroup: string,
	permission: string,
	refreshAccessToken?: () => void
) {
	await performMutation<
		DeleteVizGroupPermissionMutation,
		DeleteVizGroupPermissionMutationVariables
	>(
		client,
		DELETE_VIZ_GROUP_PERMISSION,
		{
			tenant,
			vizGroup,
			permission
		},
		{
			additionalTypenames: ['Permission']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.deletedSuccessfully', undefined, refreshAccessToken);
	});
}

export async function deleteProject(
	client: Client,
	tenant: string,
	project: string,
	refreshAccessToken?: () => void
) {
	await performMutation<DeleteProjectMutation, DeleteProjectMutationVariables>(
		client,
		DELETE_PROJECT,
		{
			tenant,
			project
		},
		{
			additionalTypenames: ['Project']
		}
	).then(async (result) => {
		await handleThen(
			result,
			'shared.message.deletedSuccessfully',
			`/api/tenants/${tenant}`,
			refreshAccessToken
		);
	});
}

export async function deleteProjectPermission(
	client: Client,
	tenant: string,
	project: string,
	permission: string,
	refreshAccessToken?: () => void
) {
	await performMutation<DeleteProjectPermissionMutation, DeleteProjectPermissionMutationVariables>(
		client,
		DELETE_PROJECT_PERMISSION,
		{
			tenant,
			project,
			permission
		},
		{
			additionalTypenames: ['Permission']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.deletedSuccessfully', undefined, refreshAccessToken);
	});
}

export async function deleteSensorCredential(
	client: Client,
	tenant: string,
	project: string,
	sensorCredential: string
) {
	await performMutation<DeleteSensorCredentialMutation, DeleteSensorCredentialMutationVariables>(
		client,
		DELETE_SENSOR_CREDENTIAL,
		{
			tenant,
			project,
			sensorCredential
		},
		{
			additionalTypenames: ['Project']
		}
	).then(async (result) => {
		await handleThen(result, 'shared.message.deletedSuccessfully', undefined);
	});
}

export async function setResourceDisplayName(
	gqlClient: Client,
	resource: ResourceType,
	newDisplayName: string
) {
	let query;

	switch (resource.type) {
		case 'tenant':
			query = SET_TENANT_DISPLAY_NAME;
			break;

		case 'group':
			query = SET_GROUP_DISPLAY_NAME;
			break;

		case 'vizGroup':
			query = SET_VIZGROUP_DISPLAY_NAME;
			break;

		case 'project':
			query = SET_PROJECT_DISPLAY_NAME;
			break;

		default:
			return;
	}

	const mut = createRequest(query, {
		tenant: resource.tenant,
		resourceName: resource.resourceName,
		displayName: newDisplayName
	});

	await gqlClient.executeMutation(mut).then((resp) => {
		if (resp.data) {
			success('shared.message.savedSuccessfully');
		} else {
			error('shared.message.errorSaving');
		}
	});
}

export async function getResourceDisplayName(
	gqlClient: Client,
	resource: ResourceType
): Promise<string> {
	let query;

	switch (resource.type) {
		case 'tenant':
			query = GET_TENANT_DISPLAY_NAME;
			break;

		case 'group':
			query = GET_GROUP_DISPLAY_NAME;
			break;

		case 'vizGroup':
			query = GET_VIZGROUP_DISPLAY_NAME;
			break;

		case 'project':
			query = GET_PROJECT_DISPLAY_NAME;
			break;

		default:
			return '';
	}

	const request = createRequest(query, {
		tenant: resource.tenant,
		resourceName: resource.resourceName
	});

	switch (resource.type) {
		case 'tenant':
			return (await gqlClient.executeQuery(request)).data.tenant.displayName;

		case 'group':
			return (await gqlClient.executeQuery(request)).data.group.displayName;

		case 'vizGroup':
			return (await gqlClient.executeQuery(request)).data.vizGroup.displayName;

		case 'project':
			return (await gqlClient.executeQuery(request)).data.project.displayName;

		default:
			return '';
	}
}
