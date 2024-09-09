<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { Button } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { _ } from 'svelte-i18n';

	export let data: PageData;

	const tenant: string = data.tenant;
</script>

<PageTitle title={tenant} />

<div class="flex flex-col gap-1">
	<Button href={`${tenant}/projects`} class="mt-4">
		{$_('page.tenantPage.projectsButton')}
	</Button>

	<Button href={`${tenant}/groups`} class="mt-4">{$_('page.tenantPage.groupsButton')}</Button>

	<Button href={`${tenant}/permissions`} class="mt-4"
		>{$_('page.tenantPage.permissionListTitle')}</Button
	>
</div>
