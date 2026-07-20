<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import PropertiesOverview from '$lib/PropertiesOverview.svelte';
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import PlusIcon from '~icons/heroicons/plus';
	import type { PageData } from './$types';
	import { getPropertyStore } from '$lib/common/graphql/utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let propertyStore = $derived(getPropertyStore(data.projectId));

	let properties = $derived($propertyStore.data?.properties ?? []);
</script>

<PageTitle title={$_('page.propertyList.title')} />

<PropertiesOverview {properties} />
{#if data.projectId !== 'all'}
	<Button outline color="green" href="property/new" class="rounded-none rounded-b-lg">
		<PlusIcon />
		{$_('page.propertyList.newPropertyButton')}
	</Button>
{/if}
