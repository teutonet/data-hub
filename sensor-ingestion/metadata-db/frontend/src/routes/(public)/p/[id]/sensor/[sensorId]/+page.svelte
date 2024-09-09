<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import { DELETE_THING, GET_THING_BY_ID, UPDATE_THING_BY_ID } from '$lib/common/graphql/queries';
	import type { PageData } from './$types';
	import { Button, Alert, Heading, P } from 'flowbite-svelte';
	import { handleCombinedErrors, performMutation } from '$lib/common/graphql/utils';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import type {
		GetThingByIdQuery,
		GetThingByIdQueryVariables,
		UpdateThingByIdMutation,
		UpdateThingByIdMutationVariables,
		DeleteThingMutation,
		DeleteThingMutationVariables
	} from '$lib/common/generated/types';
	import { _ } from 'svelte-i18n';
	import { success } from '$lib/common/toast/toast';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import { goto } from '$app/navigation';
	import SensorForm from '$lib/SensorForm.svelte';
	import ThingOffsetList from '$lib/ThingOffsetList.svelte';
	export let data: PageData;
	const client = getContextClient();

	$: thingStore = queryStore<GetThingByIdQuery, GetThingByIdQueryVariables>({
		client: client,
		query: GET_THING_BY_ID,
		variables: { id: data.sensorId }
	});

	$: thing = $thingStore.data?.thing;

	async function updateThing(activate: boolean) {
		if (!thing) {
			return;
		}

		await performMutation<UpdateThingByIdMutation, UpdateThingByIdMutationVariables>(
			client,
			UPDATE_THING_BY_ID,
			{
				id: thing.id,
				thingPatch: {
					altitude: thing.altitude,
					appid: thing.appid,
					deveui: thing.deveui,
					devid: thing.devid,
					install: thing.install,
					lat: thing.lat,
					long: thing.long,
					locationdesc: thing.locationdesc,
					locationname: thing.locationname,
					name: thing.name,
					ownedby: thing.ownedby,
					project: thing.project,
					public: thing.public,
					sensorId: thing.sensorId,
					status: activate ? 'activated' : thing.status,
					customLabels: thing.customLabels
				}
			},
			{
				additionalTypenames: ['Thing', 'ThingOffset']
			}
		).then((result) => {
			if (result.error) {
				handleCombinedErrors(result.error, { showToasts: true });
			} else {
				success('shared.message.savedSuccessfully');
			}
		});
	}

	async function deleteThing() {
		await performMutation<DeleteThingMutation, DeleteThingMutationVariables>(
			client,
			DELETE_THING,
			{
				id: data.sensorId
			},
			{
				additionalTypenames: ['Thing']
			}
		)
			.then(async (result) => {
				if (result.error) {
					handleCombinedErrors(result.error, { showToasts: true });
				} else {
					success('shared.message.savedSuccessfully');
					if (thing?.status === 'created') {
						await goto('../new');
					} else {
						await goto('../sensors');
					}
				}
			})
			.catch((e) => {
				handleCombinedErrors(e, { showToasts: true });
			});
	}
</script>

{#if !$thingStore.fetching && thing}
	<SensorForm
		title={$_('page.sensorPage.title', { values: { name: thing.name, id: thing.id } })}
		bind:thing
	>
		<svelte:fragment slot="alert-top">
			{#if thing.status === 'created'}
				<Alert class="my-4 w-full max-w-full">
					{$_('sensorView.newlyCreatedAlert')}
				</Alert>
			{/if}
		</svelte:fragment>
		<svelte:fragment slot="general-extension">
			<ValidatedFormField
				disabled
				bind:value={thing.status}
				inputLabel={$_('sensorView.thing.status')}
				inputId="things-status"
			/>
		</svelte:fragment>
		<svelte:fragment slot="bottom-buttons">
			<Button class="my-4 grow" on:click={() => updateThing(false)}>
				{$_('sensorView.saveSensor')}
			</Button>
			<DeleteButton
				buttonTitle="shared.action.delete"
				modalTitle="sensorView.deleteModal.title"
				modalBody="sensorView.deleteModal.body"
				submitFunction={deleteThing}
				additionalClasses="my-4 basis-1/6"
			/>
			{#if thing.status === 'created' && thing}
				<Button
					color="green"
					class="my-4 basis-1/6"
					disabled={thing.sensorId == null}
					on:click={() => updateThing(true)}
				>
					{$_('sensorView.activateSensor')}
				</Button>
			{/if}
		</svelte:fragment>
		{#if thing.sensorId}
			<Heading tag="h3" class="mb-2">
				{$_('sensorView.offsetsHeading')}
			</Heading>
			<P class="mb-2">
				{$_('sensorView.editOrDeleteWarning')}
			</P>
			<ThingOffsetList thingId={thing.id} sensorTypeId={thing.sensorId} />
		{/if}
	</SensorForm>
{/if}
