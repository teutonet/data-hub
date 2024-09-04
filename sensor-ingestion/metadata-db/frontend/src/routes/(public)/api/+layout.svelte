<script lang="ts">
	import { page } from '$app/stores';
	import Breadcrumbs from '$lib/nav/Breadcrumbs.svelte';
	import { _ } from 'svelte-i18n';

	const home = 'api';

	const LIST_PARTS = [
		{ part: 'tenants', partName: 'tenant', index: 0 },
		{ part: 'projects', partName: 'project', index: 2 },
		{
			part: 'permissions',
			partName: 'permission',
			index: 2,
			specialCase: { new: 'newPermission' }
		},
		{ part: 'permissions', partName: 'permission', index: 4, specialCase: { new: 'newPermission' } }
	];
</script>

<Breadcrumbs {home} path={$page.url.pathname} listParts={LIST_PARTS} />
<slot />
