<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import OverviewCard from '$lib/overview/OverviewCard.svelte';
	import { _ } from 'svelte-i18n';
	import type { PageData } from './$types';

	export let data: PageData;

	$: [tenant, project] = data.projectId.split('.');
</script>

<PageTitle title={$_('page.projectOverview.title')} />

<div class="flex flex-wrap">
	<OverviewCard
		href="new"
		title={$_('component.nav.newSensors')}
		description={$_('component.projectOverview.description.newSensors')}
	/>
	<OverviewCard
		href="properties"
		title={$_('component.nav.properties')}
		description={$_('component.projectOverview.description.properties')}
	/>
	<OverviewCard
		href="sensors"
		title={$_('component.nav.sensors')}
		description={$_('component.projectOverview.description.sensors')}
	/>
	<OverviewCard
		href="sensortypes"
		title={$_('component.nav.sensortypes')}
		description={$_('component.projectOverview.description.sensorTypes')}
	/>
	<OverviewCard
		href="sensors/new"
		title={$_('component.nav.createSensor')}
		description={$_('component.projectOverview.description.createSensor')}
	/>
	{#if tenant && project}
		<OverviewCard
			href={`/api/tenants/${tenant}/projects/${project}`}
			title={$_('component.nav.projectApi')}
			description={$_('component.nav.projectApiDesc')}
		/>
	{/if}
</div>
