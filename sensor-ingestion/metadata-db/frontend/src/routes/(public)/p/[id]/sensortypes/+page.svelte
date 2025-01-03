<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import SensorsOverview from '$lib/SensorsOverview.svelte';
	import type {
		GetSensorsQuery,
		GetSensorsQueryVariables,
		ImportSensortypeMutation,
		ImportSensortypeMutationVariables
	} from '$lib/common/generated/types';
	import { GET_SENSORS, SENSORTYPE_IMPORT } from '$lib/common/graphql/queries';
	import { getContextClient, queryStore } from '@urql/svelte';
	import { Button, Modal, P } from 'flowbite-svelte';
	import FloatingLabelTextArea from '$lib/flowbite-extensions/FloatingLabelTextArea.svelte';
	import { _ } from 'svelte-i18n';
	import PlusIcon from '~icons/heroicons/plus';
	import ArrowDownTray from '~icons/heroicons/arrow-down-tray';
	import type { PageData } from './$types';
	import { projectUrl } from '$lib/common/url';
	import { handleCombinedErrors, projectCondition } from '$lib/common/graphql/utils';
	import { error, success } from '$lib/common/toast/toast';
	import { goto } from '$app/navigation';

	export let data: PageData;

	const client = getContextClient();

	$: projectId = data.projectId;

	$: sensorQuery = queryStore<GetSensorsQuery, GetSensorsQueryVariables>({
		client,
		query: GET_SENSORS,
		variables: {
			condition: {
				project: projectCondition(data.projectId)
			}
		}
	});

	$: sensors = $sensorQuery.data?.sensors ?? [];

	let importModalOpen: boolean = false;
	let jsonImport: string;
	let disableImport: boolean = true;
	$: {
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
	}

	async function importJSONAsSensortype() {
		try {
			JSON.parse(jsonImport);
		} catch {
			error($_('component.importExportModal.import.error'));
		}

		try {
			await client
				.mutation<ImportSensortypeMutation, ImportSensortypeMutationVariables>(SENSORTYPE_IMPORT, {
					currentProject: projectId,
					data: jsonImport
				})
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
		} catch (e) {
			error(e.message);
		}
	}
</script>

<PageTitle title={$_('page.sensorTypes.title')} />

{#if !$sensorQuery.fetching && sensors}
	<SensorsOverview {sensors} />
	{#if projectId != 'all'}
		<div class="mt-2 flex flex-row">
			<div class="mr-1 flex w-full flex-col">
				<Button
					href={projectUrl(projectId, 'sensortype', 'new')}
					title={$_('page.sensortypes.newSensortype')}
				>
					<PlusIcon />
					{$_('page.sensorTypes.newSensortype')}
				</Button>
			</div>
			<div class="ml-1 flex w-full flex-col">
				<Button
					on:click={() => {
						importModalOpen = true;
					}}
					title={$_('page.sensortypes.newSensortype')}
				>
					<ArrowDownTray class="mr-1" />
					{$_('page.sensorTypes.importSensortype')}
				</Button>
			</div>
		</div>
	{/if}
{/if}

<Modal bind:open={importModalOpen} title={$_('component.importExportModal.import.title')}>
	<div id="import" class="rounded-md">
		<FloatingLabelTextArea
			bind:value={jsonImport}
			rows="30"
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
