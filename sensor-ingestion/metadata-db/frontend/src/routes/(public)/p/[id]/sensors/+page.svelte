<script lang="ts">
	import ThingsOverview from '$lib/ThingsOverview.svelte';
	import { _ } from 'svelte-i18n';
	import PageTitle from '$lib/PageTitle.svelte';
	import type { PageData } from './$types';
	import { getThingsStore } from '$lib/common/graphql/utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let allThingsStore = $derived(getThingsStore(data.projectId));

	let allThings = $derived($allThingsStore.data?.things ?? []);
</script>

<PageTitle title={$_('page.allThings.title')} />

{#if !$allThingsStore.fetching && allThings}
	<ThingsOverview things={allThings} />
{/if}
