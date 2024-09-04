<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import { _ } from 'svelte-i18n';
	import type {
		CreateSensorWithPropsMutation,
		CreateSensorWithPropsMutationVariables,
		GetPropertiesQuery,
		GetPropertiesQueryVariables,
		CreatePropertyMutation,
		CreatePropertyMutationVariables,
		PropertyInputRecordInput,
		Scalars
	} from '$lib/common/generated/types';
	import {
		CREATE_PROPERTY,
		CREATE_SENSOR_WITH_PROPERTIES,
		GET_PROPERTIES
	} from '$lib/common/graphql/queries';
	import { Card, CardPlaceholder } from 'flowbite-svelte';
	import SensorEdit from '$lib/SensorEdit.svelte';
	import { handleCombinedErrors, performMutation } from '$lib/common/graphql/utils';
	import { success } from '$lib/common/toast/toast';
	import PageTitle from '$lib/PageTitle.svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { projectAccess } from '$lib/common/auth/stores';

	export let data: PageData;

	const client = getContextClient();

	$: projects =
		data.projectId === 'all'
			? $projectAccess.map((project) => {
					return { name: project, value: project };
				})
			: [];

	let sensor = {
		project: data.projectId,
		description: '',
		public: true,
		writeDelta: false,
		datasheet: '',
		name: '',
		appeui: '',
		things: []
	};

	$: propertyStore = queryStore<GetPropertiesQuery, GetPropertiesQueryVariables>({
		client,
		query: GET_PROPERTIES
	});

	$: properties = $propertyStore.data?.properties?.filter(
		(prop) => prop.project === null || prop.project === data.projectId
	);

	async function submitFunction(properties: PropertyInputRecordInput[]) {
		await performMutation<CreateSensorWithPropsMutation, CreateSensorWithPropsMutationVariables>(
			client,
			CREATE_SENSOR_WITH_PROPERTIES,
			{
				input: {
					project: data.projectId,
					name: sensor.name,
					appeui: sensor.appeui,
					description: sensor.description,
					datasheet: sensor.datasheet,
					public: sensor.public,
					properties
				}
			},
			{
				additionalTypenames: ['Sensor']
			}
		)
			.then(async (result) => {
				if (result.error) {
					handleCombinedErrors(result.error, { showToasts: true });
				} else {
					const sensorId = result.data?.createSensorWithProps?.sensorId;
					success('shared.message.savedSuccessfully');
					await goto(`../sensortype/${sensorId}`);
				}
			})
			.catch((e) => {
				handleCombinedErrors(e, { showToasts: true });
			});
	}

	async function createPropFunction(
		name: string,
		description?: string,
		measure?: string,
		metricName?: string
	) {
		return await performMutation<CreatePropertyMutation, CreatePropertyMutationVariables>(
			client,
			CREATE_PROPERTY,
			{
				propertyInput: {
					project: data.projectId,
					name,
					description,
					measure,
					metricName
				}
			},
			{
				additionalTypenames: ['Property']
			}
		).then((result) => {
			if (result.error) {
				handleCombinedErrors(result.error, { showToasts: true });
				return Promise.reject();
			} else {
				success('shared.message.savedSuccessfully');
				if (properties?.length === 0) {
					propertyStore.reexecute({ requestPolicy: 'network-only' });
				}
				return result.data?.createProperty?.property?.id as Scalars['UUID']['output'];
			}
		});
	}
</script>

<PageTitle title={$_('page.newSensortype.title')} />
{#if !$propertyStore.fetching && properties}
	<Card class="max-w-full">
		<SensorEdit
			bind:sensor
			{submitFunction}
			id="sensor-form"
			projectId={data.projectId}
			{projects}
			{properties}
			{createPropFunction}
			create
		/>
	</Card>
{:else}
	<CardPlaceholder />
{/if}
