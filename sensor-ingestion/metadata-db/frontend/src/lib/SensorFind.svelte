<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import { GET_ALL_SENSORS_WITH_PROPERTIES } from './common/graphql/queries';
	import type {
		SensorsWithPropertiesQuery,
		SensorsWithPropertiesQueryVariables
	} from './common/generated/types';
	import { Button, Card, Heading, Li, List } from 'flowbite-svelte';
	import HeroiconsCheck from '~icons/heroicons/check';
	import { _ } from 'svelte-i18n';
	import {
		getSensorMatches,
		type SensortypeAutodetectionMatch,
		type SensorShape
	} from './sensorAutodetectUtils';

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

<Heading tag="h1">{$_('component.sensorFind.pleaseSelect')}</Heading>
{#each sensorMatches as sensorMatch}
	<Card>
		<Heading tag="h4">
			{sensorMatch.name}
			<Button
				class="ml-4"
				title={$_('component.sensorFind.select')}
				color="green"
				size="sm"
				on:click={() => selectCallback(sensorMatch.id)}
			>
				<HeroiconsCheck />
				<span class="sr-only">
					{$_('component.sensorFind.select')}
				</span>
			</Button>
		</Heading>
		{@const labelEntries = Object.entries(sensorMatch.labels)}
		{#if labelEntries.length}
			<Heading tag="h5">{$_('component.sensorFind.labels')}</Heading>
			<List>
				{#each labelEntries as [key, value]}
					<Li>{key}: {value}</Li>
				{/each}
			</List>
		{/if}
		<Heading tag="h5">{$_('component.sensorFind.metrics')}</Heading>
		<List>
			{#each Object.entries(sensorMatch.metrics) as [key, value]}
				<Li>{key}: {value}</Li>
			{/each}
		</List>
		{#if sensorMatch.missingKeys.length}
			<Heading tag="h6">{$_('component.sensorFind.propertiesNotFoundInPayload')}</Heading>
			{sensorMatch.missingKeys.join(', ')}
		{/if}
	</Card>
{:else}
	{$_('component.sensorFind.noSensorFound')}
{/each}
