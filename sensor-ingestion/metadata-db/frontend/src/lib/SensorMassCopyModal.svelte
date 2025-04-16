<script lang="ts">
	import {
		Alert,
		Button,
		Heading,
		Label,
		Listgroup,
		Modal,
		Toggle,
		Tooltip,
		Spinner
	} from 'flowbite-svelte';
	import type {
		GetAllThingsQuery,
		Scalars,
		SensorMassCopyMutation,
		SensorMassCopyMutationVariables
	} from './common/generated/types';
	import FloatingLabelSelect from './flowbite-extensions/FloatingLabelSelect.svelte';
	import { projectAccess } from '$lib/common/auth';
	import { activeProjectId } from './nav/activeProject';
	import { inputClass, labelClass } from 'flowbite-svelte/Radio.svelte';
	import { _ } from 'svelte-i18n';
	import InfoIcon from '~icons/heroicons/information-circle';
	import { performMutation } from './common/graphql/utils';
	import { getContextClient } from '@urql/svelte';
	import { SENSOR_MASS_COPY } from './common/graphql/queries';
	import { success, error as errorToast } from './common/toast/toast';
	import { twMerge } from 'tailwind-merge';

	interface Props {
		things: NonNullable<GetAllThingsQuery['things']>;
	}

	const client = getContextClient();

	let { things }: Props = $props();

	let modalOpen = $state(false);

	let projects = $derived(
		$projectAccess
			.filter((item) => $activeProjectId != item)
			.map((item) => {
				return { name: item, value: item };
			})
	);

	let selectedThings: Scalars['UUID']['input'][] = $state([]);
	let findSensortype: boolean = $state(false);
	let overwriteValues: boolean = $state(false);
	let targetProject: string | undefined = $state();

	let projectInvalidated = $state(false);
	let showSpinner = $state(false);

	function resetInputs() {
		selectedThings = [];
		findSensortype = false;
		overwriteValues = false;
		targetProject = undefined;
	}

	async function copySensors(e: Event) {
		e.preventDefault();

		if (!targetProject) {
			projectInvalidated = true;
			return;
		}

		showSpinner = true;

		await performMutation<SensorMassCopyMutation, SensorMassCopyMutationVariables>(
			client,
			SENSOR_MASS_COPY,
			{
				input: {
					thingIds: selectedThings,
					targetProjectId: targetProject,
					findSensortype,
					overwriteValues
				}
			}
		).then((result) => {
			showSpinner = false;
			const data = result.data;
			const error = result.error;
			if (!error && data) {
				success(
					'component.sensorMassCopyModal.copySuccess',
					'component.sensorMassCopyModal.copySuccessDetail',
					{ count: data.sensorMassCopy?.count ?? 0, project: targetProject ?? '-' }
				);
				modalOpen = false;
				resetInputs();
			} else if (error) {
				console.error(error);
				errorToast('component.sensorMassCopyModal.generalCopyError');
			}
			showSpinner = false;
		});
		return;
	}

	$effect(() => {
		if (!!targetProject && projectInvalidated) {
			projectInvalidated = false;
		}
	});

	let buttonClass = twMerge('focus-within:ring-4', 'focus-within:outline-none', 'rounded-lg');
</script>

<Button on:click={() => (modalOpen = true)} color="primary">
	{$_('component.sensorMassCopyModal.bulkCopyButton')}
</Button>

<Modal
	bind:open={modalOpen}
	size="xl"
	dismissable={false}
	title={$_('component.sensorMassCopyModal.modalTitle')}
	bodyClass="p-4 md:p-5 space-y-4 flex flex-col h-[100vh] overscroll-contain"
>
	<Toggle bind:checked={findSensortype}>
		{$_('component.sensorMassCopyModal.findSensortypeToggle')}
	</Toggle>
	<Alert class="text-left" color="blue" border>
		<InfoIcon slot="icon" class="h-5 w-5" />
		{$_('component.sensorMassCopyModal.findSensortypeExplainer')}
	</Alert>
	<Toggle bind:checked={overwriteValues}>
		{$_('component.sensorMassCopyModal.overwriteValuesToggle')}
	</Toggle>
	<Alert class="text-left" color="blue" border>
		<InfoIcon slot="icon" class="h-5 w-5" />
		{$_('component.sensorMassCopyModal.overwriteValuesExplainer')}
	</Alert>
	<FloatingLabelSelect
		style="outlined"
		labelText={$_('component.sensorMassCopyModal.projectSelector')}
		id="projectSelect"
		bind:value={targetProject}
		items={projects}
		color={!targetProject && projectInvalidated ? 'red' : 'base'}
		helperText={!targetProject && projectInvalidated
			? $_('component.sensorMassCopyModal.projectMissing')
			: undefined}
	/>

	<div class="w-full flex-col gap-2 text-left">
		<Heading tag="h5">
			{$_('component.sensorMassCopyModal.thingsHeading')}
		</Heading>
		<div class="mt-4 flex w-full flex-row">
			<Button
				class={buttonClass}
				on:click={() =>
					selectedThings.length != things.length
						? (selectedThings = things.map((thing) => thing.id))
						: (selectedThings = [])}
			>
				{$_('component.sensorMassCopyModal.toggleAllSensors')}
			</Button>
			<span class="px-4 py-2">
				{$_('component.sensorMassCopyModal.numberChosen', {
					values: { count: selectedThings.length }
				})}
			</span>
		</div>
	</div>
	<div class="relative grow">
		<div class="absolute inset-0 flex flex-row">
			<Listgroup
				defaultClass="divide-y divide-gray-200 dark:divide-gray-600 overflow-y-scroll overscroll-contain w-full"
				items={things}
				let:item
				let:index
			>
				<Label class={labelClass(false, '')} for={`checkbox-${index}`}>
					<input
						id={`checkbox-${index}`}
						type="checkbox"
						value={item.id}
						bind:group={selectedThings}
						class={inputClass(false, 'primary', true, false, 'me-2', '')}
					/>
					{item.name ?? item.id}
				</Label>
				<Tooltip>
					{item.id}
				</Tooltip>
			</Listgroup>
		</div>
	</div>
	<svelte:fragment slot="footer">
		<Button
			class={twMerge(
				buttonClass,
				'bg-primary-700 hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700 text-white',
				'focus-within:ring-primary-300 dark:focus-within:ring-primary-800'
			)}
			on:click={() => {
				modalOpen = false;
				resetInputs();
			}}
		>
			{$_('shared.action.abort')}
		</Button>
		<Button
			class={twMerge(
				buttonClass,
				'hover:text-primary-700 focus-within:text-primary-700 border border-gray-200 bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:focus-within:text-white dark:hover:bg-gray-700 dark:hover:text-white',
				'focus-within:ring-gray-200 dark:focus-within:ring-gray-700',
				(!selectedThings.length || showSpinner) && 'cursor-not-allowed opacity-50'
			)}
			on:click={(e: MouseEvent) => copySensors(e)}
			disabled={!selectedThings.length || showSpinner}
		>
			{#if showSpinner}
				<Spinner class="me-3" size="4" />
			{/if}
			{$_('component.sensorMassCopyModal.copySensorsNow')}
		</Button>
	</svelte:fragment>
</Modal>
