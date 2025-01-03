<script lang="ts">
	import PermissionEdit from '$lib/permissions/PermissionEdit.svelte';
	import { Spinner } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { accessToken } from '$lib/common/auth';
	import {
		fetchGroups,
		fetchPermission,
		fetchScopes,
		type GroupResource
	} from '$lib/nav/fetchUtils';

	export let data: PageData;
	const tenant = data.tenant;
	const group = data.group;
	const permission = data.permission;

	let isNew = permission == 'new';

	const resource: GroupResource = {
		type: 'group',
		tenant,
		group
	};

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
