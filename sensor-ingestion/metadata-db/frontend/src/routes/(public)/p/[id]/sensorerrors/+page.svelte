<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import { GET_THINGS_ERRORS } from '$lib/common/graphql/queries';
	import ThingErrorsOverview from '$lib/ThingErrorsOverview.svelte';
	import type {
		GetThingsLatestErrorsQuery,
		GetThingsLatestErrorsQueryVariables
	} from '$lib/common/generated/types';
	import { _ } from 'svelte-i18n';
	import PageTitle from '$lib/PageTitle.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const client = getContextClient();
	let allThingsErrorsStore = $derived(
		queryStore<GetThingsLatestErrorsQuery, GetThingsLatestErrorsQueryVariables>({
			client: client,
			query: GET_THINGS_ERRORS,
			variables: {
				condition: {
					project: data.projectId == 'all' ? undefined : data.projectId,
					hasError: true
				}
			}
		})
	);

	const allThingsErrors = $derived($allThingsErrorsStore.data?.things ?? []);
</script>

<PageTitle title={$_('page.sensorErrorsPage.title')} />

{#if !$allThingsErrorsStore.fetching && $allThingsErrorsStore}
	<ThingErrorsOverview things={allThingsErrors} project={data.projectId} />
{/if}
