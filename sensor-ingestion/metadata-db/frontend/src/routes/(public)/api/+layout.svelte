<script lang="ts">
	import { page } from '$app/state';
	import Breadcrumbs from '$lib/nav/Breadcrumbs.svelte';
	import { _ } from 'svelte-i18n';
	import type { LayoutData } from './$types';

	interface Props {
		children?: import('svelte').Snippet;
		data: LayoutData;
	}

	let { children, data }: Props = $props();

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
		{
			part: 'permissions',
			partName: 'permission',
			index: 4,
			specialCase: { new: 'newPermission' }
		},
		{ part: 'groups', partName: 'group', index: 2, specialCase: { new: 'newPermission' } },
		{ part: 'viz-groups', partName: 'vizGroup', index: 2, specialCase: { new: 'newPermission' } }
	];
</script>

<Breadcrumbs {data} {home} path={page.url.pathname} listParts={LIST_PARTS} />
{@render children?.()}
