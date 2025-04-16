<script lang="ts">
	import { Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';
	import { generateCrumbs } from './breadcrumbs';
	import { _ } from 'svelte-i18n';
	import type { Snippet } from 'svelte';

	interface Props {
		home: string;
		path: string;
		listParts: {
			part: string;
			partName: string;
			index: number;
			specialCase?: Record<string, string>;
		}[];
		homeSnippet?: Snippet;
	}

	let { home = '', path, listParts = [], homeSnippet }: Props = $props();

	let breadcrumbs = $derived(generateCrumbs(home, path, home.split('/').length, listParts));
</script>

<Breadcrumb>
	{#if homeSnippet}
		{@render homeSnippet()}
	{:else}
		<BreadcrumbItem href={`/${home}`} home>
			{$_('shared.breadcrumbs.home')}
		</BreadcrumbItem>
	{/if}
	{#each breadcrumbs as crumb (crumb.link)}
		<BreadcrumbItem href={crumb.link}>
			{$_(crumb.text, { values: crumb.values })}
		</BreadcrumbItem>
	{/each}
</Breadcrumb>
