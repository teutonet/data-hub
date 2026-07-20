<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import OverviewCard from '$lib/overview/OverviewCard.svelte';
	import { _ } from 'svelte-i18n';
	import type { PageData } from './$types';
	import {
		getPropertyStore,
		getThingsStore,
		getSensorTypesStore,
		getallThingsErrorsStore
	} from '$lib/common/graphql/utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let projectId = $derived(data.projectId);
	let [tenant, project] = $derived(data.projectId.split('.'));

	let propertyStore = $derived(getPropertyStore(projectId));
	let sensorsStore = $derived(getThingsStore(projectId));
	let sensorTypesStore = $derived(getSensorTypesStore(projectId));
	let sensorErrorsStore = $derived(getallThingsErrorsStore(projectId));

	let newSensorsCount = $derived(
		$sensorsStore.data?.things?.filter((s) => s.status === 'created').length ?? 0
	);
	let propertiesCount = $derived($propertyStore.data?.properties?.length ?? 0);
	let sensorsCount = $derived($sensorsStore.data?.things?.length ?? 0);
	let sensorTypesCount = $derived($sensorTypesStore.data?.sensors?.length ?? 0);
	let sensorErrorsCount = $derived($sensorErrorsStore.data?.things?.length ?? 0);
</script>

<PageTitle title={$_('page.projectOverview.title')} />

<div class="flex flex-wrap">
	<OverviewCard
		href="new"
		title={$_('component.nav.newSensors')}
		description={$_('component.projectOverview.description.newSensors')}
		badgeLabel={$_('page.projectOverview.entries', {
			values: {
				number: newSensorsCount
			}
		})}
	/>
	<OverviewCard
		href="properties"
		title={$_('component.nav.properties')}
		description={$_('component.projectOverview.description.properties')}
		badgeLabel={$_('page.projectOverview.entries', {
			values: {
				number: propertiesCount
			}
		})}
	/>
	<OverviewCard
		href="sensors"
		title={$_('component.nav.sensors')}
		description={$_('component.projectOverview.description.sensors')}
		badgeLabel={$_('page.projectOverview.entries', {
			values: {
				number: sensorsCount
			}
		})}
	/>
	<OverviewCard
		href="sensortypes"
		title={$_('component.nav.sensortypes')}
		description={$_('component.projectOverview.description.sensorTypes')}
		badgeLabel={$_('page.projectOverview.entries', {
			values: {
				number: sensorTypesCount
			}
		})}
	/>
	<OverviewCard
		href="sensorerrors"
		title={$_('component.nav.sensorerrors')}
		description={$_('component.projectOverview.description.sensorErrors')}
		badgeLabel={$_('page.projectOverview.entries', {
			values: {
				number: sensorErrorsCount
			}
		})}
	/>
	{#if data.projectId !== 'all'}
		<OverviewCard
			href="sensors/new"
			title={$_('component.nav.createSensor')}
			description={$_('component.projectOverview.description.createSensor')}
		/>
	{/if}
	{#if tenant && project}
		<OverviewCard
			href={`/api/tenants/${tenant}/projects/${project}`}
			title={$_('component.nav.projectApi')}
			description={$_('component.nav.projectApiDesc')}
		/>
	{/if}
</div>
