<script lang="ts">
	import { Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';
	import { generateCrumbs } from './breadcrumbs';
	import { _ } from 'svelte-i18n';

	export let home = '';
	export let path: string;
	export let listParts: {
		part: string;
		partName: string;
		index: number;
		specialCase?: Record<string, string>;
	}[] = [];

	$: breadcrumbs = generateCrumbs(home, path, home.split('/').length, listParts);
</script>

<Breadcrumb>
	<slot name="home">
		<BreadcrumbItem href={`/${home}`} home>
			{$_('shared.breadcrumbs.home')}
		</BreadcrumbItem>
	</slot>
	{#each breadcrumbs as crumb}
		<BreadcrumbItem href={crumb.link}>
			{$_(crumb.text, { values: crumb.values })}
		</BreadcrumbItem>
	{/each}
</Breadcrumb>
