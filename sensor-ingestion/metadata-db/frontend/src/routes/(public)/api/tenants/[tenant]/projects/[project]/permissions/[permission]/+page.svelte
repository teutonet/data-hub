<script lang="ts">
	import type { PageData } from './$types';
	import PermissionEdit from '$lib/permissions/PermissionEdit.svelte';
	import {
		fetchGroups,
		fetchPermission,
		fetchScopes,
		type ProjectResource
	} from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import { Spinner } from 'flowbite-svelte';

	export let data: PageData;
	const tenant = data.tenant;
	const project = data.project;
	const permission = data.permission;

	const resource: ProjectResource = {
		type: 'project',
		tenant,
		project
	};

	let isNew = permission == 'new';

	const groupsPromise = fetchGroups(tenant, $accessToken);

	const scopesPromise = fetchScopes(resource, $accessToken);

	const permissionPromise = isNew
		? { scopes: [], principals: [] }
		: fetchPermission(resource, permission, $accessToken);
</script>

{#await Promise.all([permissionPromise, groupsPromise, scopesPromise])}
	<Spinner />
{:then responseData}
	<PermissionEdit
		{isNew}
		{resource}
		{permission}
		permissionObject={responseData[0]}
		selectableGroups={responseData[1]}
		selectableScopes={responseData[2].all}
	/>
{/await}
