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

	export let data: PageData;

	const client = getContextClient();

	$: propertyStore = queryStore<GetPropertiesQuery, GetPropertiesQueryVariables>({
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
	});

	$: properties = $propertyStore.data?.properties ?? [];
</script>

<PageTitle headingTag="h2" headingClass="pb-4" title={$_('page.propertyList.title')} />

<PropertiesOverview {properties} />
<Button href="property/new">
	<PlusIcon />
	{$_('page.propertyList.newPropertyButton')}
</Button>
