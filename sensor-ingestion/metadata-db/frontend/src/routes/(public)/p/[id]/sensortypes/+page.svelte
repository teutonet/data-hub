<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import SensorsOverview from '$lib/SensorsOverview.svelte';
	import type {
		ImportSensortypeMutation,
		ImportSensortypeMutationVariables
	} from '$lib/common/generated/types';
	import { SENSORTYPE_IMPORT } from '$lib/common/graphql/queries';
	import { getContextClient } from '@urql/svelte';
	import { Button, Modal, P } from 'flowbite-svelte';
	import FloatingLabelTextArea from '$lib/flowbite-extensions/FloatingLabelTextArea.svelte';
	import { _ } from 'svelte-i18n';
	import PlusIcon from '~icons/heroicons/plus';
	import ArrowDownTray from '~icons/heroicons/arrow-down-tray';
	import type { PageData } from './$types';
	import { projectUrl } from '$lib/common/url';
	import { getSensorTypesStore, handleCombinedErrors } from '$lib/common/graphql/utils';
	import { error, success } from '$lib/common/toast/toast';
	import { goto } from '$app/navigation';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const client = getContextClient();

	let projectId = $derived(data.projectId);

	let sensorQuery = $derived(getSensorTypesStore(projectId));

	let sensors = $derived($sensorQuery.data?.sensors ?? []);

	let importModalOpen: boolean = $state(false);
	let jsonImport: string = $state('');
	let disableImport: boolean = $state(true);
	$effect(() => {
		try {
			const sensorJson = JSON.parse(jsonImport);
			if (
				!sensorJson.sensordata?.name ||
				sensorJson.sensordata?.public == undefined ||
				typeof sensorJson.sensordata?.public !== 'boolean' ||
				typeof sensorJson.sensordata?.outOfOrderSeconds !== 'number'
			) {
				throw new Error('not a valid json import');
			}
			disableImport = false;
		} catch {
			disableImport = true;
		}
	});

	async function importJSONAsSensortype() {
		try {
			JSON.parse(jsonImport);
		} catch {
			error($_('component.importExportModal.import.error'));
		}

		try {
			await client
				.mutation<ImportSensortypeMutation, ImportSensortypeMutationVariables>(
					SENSORTYPE_IMPORT,
					{
						currentProject: projectId,
						data: jsonImport
					},
					{
						additionalTypenames: ['Property', 'SensorType', 'SensorProperties']
					}
				)
				.toPromise()
				.then((result) => {
					if (result.error) {
						handleCombinedErrors(result.error, { showToasts: true });
					} else {
						if (result.data?.sensortypeImport?.uuid) {
							success($_('shared.message.importedSuccessfully'));
							goto(projectUrl(projectId, 'sensortype', result.data.sensortypeImport.uuid)).catch(
								(e) => {
									error($_('shared.message.networkError') + '\n' + e.message);
								}
							);
						} else {
							error($_('shared.message.networkError'));
						}
					}
				});
		} catch (e: any) {
			error(e.message);
		}
	}
</script>

<PageTitle title={$_('page.sensorTypes.title')} />

{#if !$sensorQuery.fetching && sensors}
	<SensorsOverview {sensors} />
	{#if projectId != 'all'}
		<div class="flex w-full flex-row">
			<Button
				outline
				color="green"
				href={projectUrl(projectId, 'sensortype', 'new')}
				title={$_('page.sensortypes.newSensortype')}
				class="w-full rounded-none rounded-bl-lg"
			>
				<PlusIcon />
				{$_('page.sensorTypes.newSensortype')}
			</Button>
			<Button
				outline
				on:click={() => {
					importModalOpen = true;
				}}
				title={$_('page.sensortypes.newSensortype')}
				class="w-3/6 rounded-none rounded-br-lg"
				color="blue"
			>
				<ArrowDownTray class="mr-1" />
				{$_('page.sensorTypes.importSensortype')}
			</Button>
		</div>
	{/if}
{/if}

<Modal bind:open={importModalOpen} title={$_('component.importExportModal.import.title')}>
	<div id="import" class="rounded-md">
		<FloatingLabelTextArea
			bind:value={jsonImport}
			rows={30}
			placeholder={$_('component.importExportModal.import.textAreaHelp') +
				'\n\n' +
				$_('component.importExportModal.import.example') +
				'\n{\n\t"sensordata":{\n\t\t"name":"sensorName"\n\t\t...\n\t}\n\t"sensorprops": [\n\t\t{\n\t\t\t"name": "propertyName"\n\t\t\t...\n\t\t}\n\t]\n}'}
			color={disableImport ? 'red' : 'green'}
			style="outlined"
		></FloatingLabelTextArea>
		<div>
			{#if disableImport && jsonImport != null}
				<P color="red">{$_('component.importExportModal.import.notAValidJsonFormat')}</P>
			{:else if !disableImport}
				<P color="green">{$_('component.importExportModal.import.validJsonFormat')}</P>
			{/if}
		</div>
	</div>
	<Button disabled={disableImport} on:click={importJSONAsSensortype}
		>{$_('shared.action.import')}</Button
	>
</Modal>
