<script lang="ts">
	import ThingsOverview from '$lib/ThingsOverview.svelte';
	import { _ } from 'svelte-i18n';
	import PageTitle from '$lib/PageTitle.svelte';
	import type { PageData } from './$types';
	import { getNewThingsStore } from '$lib/common/graphql/utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let thingsStore = $derived(getNewThingsStore(data.projectId));

	let things = $derived($thingsStore.data?.things);
</script>

<PageTitle title={$_('page.newThings.title')} />

{#if !$thingsStore.fetching && things}
	<ThingsOverview {things} />
{/if}
