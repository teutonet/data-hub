<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { Spinner } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { _ } from 'svelte-i18n';
	import PermissionList from '$lib/permissions/PermissionList.svelte';
	import { fetchPermissions, type TenantResource } from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const tenant: string = data.tenant;

	const resource: TenantResource = {
		type: 'tenant',
		tenant
	};

	let promise = $state(fetchPermissions(resource, $accessToken));

	function reload() {
		promise = fetchPermissions(resource, $accessToken);
	}
</script>

<PageTitle title={$_('page.tenantPage.permissionListTitle')} />

{#await promise}
	<Spinner />
{:then permissions}
	<PermissionList {resource} {reload} {permissions} />
{/await}
