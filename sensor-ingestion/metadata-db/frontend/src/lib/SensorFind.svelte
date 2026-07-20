<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import { GET_ALL_SENSORS_WITH_PROPERTIES } from './common/graphql/queries';
	import type {
		SensorsWithPropertiesQuery,
		SensorsWithPropertiesQueryVariables
	} from './common/generated/types';
	import { Button, Card, Li, List } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import {
		getSensorMatches,
		type SensortypeAutodetectionMatch,
		type SensorShape
	} from './sensorAutodetectUtils';
	import Title from './Title.svelte';

	interface Props {
		payload: Record<string, string | number>;
		project: string;
		selectCallback: (sensorId: string) => void;
	}

	let { payload, project, selectCallback }: Props = $props();

	let payloadKeys = $derived(new Set(Object.keys(payload)));

	const client = getContextClient();

	let sensorsWithProps = $derived(
		queryStore<SensorsWithPropertiesQuery, SensorsWithPropertiesQueryVariables>({
			client,
			query: GET_ALL_SENSORS_WITH_PROPERTIES,
			variables: {
				project
			}
		})
	);

	let sensorShapes = $derived(
		$sensorsWithProps.data?.sensors?.map((sensor): SensorShape => {
			return {
				id: sensor.id,
				name: sensor.name,
				properties: sensor.sensorProperties.map((prop) => ({
					// if the property is null, something is broken
					name: prop.alias || prop.property?.name || '',
					metricName: prop.property?.metricName,
					measure: prop.property?.measure
				}))
			};
		}) ?? []
	);

	let sensorMatches = $derived(
		sensorShapes
			.flatMap((sensorShape): SensortypeAutodetectionMatch[] =>
				getSensorMatches(sensorShape, payloadKeys, payload)
			)
			.sort((a, b) => a.missingKeys.length - b.missingKeys.length)
	);
</script>

<Title type="SubTitle" title={$_('component.sensorFind.pleaseSelect')} />
{#each sensorMatches as sensorMatch (sensorMatch.id)}
	<Card>
		<Title type="SmallHeading" title={sensorMatch.name} />
		{@const labelEntries = Object.entries(sensorMatch.labels)}
		{#if labelEntries.length}
			<Title type="SmallHeading" title={$_('component.sensorFind.labels')} />
			<List>
				{#each labelEntries as [key, value] (key)}
					<Li>{key}: {value}</Li>
				{/each}
			</List>
		{/if}
		<Title type="SmallHeading" title={$_('component.sensorFind.metrics')} />
		<List>
			{#each Object.entries(sensorMatch.metrics) as [key, value] (key)}
				<Li>{key}: {value}</Li>
			{/each}
		</List>
		{#if sensorMatch.missingKeys.length}
			<Title type="SmallHeading" title={$_('component.sensorFind.propertiesNotFoundInPayload')} />
			{sensorMatch.missingKeys.join(', ')}
		{/if}
		<Button
			aria-label={`${sensorMatch.name} ${$_('component.sensorFind.select')}`}
			class="ml-4"
			title={$_('component.sensorFind.select')}
			color="green"
			size="sm"
			on:click={() => selectCallback(sensorMatch.id)}
		>
			{$_('component.sensorFind.select')}
		</Button>
	</Card>
{:else}
	{$_('component.sensorFind.noSensorFound')}
{/each}
