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
		UPDATE_SENSOR_BY_ID
	} from '$lib/common/graphql/queries';
	import { Card, CardPlaceholder } from 'flowbite-svelte';
	import SensorEdit from '$lib/SensorEdit.svelte';
	import { handleCombinedErrors, performMutation } from '$lib/common/graphql/utils';
	import { success } from '$lib/common/toast/toast';
	import PageTitle from '$lib/PageTitle.svelte';
	import { projectAccess } from '$lib/common/auth';
	import SensortypeAutodetectModal from '$lib/common/SensortypeAutodetectModal.svelte';
	import { emptyToNull } from '$lib/stringUtils';
	import { goto } from '$app/navigation';

	export let data: PageData;

	const client = getContextClient();

	$: sensorId = data.sensortypeId;

	$: sensorStore = queryStore<GetSensorByIdQuery, GetSensorByIdQueryVariables>({
		client,
		query: GET_SENSOR_BY_ID,
		variables: { id: sensorId },
		pause: !sensorId
	});

	$: sensor = $sensorStore.data?.sensor as unknown as Sensor;

	$: projectId = data.projectId;

	$: rawProjects =
		data.projectId === 'all'
			? $projectAccess.map((project) => {
					return { name: project, value: project };
				})
			: undefined;

	$: projects = rawProjects?.length
		? [{ name: $_('component.nav.allProjects'), value: 'all' }, ...rawProjects]
		: undefined;

	$: sensorProps = $sensorStore.data?.sensor?.sensorProperties;

	$: propertyStore = queryStore<GetPropertiesQuery, GetPropertiesQueryVariables>({
		client,
		query: GET_PROPERTIES
	});

	$: properties = $propertyStore.data?.properties?.filter(
		(prop) => prop.project === null || prop.project === data.projectId
	);

	async function submitFunction() {
		const sensorPatch: SensorPatch = {
			project: projectId,
			name: sensor.name ?? undefined,
			description: sensor.description ?? undefined,
			appeui: sensor.appeui ?? undefined,
			datasheet: sensor.datasheet ?? undefined,
			public: sensor.public
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
				return Promise.reject();
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
	<Card class="max-w-full">
		<SensorEdit
			bind:sensor
			{submitFunction}
			{createPropFunction}
			{editSensorPropFunction}
			{createSensorPropFunction}
			{deleteSensorPropFunction}
			{deleteSensorFunction}
			{projectId}
			{projects}
			{sensorProps}
			{properties}
			id="sensor-form"
		/>
		<div class="my-4 w-full">
			<SensortypeAutodetectModal sensortype={sensor} project={data.projectId} />
		</div>
	</Card>
{:else}
	<CardPlaceholder />
{/if}
