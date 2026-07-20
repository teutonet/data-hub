<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type {
		GetPropertiesQuery,
		GetSensorByIdQuery,
		GetSensorPropsQuery,
		PropertyInputRecordInput,
		GetSensortypeAndSensorpropsQuery,
		GetSensortypeAndSensorpropsQueryVariables
	} from '$lib/common/generated/types';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { Button, Modal, P, TableBodyCell, TableBodyRow, Toggle } from 'flowbite-svelte';
	import FloatingLabelSelect from '$lib/flowbite-extensions/FloatingLabelSelect.svelte';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import { error, success } from '$lib/common/toast/toast';
	import PlusIcon from '~icons/heroicons/plus';
	import EditIcon from '~icons/heroicons/pencil-square';
	import SortingTable from './common/SortingTable.svelte';
	import CopyIcon from '~icons/heroicons/clipboard';
	import FloatingLabelTextArea from './flowbite-extensions/FloatingLabelTextArea.svelte';
	import { getContextClient } from '@urql/svelte';
	import { handleCombinedErrors } from './common/graphql/utils';
	import { GET_SENSOR_AND_SENSOR_PROPERTIES } from './common/graphql/queries';

	const client = getContextClient();

	interface Props {
		create?: boolean;
		sensor: Pick<
			NonNullable<GetSensorByIdQuery['sensor']>,
			| 'appeui'
			| 'datasheet'
			| 'description'
			| 'name'
			| 'project'
			| 'public'
			| 'things'
			| 'outOfOrderSeconds'
		>;
		sensorId?: string | null;
		submitFunction: (properties?: PropertyInputRecordInput[]) => Promise<void>;
		deleteSensorFunction?: (() => Promise<void>) | undefined;
		id: string;
		sensorProps?: NonNullable<GetSensorPropsQuery['sensorProperties']> | undefined;
		properties: NonNullable<GetPropertiesQuery['properties']>;
		createPropFunction: (
			name: string,
			description?: string,
			measure?: string,
			metricName?: string
		) => Promise<string | undefined>;
		editSensorPropFunction?:
			((propertyId: string, writeDelta: boolean, alias?: string) => Promise<void>) | undefined;
		createSensorPropFunction?:
			((propertyId: string, writeDelta: boolean, alias?: string) => Promise<void>) | undefined;
		deleteSensorPropFunction?: ((propertyId: string) => Promise<void>) | undefined;
	}

	let {
		create = false,
		sensor = $bindable(),
		sensorId = null,
		submitFunction,
		deleteSensorFunction = undefined,
		id,
		sensorProps = undefined,
		properties,
		createPropFunction,
		editSensorPropFunction = undefined,
		createSensorPropFunction = undefined,
		deleteSensorPropFunction = undefined
	}: Props = $props();

	let editPropModalOpen = $state(false);
	let newSensorPropModalOpen = $state(false);
	let newPropModalOpen = $state(false);

	let selectedProperty: string | undefined = $state(undefined);
	let propSelectHelperText: string | undefined = $state();
	let newSensorPropAlias: string | undefined = $state(undefined);
	let newSensorPropWriteDelta = $state(false);

	let newPropName: string | undefined = $state();
	let newPropMeasure: string | undefined = $state();
	let newPropMetricName: string | undefined = $state();
	let newPropDescription: string | undefined = $state();

	let editPropAlias: string | undefined = $state();
	let editPropWriteDelta: boolean = $state(false);

	let propertyInputArr: PropertyInputRecordInput[] | undefined = $derived.by(() => {
		let state = $state(create ? [] : undefined);
		return state;
	});

	let propertyOptions = $derived([
		{ name: $_('component.sensorEdit.sensorProp.newPropertyOption'), value: undefined },
		...properties
			.map((prop) => {
				return {
					name: $_('component.sensorEdit.sensorProp.propOption', {
						values: {
							name: prop.name ?? '-',
							unit: prop.measure ?? '-',
							metricName: prop.metricName ?? '-'
						}
					}),
					value: prop.id
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name))
	]);

	let sensorHasThings = $derived(sensor.things && sensor.things.length != 0);

	async function handleFormSubmit(event: Event) {
		event.preventDefault();
		const formElement = event.target as HTMLFormElement;
		if (!formElement.checkValidity()) {
			formElement.classList.add('was-validated');
		} else {
			formElement.classList.remove('was-validated');
			await submitFunction(create ? propertyInputArr : undefined);
		}
	}

	function editSensorProp(propId: string) {
		if ((!create && sensorProps?.length) || (create && propertyInputArr?.length)) {
			editPropModalOpen = true;
			selectedProperty = propId;
			const propData = (create ? propertyInputArr : sensorProps)?.find(
				(elem) => elem.propertyId === propId
			);
			const alias = propData?.alias;
			const writeDelta = propData?.writeDelta;
			editPropAlias = alias ? alias : '';
			editPropWriteDelta = writeDelta ?? false;
		}
	}

	async function deleteSensorProp(propId: string) {
		if (create) {
			propertyInputArr = propertyInputArr?.filter((elem) => elem.propertyId != propId);
		} else if (deleteSensorPropFunction) {
			await deleteSensorPropFunction(propId);
		}
	}

	function newSensorProp() {
		newSensorPropModalOpen = true;
	}

	async function handleNewSensorPropSubmit(event: Event) {
		event.preventDefault();
		const formElement = event.target as HTMLFormElement;
		if (!selectedProperty) {
			propSelectHelperText = $_('component.sensorEdit.sensorProp.propSelectHelper');
			return;
		}
		if (create && !propertyInputArr) {
			return;
		}
		if (!formElement.checkValidity()) {
			formElement.classList.add('was-validated');
		} else {
			formElement.classList.remove('was-validated');
			if (create && propertyInputArr) {
				propertyInputArr.push({
					propertyId: selectedProperty,
					alias: newSensorPropAlias,
					writeDelta: newSensorPropWriteDelta
				});
				propertyInputArr = propertyInputArr;
			} else if (createSensorPropFunction) {
				await createSensorPropFunction(
					selectedProperty,
					newSensorPropWriteDelta,
					newSensorPropAlias
				);
			} else {
				if (!create && !createSensorPropFunction) {
					error('component.sensorEdit.sensorProp.createSensorPropFunctionMissing');
					return;
				}
			}
			newSensorPropModalOpen = false;
			selectedProperty = undefined;
		}
	}

	async function handleNewPropSubmit(event: Event) {
		const formElement = event.target as HTMLFormElement;
		if (!formElement.checkValidity()) {
			formElement.classList.add('was-validated');
		} else {
			formElement.classList.remove('was-validated');
			const newPropId = await createPropFunction(
				newPropName ?? '',
				newPropDescription,
				newPropMeasure,
				newPropMetricName
			);
			newPropModalOpen = false;
			newSensorPropModalOpen = true;
			selectedProperty = newPropId;
		}
	}

	async function handleSensorPropEditSubmit(event: Event) {
		event.preventDefault();
		const formElement = event.target as HTMLFormElement;
		if (!selectedProperty) {
			propSelectHelperText = $_('component.sensorEdit.sensorProp.propSelectHelper');
			return;
		}
		if (create && !propertyInputArr) {
			return;
		}
		if (!formElement.checkValidity()) {
			formElement.classList.add('was-validated');
		} else {
			formElement.classList.remove('was-validated');
			if (create && propertyInputArr) {
				const index = propertyInputArr.findIndex((prop) => prop.propertyId === selectedProperty);
				if (index != null) {
					propertyInputArr[index].alias = editPropAlias;
					propertyInputArr[index].writeDelta = editPropWriteDelta;
					propertyInputArr = propertyInputArr;
				} else {
					error('component.sensorEdit.sensorProp.propIdMissing');
				}
			} else if (editSensorPropFunction) {
				await editSensorPropFunction(selectedProperty, editPropWriteDelta, editPropAlias);
			}
			editPropModalOpen = false;
		}
	}

	let tableProps = $derived(
		(create
			? propertyInputArr?.map((input) => {
					return {
						alias: input.alias,
						aliasOrName: input.alias ?? '-',
						propertyId: input.propertyId,
						writeDelta: input.writeDelta ?? false,
						...properties.find((prop) => prop.id === input.propertyId)
					};
				})
			: sensorProps?.map((sensorProp) => {
					return {
						alias: sensorProp.alias,
						aliasOrName: sensorProp.alias ?? sensorProp.property?.name ?? '-',
						propertyId: sensorProp.propertyId,
						writeDelta: sensorProp.writeDelta,
						...sensorProp.property
					};
				})) ?? []
	);

	let exportModalOpen = $state(false);
	let jsonExport: string = $state('');
	type SensorPropertiesExport = {
		name: string | undefined;
		metricName: string | null | undefined;
		measure: string | null | undefined;
		delta: boolean;
		alias: string | null | undefined;
		description: string | null | undefined;
	};
	type SensorDataExport = {
		name: string;
		public: boolean;
		appeui?: string | null | undefined;
		description?: string | null | undefined;
		datasheet?: string | null | undefined;
		outOfOrderSeconds?: number | null | undefined;
	};

	async function copyExportToClipboard() {
		try {
			if (jsonExport) {
				await navigator.clipboard.writeText(jsonExport);
			}
			success('page.projectOverview.apiTokenModal.copySuccess');
		} catch {
			error('page.projectOverview.apiTokenModal.copyError');
		}
	}

	async function exportSensortypeAsJSON() {
		try {
			if (sensorId != null) {
				await client
					.query<GetSensortypeAndSensorpropsQuery, GetSensortypeAndSensorpropsQueryVariables>(
						GET_SENSOR_AND_SENSOR_PROPERTIES,
						{
							uuid: sensorId
						}
					)
					.toPromise()
					.then((result) => {
						if (result.error) {
							handleCombinedErrors(result.error, { showToasts: true });
						} else {
							const sensor = result.data?.sensor;
							if (sensor) {
								const sensorData: SensorDataExport = {
									name: sensor.name,
									public: sensor.public,
									appeui: sensor.appeui,
									description: sensor.description,
									datasheet: sensor.datasheet,
									outOfOrderSeconds: sensor.outOfOrderSeconds
								};
								const sensorProperties: SensorPropertiesExport[] = [];
								for (const prop of sensor.sensorProperties) {
									if (prop.property) {
										sensorProperties.push({
											name: prop.property.name,
											alias: prop.alias,
											metricName: prop.property.metricName,
											measure: prop.property.measure,
											delta: prop.writeDelta,
											description: prop.property.description
										});
									}
								}

								const json = {
									sensordata: sensorData,
									sensorprops: sensorProperties
								};
								jsonExport = JSON.stringify(json, null, '\t');

								exportModalOpen = true;
							}
						}
					});
			}
		} catch (e: any) {
			error(e.message);
		}
	}
</script>

<form class="needs-validation" onsubmit={handleFormSubmit} novalidate {id}>
	<div class="grid grid-cols-1 gap-4 pb-4">
		<ValidatedFormField
			bind:value={sensor.name}
			inputLabel={$_('component.sensorEdit.name')}
			inputId="sensor-name"
			required
		/>
		<Toggle bind:checked={sensor.public} id="sensor-public">
			{$_('component.sensorEdit.public')}
		</Toggle>
		<ValidatedFormField
			bind:value={sensor.appeui}
			inputLabel={$_('component.sensorEdit.appeui')}
			inputId="sensor-appeui"
		/>
		<ValidatedFormField
			bind:value={sensor.description}
			inputType="textarea"
			inputLabel={$_('component.sensorEdit.description')}
			inputId="sensor-description"
		/>
		<ValidatedFormField
			bind:value={sensor.datasheet}
			inputType="textarea"
			inputLabel={$_('component.sensorEdit.datasheet')}
			inputId="sensor-datasheet"
		/>
		<ValidatedFormField
			bind:value={sensor.outOfOrderSeconds}
			inputType="number"
			inputLabel={$_('component.sensorEdit.outOfOrderSeconds')}
			inputId="sensor-outOfOrderSeconds"
		/>
	</div>
	<P class="mb-4">
		{$_('component.sensorEdit.editAndDeleteWarning')}
	</P>
	<div class="mb-4">
		<SortingTable
			hoverable
			shadow
			tableDivClass="relative overflow-x-auto sm:rounded-none sm:rounded-t-lg"
			items={tableProps}
			componentLocKey="component.sensorEdit.sensorProp"
			sortKey="aliasOrName"
			sortDirection={-1}
			shownKeys={[
				{
					name: 'nameAliasHeader',
					key: 'aliasOrName',
					sortable: true
				},
				{
					name: 'measureHeader',
					key: 'measure',
					sortable: true
				},
				{
					name: 'metricNameHeader',
					key: 'metricName',
					sortable: true
				},
				{
					name: 'writeDeltaHeader',
					key: 'writeDelta',
					sortable: true
				},
				{
					name: null,
					key: null,
					sortable: false
				}
			]}
		>
			{#snippet bodyContent(item)}
				<TableBodyRow>
					<TableBodyCell>
						{#if item.alias}
							{$_('component.sensorEdit.sensorProp.nameAlias', {
								values: { alias: item.alias, name: item.name }
							})}
						{:else}
							{item.name}
						{/if}
					</TableBodyCell>
					<TableBodyCell>
						{item.measure ?? '-'}
					</TableBodyCell>
					<TableBodyCell>
						{item.metricName ?? '-'}
					</TableBodyCell>
					<TableBodyCell>
						{item.writeDelta ? $_('shared.message.yes') : $_('shared.message.no')}
					</TableBodyCell>
					<TableBodyCell tdClass="w-fit">
						<Button
							size="lg"
							class="!p-2"
							on:click={() => editSensorProp(item.propertyId ?? '')}
							title={$_('component.sensorEdit.sensorProp.editButton')}
						>
							<EditIcon class="h-5 w-5" />
						</Button>
						<DeleteButton
							buttonTitle="shared.action.delete"
							isIcon
							submitFunction={() => deleteSensorProp(item.propertyId ?? '')}
							modalTitle="component.sensorEdit.sensorProp.deleteModalTitle"
							modalBody="component.sensorEdit.sensorProp.deleteModalBody"
						/>
					</TableBodyCell>
				</TableBodyRow>
			{/snippet}
			{#snippet defaultContent()}
				<TableBodyRow>
					<TableBodyCell colspan={4}>
						<div class="flex w-full flex-row">
							{$_('component.sensorEdit.sensorProp.noProps')}
						</div>
					</TableBodyCell>
				</TableBodyRow>
			{/snippet}
		</SortingTable>
		<Button
			outline
			color="green"
			on:click={() => newSensorProp()}
			class="w-full rounded-none rounded-b-lg"
		>
			<div class="flex flex-row gap-2">
				<PlusIcon class="h-5 w-5" />
				{$_('component.sensorEdit.sensorProp.newSensorPropButton')}
			</div>
		</Button>
	</div>
	<div class="flex flex-row gap-4">
		<Button type="submit" color="green">
			{$_('shared.action.save')}
		</Button>
		{#if !create}
			<Button on:click={exportSensortypeAsJSON} color="blue">
				{$_('shared.action.export')}
			</Button>
		{/if}
		{#if !create && !!deleteSensorFunction}
			<DeleteButton
				disabled={sensorHasThings}
				buttonTitle={sensorHasThings
					? $_('component.sensorEdit.sensorHasThings', {
							values: { numberOfThings: sensor.things.length }
						})
					: $_('shared.action.delete')}
				buttonText={$_('shared.action.delete')}
				submitFunction={deleteSensorFunction}
				modalTitle={$_('component.sensorEdit.deleteModal.title')}
				modalBody={$_('component.sensorEdit.deleteModal.body')}
			/>
		{/if}
	</div>
</form>

<Modal
	bind:open={editPropModalOpen}
	title={$_('component.sensorEdit.sensorProp.editSensorPropModalTitle')}
>
	<form novalidate class="needs-validation" onsubmit={(e) => handleSensorPropEditSubmit(e)}>
		<div class="flex flex-col gap-4">
			<ValidatedFormField
				inputId="editPropAliasLabel"
				inputLabel={$_('component.sensorEdit.sensorProp.newSensorPropAliasLabel')}
				bind:value={editPropAlias}
			/>
			<Toggle bind:checked={editPropWriteDelta}>
				{$_('component.sensorEdit.sensorProp.newSensorPropWriteDeltaLabel')}
			</Toggle>
			<Button color="green" type="submit">
				{$_('shared.action.save')}
			</Button>
		</div>
	</form>
</Modal>

<Modal
	bind:open={newSensorPropModalOpen}
	title={$_('component.sensorEdit.sensorProp.newSensorPropModalTitle')}
>
	<form novalidate class="needs-validation" onsubmit={(e) => handleNewSensorPropSubmit(e)}>
		<div class="flex flex-col gap-4">
			<div>
				<FloatingLabelSelect
					id="propertySelect"
					name="propertySelect"
					bind:value={selectedProperty}
					labelText={$_('component.sensorEdit.sensorProp.propertySelect')}
					items={propertyOptions}
					classInput={!selectedProperty ? '!rounded-t-lg rounded-b-none' : undefined}
					helperText={propSelectHelperText}
				/>
				{#if !selectedProperty}
					<Button
						outline
						color="green"
						on:click={() => (newPropModalOpen = true)}
						class="w-full rounded-t-none !rounded-b-lg"
					>
						<div class="flex flex-row gap-2">
							<PlusIcon class="h-5 w-5" />
							{$_('component.sensorEdit.sensorProp.newPropButton')}
						</div>
					</Button>
				{/if}
			</div>
			<ValidatedFormField
				bind:value={newSensorPropAlias}
				inputId="newSensorPropAliasInput"
				inputLabel={$_('component.sensorEdit.sensorProp.newSensorPropAliasLabel')}
			/>
			<Toggle bind:checked={newSensorPropWriteDelta}>
				{$_('component.sensorEdit.sensorProp.newSensorPropWriteDeltaLabel')}
			</Toggle>
			<Button type="submit" color="green">
				{$_('shared.action.save')}
			</Button>
		</div>
	</form>
</Modal>

<Modal bind:open={newPropModalOpen} title={$_('component.sensorEdit.sensorProp.newPropModalTitle')}>
	<form novalidate class="needs-validation" onsubmit={(e) => handleNewPropSubmit(e)}>
		<div class="flex flex-col gap-4">
			<ValidatedFormField
				inputId="newPropNameField"
				inputLabel={$_('component.sensorEdit.sensorProp.newPropNameLabel')}
				bind:value={newPropName}
				required
			/>
			<ValidatedFormField
				inputId="newPropMeasureField"
				inputLabel={$_('component.sensorEdit.sensorProp.newPropMeasureLabel')}
				bind:value={newPropMeasure}
			/>
			<ValidatedFormField
				inputId="newPropMetricNameField"
				inputLabel={$_('component.sensorEdit.sensorProp.newPropMetricNameLabel')}
				bind:value={newPropMetricName}
			/>
			<ValidatedFormField
				inputId="newPropDescriptionField"
				inputLabel={$_('component.sensorEdit.sensorProp.newPropDescriptionLabel')}
				bind:value={newPropDescription}
			/>
			<Button type="submit" color="green">
				{$_('shared.action.save')}
			</Button>
		</div>
	</form>
</Modal>

<Modal bind:open={exportModalOpen} title={$_('component.importExportModal.export.title')}>
	<Button
		on:click={() => {
			void copyExportToClipboard();
			exportModalOpen = false;
		}}
		><span class="flex flex-row gap-2">
			<CopyIcon />
			{$_('shared.action.copy')}
		</span>
	</Button>
	<div id="import" class="rounded-md">
		<FloatingLabelTextArea bind:value={jsonExport} disabled rows={30}></FloatingLabelTextArea>
	</div>
</Modal>
