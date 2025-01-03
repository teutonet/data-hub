<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { Spinner } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { _ } from 'svelte-i18n';
	import PermissionList from '$lib/permissions/PermissionList.svelte';
	import { fetchPermissions, type ProjectResource } from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';

	export let data: PageData;

	const tenant: string = data.tenant;
	const project: string = data.project;

	const resource: ProjectResource = {
		type: 'project',
		tenant,
		project
	};

	let promise = fetchPermissions(resource, $accessToken);

	function reload() {
		promise = fetchPermissions(resource, $accessToken);
	}
</script>

<PageTitle title={$_('page.projectList.permissionListTitle')} />

{#await promise}
	<Spinner />
{:then permissions}
	<PermissionList {resource} {reload} {permissions} />
{/await}
