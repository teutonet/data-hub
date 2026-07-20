<script lang="ts">
	import { Breadcrumb, BreadcrumbItem } from 'flowbite-svelte';
	import { generateCrumbs } from './breadcrumbs';
	import { _ } from 'svelte-i18n';
	import { type Snippet } from 'svelte';
	import { type ResourceType } from './fetchUtils';
	import type { Client as GraphQLClient } from '@urql/svelte';
	import { getResourceApiClient } from '$lib/common/graphql/utils';
	import { getResourceDisplayName } from '$lib/common/graphql/ressource-api-utils';
	import type { LayoutData } from '../../routes/(public)/api/$types';

	interface Props {
		data: LayoutData;
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

	let { data, home = '', path, listParts = [], homeSnippet }: Props = $props();

	let gqlClient: GraphQLClient = getResourceApiClient();

	let breadcrumbs = $derived.by(async () => {
		let bc = generateCrumbs(home, path, home.split('/').length, listParts);

		for (let crumb of bc) {
			if (crumb.values) {
				let type: ResourceType['type'];
				let resourceName: string;

				if (crumb.values.tenant) type = 'tenant';
				else if (data.group) type = 'group';
				else if (data.vizGroup) type = 'vizGroup';
				else if (data.project) type = 'project';
				else return;

				if (data.group) resourceName = data.group;
				else if (data.vizGroup) resourceName = data.vizGroup;
				else if (data.project) resourceName = data.project;
				else if (data.tenant) resourceName = data.tenant;
				else return;

				let resource: ResourceType = {
					tenant: data.tenant,
					type: type,
					resourceName: resourceName,
					displayName: ''
				};

				crumb.values[type] =
					(await getResourceDisplayName(gqlClient, resource)) ?? resource.resourceName;
			}
		}

		return bc;
	});
</script>

<Breadcrumb>
	{#if homeSnippet}
		{@render homeSnippet()}
	{:else}
		<BreadcrumbItem href={`/${home}`} home>
			{$_('shared.breadcrumbs.home')}
		</BreadcrumbItem>
	{/if}
	{#await breadcrumbs then breadcrumbs}
		{#each breadcrumbs as crumb (crumb.link)}
			<BreadcrumbItem href={crumb.link}>
				{$_(crumb.text, { values: crumb.values })}
			</BreadcrumbItem>
		{/each}
	{/await}
</Breadcrumb>
