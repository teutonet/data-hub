<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import type { PageData } from './$types';
	import { _ } from 'svelte-i18n';
	import type {
		GetSensorByIdQuery,
		GetSensorByIdQueryVariables,
		Sensor,
		SensorPatch,
		UpdateSensorByIdMutation,
		UpdateSensorByIdMutationVariables,
		GetPropertiesQuery,
		GetPropertiesQueryVariables,
		CreatePropertyMutation,
		CreatePropertyMutationVariables,
		Scalars,
		EditSensorPropertyMutation,
		EditSensorPropertyMutationVariables,
		CreateSensorPropertyMutation,
		CreateSensorPropertyMutationVariables,
		DeleteSensorPropertyMutation,
		DeleteSensorPropertyMutationVariables,
		DeleteSensorMutation,
		DeleteSensorMutationVariables
	} from '$lib/common/generated/types';
	import {
		CREATE_PROPERTY,
		CREATE_SENSOR_PROPERTY,
		DELETE_SENSOR,
		DELETE_SENSOR_PROPERTY,
		EDIT_SENSOR_PROPERTY,
		GET_PROPERTIES,
		GET_SENSOR_BY_ID,
		GET_SENSOR_CHANGES,
		UPDATE_SENSOR_BY_ID
	} from '$lib/common/graphql/queries';
	import { Card, CardPlaceholder } from 'flowbite-svelte';
	import SensorEdit from '$lib/SensorEdit.svelte';
	import { handleCombinedErrors, performMutation } from '$lib/common/graphql/utils';
	import { success } from '$lib/common/toast/toast';
	import PageTitle from '$lib/PageTitle.svelte';
	import SensortypeAutodetectModal from '$lib/common/SensortypeAutodetectModal.svelte';
	import { emptyToNull } from '$lib/stringUtils';
	import { goto } from '$app/navigation';
	import HistoryModal from '$lib/HistoryModal.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const client = getContextClient();

	let sensorId = $derived(data.sensortypeId);

	let sensorStore = $derived(
		queryStore<GetSensorByIdQuery, GetSensorByIdQueryVariables>({
			client,
			query: GET_SENSOR_BY_ID,
			variables: { id: sensorId },
			pause: !sensorId
		})
	);

	let sensor: Sensor | undefined = $state();
	$effect(() => {
		sensor = $sensorStore.data?.sensor as unknown as Sensor;
	});

	let projectId = $derived(data.projectId);

	let sensorProps = $derived($sensorStore.data?.sensor?.sensorProperties);

	let propertyStore = $derived(
		queryStore<GetPropertiesQuery, GetPropertiesQueryVariables>({
			client,
			query: GET_PROPERTIES
		})
	);

	let properties = $derived(
		$propertyStore.data?.properties?.filter(
			(prop) => prop.project === null || prop.project === data.projectId
		)
	);

	let propertyNames = $derived(
		properties
			? Object.fromEntries(
					properties.map((item) => {
						return [item.id, item.name];
					})
				)
			: undefined
	);

	async function submitFunction() {
		if (!sensor) return;

		const sensorPatch: SensorPatch = {
			project: projectId,
			name: sensor.name ?? undefined,
			description: sensor.description ?? undefined,
			appeui: sensor.appeui ?? undefined,
			datasheet: sensor.datasheet ?? undefined,
			public: sensor.public,
			outOfOrderSeconds: sensor.outOfOrderSeconds
		};

		await performMutation<UpdateSensorByIdMutation, UpdateSensorByIdMutationVariables>(
			client,
			UPDATE_SENSOR_BY_ID,
			{
				id: sensorId,
				sensorPatch
			},
			{
				additionalTypenames: ['Sensor']
			}
		).then((result) => {
			if (result.error) {
				handleCombinedErrors(result.error, { showToasts: true });
			} else {
				success('shared.message.savedSuccessfully');
			}
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
				return Promise.reject(result.error);
			} else {
				success('shared.message.savedSuccessfully');
				propertyStore.reexecute({ requestPolicy: 'network-only' });
				return result.data?.createProperty?.property?.id as Scalars['UUID']['output'];
			}
		});
	}

	async function editSensorPropFunction(
		propertyId: Scalars['UUID']['input'],
		writeDelta: boolean,
		alias?: string
	) {
		await performMutation<EditSensorPropertyMutation, EditSensorPropertyMutationVariables>(
			client,
			EDIT_SENSOR_PROPERTY,
			{
				propertyId,
				sensorId,
				alias: emptyToNull(alias ?? ''),
				writeDelta
			},
			{
				additionalTypenames: ['SensorProperty']
			}
		).then((result) => {
			if (result.error) {
				handleCombinedErrors(result.error, { showToasts: true });
			} else {
				success('shared.message.savedSuccessfully');
			}
		});
	}

	async function createSensorPropFunction(
		propertyId: Scalars['UUID']['input'],
		writeDelta: boolean,
		alias?: string
	) {
		await performMutation<CreateSensorPropertyMutation, CreateSensorPropertyMutationVariables>(
			client,
			CREATE_SENSOR_PROPERTY,
			{
				project: data.projectId,
				propertyId,
				sensorId,
				alias,
				writeDelta
			},
			{
				additionalTypenames: ['SensorProperty']
			}
		).then((result) => {
			if (result.error) {
				handleCombinedErrors(result.error, { showToasts: true });
			} else {
				success('shared.message.savedSuccessfully');
			}
		});
	}

	async function deleteSensorPropFunction(propertyId: Scalars['UUID']['input']) {
		await performMutation<DeleteSensorPropertyMutation, DeleteSensorPropertyMutationVariables>(
			client,
			DELETE_SENSOR_PROPERTY,
			{
				sensorId,
				propertyId
			},
			{
				additionalTypenames: ['SensorProperty']
			}
		).then((result) => {
			if (result.error) {
				handleCombinedErrors(result.error, { showToasts: true });
			} else {
				success('shared.message.savedSuccessfully');
			}
		});
	}

	async function deleteSensorFunction() {
		await performMutation<DeleteSensorMutation, DeleteSensorMutationVariables>(
			client,
			DELETE_SENSOR,
			{
				id: sensorId
			},
			{
				additionalTypenames: ['Sensor']
			}
		)
			.then(async (result) => {
				if (result.error) {
					handleCombinedErrors(result.error, { showToasts: true });
				} else {
					success('shared.message.deletedSuccessfully');
					await goto('../sensortypes');
				}
			})
			.catch((e) => {
				handleCombinedErrors(e, { showToasts: true });
			});
	}
</script>

{#if !$sensorStore.fetching && sensor && sensorProps && !$propertyStore.fetching && properties}
	<PageTitle title={$_('page.sensortypePage.title', { values: { name: sensor.name } })} />
	<Card class="max-w-full rounded-none rounded-t-lg">
		<SensorEdit
			bind:sensor
			{submitFunction}
			{createPropFunction}
			{editSensorPropFunction}
			{createSensorPropFunction}
			{deleteSensorPropFunction}
			{deleteSensorFunction}
			{sensorProps}
			{properties}
			id="sensor-form"
			{sensorId}
		/>
		<div class="my-4 w-full">
			<SensortypeAutodetectModal sensortype={sensor} project={data.projectId} />
		</div>
	</Card>
	<HistoryModal
		entityId={sensor.id}
		dataKey="sensorChanges"
		query={GET_SENSOR_CHANGES}
		additionalNames={propertyNames}
		excludedKeys={['sensor_id']}
		openButtonClass="rounded-none rounded-b-lg"
	/>
{:else}
	<CardPlaceholder />
{/if}
