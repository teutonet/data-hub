<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type {
		GetPropertiesQuery,
		GetSensorByIdQuery,
		GetSensorPropsQuery,
		PropertyInputRecordInput
	} from '$lib/common/generated/types';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { Button, Modal, P, TableBodyCell, TableBodyRow, Toggle } from 'flowbite-svelte';
	import FloatingLabelSelect from '$lib/flowbite-extensions/FloatingLabelSelect.svelte';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import type { Scalars } from '$lib/common/generated/types';
	import { error } from '$lib/common/toast/toast';
	import PlusIcon from '~icons/heroicons/plus';
	import EditIcon from '~icons/heroicons/pencil-square';
	import SortingTable from './common/SortingTable.svelte';

	export let create = false;
	export let sensor: Pick<
		NonNullable<GetSensorByIdQuery['sensor']>,
		'appeui' | 'datasheet' | 'description' | 'name' | 'project' | 'public' | 'things'
	>;

	export let submitFunction: (properties?: PropertyInputRecordInput[]) => Promise<void>;
	export let deleteSensorFunction: (() => Promise<void>) | undefined = undefined;
	export let id: string;
	export let projects:
		| {
				value: string;
				name: string;
		  }[]
		| undefined;
	export let projectId: string | undefined = undefined;
	export let sensorProps: NonNullable<GetSensorPropsQuery['sensorProperties']> | undefined =
		undefined;
	export let properties: NonNullable<GetPropertiesQuery['properties']>;
	export let createPropFunction: (
		name: string,
		description?: string,
		measure?: string,
		metricName?: string
	) => Promise<Scalars['UUID']['output']>;
	export let editSensorPropFunction:
		| ((propertyId: Scalars['UUID']['input'], writeDelta: boolean, alias?: string) => Promise<void>)
		| undefined = undefined;
	export let createSensorPropFunction:
		| ((propertyId: Scalars['UUID']['input'], writeDelta: boolean, alias?: string) => Promise<void>)
		| undefined = undefined;
	export let deleteSensorPropFunction:
		| ((propertyId: Scalars['UUID']['input']) => Promise<void>)
		| undefined = undefined;

	let editPropModalOpen = false;
	let newSensorPropModalOpen = false;
	let newPropModalOpen = false;

	let selectedProperty: Scalars['UUID']['input'] | undefined = undefined;
	let propSelectHelperText: string;
	let newSensorPropAlias: string | undefined = undefined;
	let newSensorPropWriteDelta = false;

	let newPropName: string;
	let newPropMeasure: string;
	let newPropMetricName: string;
	let newPropDescription: string;

	let editPropAlias: string;
	let editPropWriteDelta: boolean;

	let propertyInputArr: PropertyInputRecordInput[] | undefined = create ? [] : undefined;

	$: propertyOptions = [
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
	];

	$: sensorHasThings = sensor.things && sensor.things.length != 0;

	async function handleFormSubmit(event: Event) {
		const formElement = event.target as HTMLFormElement;
		if (!formElement.checkValidity()) {
			formElement.classList.add('was-validated');
		} else {
			formElement.classList.remove('was-validated');
			await submitFunction(create ? propertyInputArr : undefined);
		}
	}

	function editSensorProp(propId: Scalars['UUID']['input']) {
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

	async function deleteSensorProp(propId: Scalars['UUID']['input']) {
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
				newPropName,
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

	$: tableProps =
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
				})) ?? [];
</script>

<form class="needs-validation" on:submit|preventDefault={handleFormSubmit} novalidate {id}>
	<div class="grid grid-cols-1 gap-4 pb-4">
		{#if projects && (!projectId || (create && projectId === 'all'))}
			<FloatingLabelSelect
				bind:value={sensor.project}
				items={projects}
				id="project-select"
				name="project-select"
				labelText={$_('component.sensorEdit.project')}
				required
				disabled={!create}
			/>
		{/if}
		<ValidatedFormField
			bind:value={sensor.name}
			inputLabel={$_('component.sensorEdit.name')}
			inputId="sensor-name"
			required
		/>
		<Toggle bind:checked={sensor.public} inputId="sensor-public">
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
			<svelte:fragment slot="bodyContent" let:item>
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
			</svelte:fragment>
			<svelte:fragment slot="defaultContent">
				<TableBodyRow>
					<TableBodyCell colspan="4">
						<div class="flex w-full flex-row">
							{$_('component.sensorEdit.sensorProp.noProps')}
						</div>
					</TableBodyCell>
				</TableBodyRow>
			</svelte:fragment>
		</SortingTable>
		<Button on:click={() => newSensorProp()} class="w-full rounded-none rounded-b-lg">
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
	<form
		novalidate
		class="needs-validation"
		on:submit|preventDefault={(e) => handleSensorPropEditSubmit(e)}
	>
		<div class="flex flex-col gap-4">
			<ValidatedFormField
				inputId="editPropAliasLabel"
				inputLabel={$_('component.sensorEdit.sensorProp.newSensorPropAliasLabel')}
				bind:value={editPropAlias}
			/>
			<Toggle bind:checked={editPropWriteDelta}>
				{$_('component.sensorEdit.sensorProp.newSensorPropWriteDeltaLabel')}
			</Toggle>
			<Button type="submit">
				{$_('shared.action.save')}
			</Button>
		</div>
	</form>
</Modal>

<Modal
	bind:open={newSensorPropModalOpen}
	title={$_('component.sensorEdit.sensorProp.newSensorPropModalTitle')}
>
	<form
		novalidate
		class="needs-validation"
		on:submit|preventDefault={(e) => handleNewSensorPropSubmit(e)}
	>
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
						on:click={() => (newPropModalOpen = true)}
						class="w-full !rounded-b-lg rounded-t-none"
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
	<form
		novalidate
		class="needs-validation"
		on:submit|preventDefault={(e) => handleNewPropSubmit(e)}
	>
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
