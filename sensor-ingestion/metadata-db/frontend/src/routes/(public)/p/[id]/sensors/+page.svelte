<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import { GET_THINGS } from '$lib/common/graphql/queries';
	import ThingsOverview from '$lib/ThingsOverview.svelte';
	import type { GetThingsQuery, GetThingsQueryVariables } from '$lib/common/generated/types';
	import { _ } from 'svelte-i18n';
	import PageTitle from '$lib/PageTitle.svelte';
	import type { PageData } from './$types';
	import { projectCondition } from '$lib/common/graphql/utils';

	export let data: PageData;

	const client = getContextClient();

	$: allThingsStore = queryStore<GetThingsQuery, GetThingsQueryVariables>({
		client: client,
		query: GET_THINGS,
		variables: {
			condition: {
				project: projectCondition(data.projectId)
			}
		}
	});

	$: allThings = $allThingsStore.data?.things ?? [];
</script>

<PageTitle title={$_('page.allThings.title')} />

{#if !$allThingsStore.fetching && allThings}
	<ThingsOverview things={allThings} />
{/if}
