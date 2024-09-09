<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Button } from 'flowbite-svelte';

	import { getContextClient } from '@urql/svelte';
	import type {
		CreateThingsMutation,
		CreateThingsMutationVariables,
		ThingInput
	} from '$lib/common/generated/types';
	import { CREATE_THINGS } from '$lib/common/graphql/queries';
	import { handleCombinedErrors, performMutation } from '$lib/common/graphql/utils';
	import SensorForm from '$lib/SensorForm.svelte';
	import { success } from '$lib/common/toast/toast';
	import { goto } from '$app/navigation';
	import type { PageData } from '../import/$types';

	const client = getContextClient();

	export let data: PageData;
	let thing: ThingInput = {
		project: data.projectId,
		name: ''
	};

	async function createThing(status: string) {
		thing.status = status;
		await performMutation<CreateThingsMutation, CreateThingsMutationVariables>(
			client,
			CREATE_THINGS,
			{
				mnThing: thing
			}
		).then((result) => {
			if (result.error) {
				handleCombinedErrors(result.error, { showToasts: true });
			} else {
				const id = result.data?.mnCreateThing?.thing?.id;
				success('shared.message.savedSuccessfully');
				void goto(`../sensor/${id}`);
			}
		});
	}
</script>

<SensorForm title={$_('page.sensorPage.createSensor')} bind:thing>
	<svelte:fragment slot="bottom-buttons">
		<Button class="my-4 grow" on:click={() => createThing('created')}>
			{$_('sensorView.createSensor')}
		</Button>
		<Button color="green" class="my-4 basis-1/6" on:click={() => createThing('activated')}>
			{$_('sensorView.createActivateSensor')}
		</Button>
	</svelte:fragment>
</SensorForm>
