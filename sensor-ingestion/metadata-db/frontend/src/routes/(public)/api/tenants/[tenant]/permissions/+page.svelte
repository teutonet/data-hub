<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { Spinner } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { _ } from 'svelte-i18n';
	import PermissionList from '$lib/permissions/PermissionList.svelte';
	import { apiFetch } from '$lib/nav/fetchUtils';
	import type { PermissionItem } from '$lib/permissions/types';
	import { accessToken } from '$lib/common/auth';

	export let data: PageData;

	const tenant: string = data.tenant;

	let promise = fetchPermissions();

	function fetchPermissions() {
		return apiFetch<PermissionItem[]>(`data-hub/tenants/${tenant}/permissions`, $accessToken, true);
	}

	function reload() {
		promise = fetchPermissions();
	}
</script>

<PageTitle title={$_('page.tenantPage.permissionListTitle')} />

{#await promise}
	<Spinner />
{:then permissions}
	<PermissionList {tenant} project={null} {reload} {permissions} />
{/await}
