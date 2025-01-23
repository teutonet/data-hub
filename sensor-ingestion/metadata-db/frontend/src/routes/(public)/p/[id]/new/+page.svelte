<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import { GET_THINGS } from '$lib/common/graphql/queries';
	import ThingsOverview from '$lib/ThingsOverview.svelte';
	import type { GetThingsQuery, GetThingsQueryVariables } from '$lib/common/generated/types';
	import { _ } from 'svelte-i18n';
	import PageTitle from '$lib/PageTitle.svelte';
	import type { PageData } from './$types';
	import { projectCondition } from '$lib/common/graphql/utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const client = getContextClient();

	let thingsStore = $derived(
		queryStore<GetThingsQuery, GetThingsQueryVariables>({
			client: client,
			query: GET_THINGS,
			variables: {
				condition: {
					status: 'created',
					project: projectCondition(data.projectId)
				}
			}
		})
	);

	let things = $derived($thingsStore.data?.things);
</script>

<PageTitle title={$_('page.newThings.title')} />

{#if !$thingsStore.fetching && things}
	<ThingsOverview {things} />
{/if}
