<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import PropertiesOverview from '$lib/PropertiesOverview.svelte';
	import type {
		GetPropertiesQuery,
		GetPropertiesQueryVariables
	} from '$lib/common/generated/types';
	import { GET_PROPERTIES } from '$lib/common/graphql/queries';
	import { getContextClient, queryStore } from '@urql/svelte';
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import PlusIcon from '~icons/heroicons/plus';
	import type { PageData } from './$types';
	import { projectCondition } from '$lib/common/graphql/utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const client = getContextClient();

	let propertyStore = $derived(
		queryStore<GetPropertiesQuery, GetPropertiesQueryVariables>({
			client,
			query: GET_PROPERTIES,
			variables: {
				condition: {
					project: projectCondition(data.projectId)
				}
			},
			context: {
				additionalTypenames: ['Property']
			}
		})
	);

	let properties = $derived($propertyStore.data?.properties ?? []);
</script>

<PageTitle headingTag="h2" headingClass="pb-4" title={$_('page.propertyList.title')} />

<PropertiesOverview {properties} />
{#if data.projectId !== 'all'}
	<Button href="property/new" class="rounded-none rounded-b-lg">
		<PlusIcon />
		{$_('page.propertyList.newPropertyButton')}
	</Button>
{/if}
