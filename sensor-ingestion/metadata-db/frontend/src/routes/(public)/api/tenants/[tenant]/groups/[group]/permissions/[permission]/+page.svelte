<script lang="ts">
	import PermissionEdit from '$lib/permissions/PermissionEdit.svelte';
	import { Spinner } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { accessToken } from '$lib/common/auth';
	import {
		fetchGroups,
		fetchVizGroups,
		fetchPermission,
		fetchScopes,
		type ResourceType
	} from '$lib/nav/fetchUtils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const tenant = $derived(data.tenant);
	const group = $derived(data.group);
	const permission = $derived(data.permission);

	let isNew = $derived(permission == 'new');

	const resource: ResourceType = $derived({
		type: 'group',
		tenant: tenant,
		resourceName: group,
		displayName: ''
	});

	const groupsPromise = $derived(fetchGroups(tenant, $accessToken));
	const vizGroupsPromise = $derived(fetchVizGroups(tenant, $accessToken));
	const scopesPromise = $derived(fetchScopes(resource, $accessToken));

	const permissionPromise = $derived(
		isNew ? { scopes: [], principals: [] } : fetchPermission(resource, permission, $accessToken)
	);
</script>

{#await Promise.all([permissionPromise, groupsPromise, vizGroupsPromise, scopesPromise])}
	<Spinner />
{:then responseData}
	<PermissionEdit
		{isNew}
		{resource}
		{permission}
		permissionObject={responseData[0]}
		selectableGroups={responseData[1]}
		selectableVizGroups={responseData[2]}
		selectableScopes={responseData[3].all}
	/>
{/await}
