<script lang="ts">
	import PermissionList from '$lib/permissions/PermissionList.svelte';
	import { Spinner } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { accessToken } from '$lib/common/auth';
	import { fetchPermissions, type GroupResource } from '$lib/nav/fetchUtils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const tenant: string = data.tenant;
	const group: string = data.group;

	const resource: GroupResource = {
		type: 'group',
		tenant,
		group
	};

	let promise = $state(fetchPermissions(resource, $accessToken));

	function reload() {
		promise = fetchPermissions(resource, $accessToken);
	}
</script>

{#await promise}
	<Spinner />
{:then permissions}
	<PermissionList {resource} {reload} {permissions} />
{/await}
