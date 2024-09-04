<script lang="ts">
	import type { PageData } from './$types';
	import PermissionEdit from '$lib/permissions/PermissionEdit.svelte';
	import { apiFetch, fetchGroups, fetchScopes } from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import { Spinner } from 'flowbite-svelte';

	export let data: PageData;
	const tenant = data.tenant;
	const project = data.project;
	const permission = data.permission;

	let isNew = permission == 'new';

	const groupsPromise = fetchGroups(tenant, $accessToken);

	const scopesPromise = fetchScopes(tenant, project, $accessToken);

	const permissionPromise = isNew
		? { scopes: [], groups: [] }
		: apiFetch<{ groups: (string | null)[]; scopes: string[] }>(
				`data-hub/tenants/${tenant}/projects/${project}/permissions/${permission}`,
				$accessToken,
				false
			);
</script>

{#await Promise.all([permissionPromise, groupsPromise, scopesPromise])}
	<Spinner />
{:then responseData}
	<PermissionEdit
		{isNew}
		{tenant}
		{project}
		{permission}
		permissionObject={responseData[0]}
		selectableGroups={responseData[1]}
		selectableScopes={responseData[2].all}
	/>
{/await}
