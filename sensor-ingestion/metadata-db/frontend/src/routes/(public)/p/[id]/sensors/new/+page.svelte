<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button } from 'flowbite-svelte';

	import { getContextClient, queryStore } from '@urql/svelte';
	import type {
		CreateThingInput,
		CreateThingMutation,
		CreateThingMutationVariables,
		GetAllSensorsQuery,
		GetAllSensorsQueryVariables,
		ThingInput
	} from '$lib/common/generated/types';
	import { CREATE_THING, GET_ALL_SENSORS } from '$lib/common/graphql/queries';
	import { handleCombinedErrors, performMutation } from '$lib/common/graphql/utils';
	import SensorForm from '$lib/SensorForm.svelte';
	import { success } from '$lib/common/toast/toast';
	import { goto } from '$app/navigation';
	import type { PageData } from '../import/$types';
	import { emptyToNull, replaceComma } from '$lib/stringUtils';

	const client = getContextClient();

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	$effect(() => {
		if (data.projectId === 'all') {
			goto('./').catch((e) => {
				console.error(e.message);
			});
		}
	});

	let thing: ThingInput = $derived.by(() => {
		let state = $state({
			project: data.projectId,
			name: ''
		});
		return state;
	});

	let sensorTypeStore = $derived(
		queryStore<GetAllSensorsQuery, GetAllSensorsQueryVariables>({
			client: client,
			query: GET_ALL_SENSORS
		})
	);

	let allSensorTypes = $derived(
		$sensorTypeStore.data?.sensors?.filter((sensorType) => sensorType.project == thing?.project) ??
			[]
	);

	async function createThing(status: string) {
		thing.status = status;

		thing.lat = emptyToNull(replaceComma(thing.lat ?? ''));
		thing.long = emptyToNull(replaceComma(thing.long ?? ''));
		thing.altitude = emptyToNull(replaceComma(thing.altitude ?? ''));

		// don't include sensorId variable because it gets generated in backend
		const { sensorId: _sensorId, ...thingNoId } = thing;
		const thingInput: { input: CreateThingInput } = {
			input: {
				thing: {
					...thingNoId
				}
			}
		};

		await performMutation<CreateThingMutation, CreateThingMutationVariables>(
			client,
			CREATE_THING,
			thingInput
		).then((result) => {
			if (result.error) {
				handleCombinedErrors(result.error, { showToasts: true });
			} else {
				const id = result.data?.createThing?.thing?.id;
				success('shared.message.savedSuccessfully');
				void goto(`../sensor/${id}`);
			}
		});
	}
</script>

<SensorForm
	title={$_('page.sensorPage.createSensor')}
	bind:thing
	payload={undefined}
	sensorTypes={allSensorTypes}
>
	{#snippet bottomButtons()}
		<Button color="green" class="my-4 grow" on:click={() => createThing('created')}>
			{$_('sensorView.createSensor')}
		</Button>
		<Button color="green" class="my-4 basis-1/6" on:click={() => createThing('activated')}>
			{$_('sensorView.createActivateSensor')}
		</Button>
	{/snippet}
</SensorForm>
