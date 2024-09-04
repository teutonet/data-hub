<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import {
		OffsetType,
		type CreateOffsetMutation,
		type CreateOffsetMutationVariables,
		type DeleteOffsetMutation,
		type DeleteOffsetMutationVariables,
		type GetOffsetsAndMetricNamesQuery,
		type GetOffsetsAndMetricNamesQueryVariables,
		type UpdateOffsetMutation,
		type UpdateOffsetMutationVariables
	} from '$lib/common/generated/types';
	import {
		CREATE_THING_OFFSET,
		DELETE_THING_OFFSET,
		GET_OFFSETS_AND_METRIC_NAMES,
		UPDATE_THING_OFFSET
	} from '$lib/common/graphql/queries';
	import SortingTable from '$lib/common/SortingTable.svelte';
	import { Button, TableBodyCell, TableBodyRow, type SelectOptionType } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import FloatingLabelSelect from '$lib/flowbite-extensions/FloatingLabelSelect.svelte';
	import CheckIcon from '~icons/heroicons/check';
	import CancelIcon from '~icons/heroicons/x-mark';
	import TrashIcon from '~icons/heroicons/trash';
	import EditIcon from '~icons/heroicons/pencil-square';
	import { performMutation } from '$lib/common/graphql/utils';
	import { error, success } from './common/toast/toast';
	import { handleSubmit } from './nav/fetchUtils';
	import { activeProjectId } from './nav/activeProject';
	import DeleteButton from './common/modals/DeleteButton.svelte';

	export let thingId: string;
	export let sensorTypeId: string;

	const client = getContextClient();

	let editingOffsetIndex = -1;
	let showNewOffsetRow = false;

	$: offsetsAndMetricNamesStore = queryStore<
		GetOffsetsAndMetricNamesQuery,
		GetOffsetsAndMetricNamesQueryVariables
	>({
		client,
		query: GET_OFFSETS_AND_METRIC_NAMES,
		variables: {
			thingId,
			sensorTypeId
		},
		context: {
			additionalTypenames: ['ThingOffset']
		}
	});

	let currentOffsetId: string | undefined = undefined;
	let currentOffsetMetricName: string | undefined = undefined;
	let currentOffsetValue: number | undefined = undefined;
	let currentOffsetType: OffsetType | undefined = undefined;

	function getAvailableMetricNamesAsOptions(
		currentMetricName?: string
	): SelectOptionType<string>[] {
		const currentlyUsedMetricNames = offsets.map((offset) => offset.metricName);
		const availableMetricNames = metricNames.filter(
			(name) => !currentlyUsedMetricNames.includes(name)
		);

		const withCurrent = currentMetricName
			? [currentMetricName, ...availableMetricNames]
			: availableMetricNames;

		return withCurrent.map((name) => {
			return { name: name, value: name };
		});
	}

	async function handleFormSubmit(event: Event) {
		let formCorrect = false;
		handleSubmit(event, () => {
			if (currentOffsetType === OffsetType.Div && currentOffsetValue === 0) {
				error($_('thingOffsetList.divisionByZero'));
				return;
			}
			formCorrect = true;
		});

		if (formCorrect) {
			if (editingOffsetIndex != -1) {
				if (!currentOffsetId) {
					error($_('thingOffsetList.offsetIdMissing'));
					return;
				}
				await performMutation<UpdateOffsetMutation, UpdateOffsetMutationVariables>(
					client,
					UPDATE_THING_OFFSET,
					{
						id: currentOffsetId,
						patch: {
							metricName: currentOffsetMetricName,
							offsetType: currentOffsetType,
							offsetValue: currentOffsetValue
						}
					},
					{
						additionalTypenames: ['ThingOffset']
					}
				).then((result) => {
					if (result.error) {
						console.error(result.error);
						return;
					}
					success($_('shared.message.savedSuccessfully'));
				});
			} else if (showNewOffsetRow) {
				if (
					!currentOffsetMetricName ||
					!currentOffsetType ||
					!currentOffsetValue ||
					!$activeProjectId
				) {
					return;
				}
				await performMutation<CreateOffsetMutation, CreateOffsetMutationVariables>(
					client,
					CREATE_THING_OFFSET,
					{
						input: {
							thingId,
							project: $activeProjectId,
							metricName: currentOffsetMetricName,
							offsetType: currentOffsetType,
							offsetValue: currentOffsetValue
						}
					},
					{
						additionalTypenames: ['ThingOffset']
					}
				).then((result) => {
					if (result.error) {
						console.error(result.error);
						return;
					}
					success($_('shared.message.savedSuccessfully'));
				});
			}
			resetInputs();
		}
	}

	function resetInputs() {
		editingOffsetIndex = -1;
		showNewOffsetRow = false;
		currentOffsetId = undefined;
		currentOffsetMetricName = undefined;
		currentOffsetType = undefined;
		currentOffsetValue = undefined;
	}

	function editOffset(offset, index: number) {
		editingOffsetIndex = index;
		currentOffsetMetricName = offset.metricName;
		currentOffsetValue = offset.offsetValue;
		currentOffsetType = offset.offsetType;
		currentOffsetId = offset.id;
	}

	async function deleteOffset(offsetId: string) {
		await performMutation<DeleteOffsetMutation, DeleteOffsetMutationVariables>(
			client,
			DELETE_THING_OFFSET,
			{
				offsetId
			},
			{
				additionalTypenames: ['ThingOffset']
			}
		)
			.then((result) => {
				if (result.error) {
					error($_('shared.message.errorSaving'));
				}

				success($_('shared.message.deletedSuccessfully'));
			})
			.catch((err: Error) => {
				console.error(err);
			});
	}

	$: offsets = $offsetsAndMetricNamesStore.data?.thingOffsets ?? [];
	$: metricNames =
		$offsetsAndMetricNamesStore.data?.sensorProperties?.map(
			(prop) => prop.property?.metricName ?? '-'
		) ?? [];
</script>

<form novalidate class="needs-validation" on:submit|preventDefault={(e) => handleFormSubmit(e)}>
	<SortingTable
		hoverable
		sortKey="metricName"
		shownKeys={[
			{
				name: 'metric',
				key: 'metricName',
				sortable: true
			},
			{
				name: 'offsetType',
				key: 'offsetType',
				sortable: true
			},
			{
				name: 'offsetValue',
				key: 'offsetValue',
				sortable: false
			},
			{
				name: null,
				key: null,
				sortable: false,
				cellClasses: 'w-48'
			}
		]}
		componentLocKey="thingOffsetList"
		items={offsets}
	>
		<svelte:fragment slot="bodyContent" let:item let:index>
			<TableBodyRow>
				{#if index === editingOffsetIndex}
					<TableBodyCell>
						<FloatingLabelSelect
							id="currentOffsetMetricNameSelect"
							name="currentOffsetMetricNameSelect"
							labelText={$_('thingOffsetList.offsetMetricNameSelectLabel')}
							bind:value={currentOffsetMetricName}
							items={getAvailableMetricNamesAsOptions(item.metricName)}
						/>
					</TableBodyCell>
					<TableBodyCell>
						<FloatingLabelSelect
							id="currentOffsetTypeSelect"
							name="currentOffsetTypeSelect"
							labelText={$_('thingOffsetList.offsetTypeSelectLabel')}
							bind:value={currentOffsetType}
							items={Object.values(OffsetType).map((type) => ({
								value: type,
								name: $_(`thingOffsetList.offsetTypes.${type}`)
							}))}
						/>
					</TableBodyCell>
					<TableBodyCell>
						<ValidatedFormField
							step="0.001"
							inputType="number"
							inputLabel={$_('thingOffsetList.offsetValueInputLabel')}
							inputId="offsetValueInput"
							bind:value={currentOffsetValue}
							required
						/>
					</TableBodyCell>
					<TableBodyCell>
						<Button
							size="lg"
							class="!p-2"
							color="alternative"
							on:click={() => (editingOffsetIndex = -1)}
							title={$_('shared.action.abort')}
						>
							<CancelIcon class="h-5 w-5" />
						</Button>
						<Button
							size="lg"
							color="green"
							class="!p-2"
							type="submit"
							title={$_('shared.action.save')}
						>
							<CheckIcon class="h-5 w-5" />
						</Button>
					</TableBodyCell>
				{:else}
					<TableBodyCell>
						{item.metricName}
					</TableBodyCell>
					<TableBodyCell>
						{$_(`thingOffsetList.offsetTypes.${item.offsetType}`)}
					</TableBodyCell>
					<TableBodyCell>
						{item.offsetValue}
					</TableBodyCell>
					<TableBodyCell>
						<Button
							class="!p-2"
							size="lg"
							disabled={showNewOffsetRow}
							on:click={() => editOffset(item, index)}
							title={$_('thingOffsetList.editButton')}
						>
							<EditIcon class="h-5 w-5" />
						</Button>
						<DeleteButton
							buttonTitle={$_('thingOffsetList.deleteButton')}
							isIcon
							submitFunction={() => deleteOffset(item.id)}
							modalTitle={$_('thingOffsetList.deleteModalTitle')}
							modalBody={$_('thingOffsetList.deleteModalBody', {
								values: { metricName: item.metricName }
							})}
						>
							<TrashIcon class="h-5 w-5" />
						</DeleteButton>
					</TableBodyCell>
				{/if}
			</TableBodyRow>
			{#if index === offsets.length - 1 && showNewOffsetRow}
				<TableBodyRow>
					<TableBodyCell>
						<FloatingLabelSelect
							id="currentOffsetMetricNameSelect"
							name="currentOffsetMetricNameSelect"
							labelText={$_('thingOffsetList.offsetMetricNameSelectLabel')}
							bind:value={currentOffsetMetricName}
							items={getAvailableMetricNamesAsOptions()}
						/>
					</TableBodyCell>
					<TableBodyCell>
						<FloatingLabelSelect
							id="currentOffsetTypeSelect"
							name="currentOffsetTypeSelect"
							labelText={$_('thingOffsetList.offsetTypeSelectLabel')}
							bind:value={currentOffsetType}
							items={Object.values(OffsetType).map((type) => ({
								value: type,
								name: $_(`thingOffsetList.offsetTypes.${type}`)
							}))}
						/>
					</TableBodyCell>
					<TableBodyCell>
						<ValidatedFormField
							step="0.001"
							inputType="number"
							inputLabel={$_('thingOffsetList.offsetValueInputLabel')}
							inputId="offsetValueInput"
							bind:value={currentOffsetValue}
							required
						/>
					</TableBodyCell>
					<TableBodyCell>
						<Button
							class="!p-2"
							size="lg"
							color="alternative"
							on:click={() => resetInputs()}
							title={$_('shared.action.abort')}
						>
							<CancelIcon class="h-5 w-5" />
						</Button>
						<Button
							class="!p-2"
							size="lg"
							color="green"
							type="submit"
							title={$_('shared.action.save')}
						>
							<CheckIcon class="h-5 w-5" />
						</Button>
					</TableBodyCell>
				</TableBodyRow>
			{/if}
		</svelte:fragment>
		<svelte:fragment slot="defaultContent">
			{#if showNewOffsetRow}
				<TableBodyRow>
					<TableBodyCell>
						<FloatingLabelSelect
							id="currentOffsetMetricNameSelect"
							name="currentOffsetMetricNameSelect"
							labelText={$_('thingOffsetList.offsetMetricNameSelectLabel')}
							bind:value={currentOffsetMetricName}
							items={getAvailableMetricNamesAsOptions()}
						/>
					</TableBodyCell>
					<TableBodyCell>
						<FloatingLabelSelect
							id="currentOffsetTypeSelect"
							name="currentOffsetTypeSelect"
							labelText={$_('thingOffsetList.offsetTypeSelectLabel')}
							bind:value={currentOffsetType}
							items={Object.values(OffsetType).map((type) => ({
								value: type,
								name: $_(`thingOffsetList.offsetTypes.${type}`)
							}))}
						/>
					</TableBodyCell>
					<TableBodyCell>
						<ValidatedFormField
							step="0.001"
							inputType="number"
							inputLabel={$_('thingOffsetList.offsetValueInputLabel')}
							inputId="offsetValueInput"
							bind:value={currentOffsetValue}
							required
						/>
					</TableBodyCell>
					<TableBodyCell>
						<Button
							class="!p-2"
							size="lg"
							color="alternative"
							on:click={() => resetInputs()}
							title={$_('shared.action.abort')}
						>
							<CancelIcon class="h-5 w-5" />
						</Button>
						<Button
							size="lg"
							class="!p-2"
							color="green"
							type="submit"
							title={$_('shared.action.save')}
						>
							<CheckIcon class="h-5 w-5" />
						</Button>
					</TableBodyCell>
				</TableBodyRow>
			{:else}
				<TableBodyRow>
					<TableBodyCell colspan="4">
						<div class="flex h-full content-center justify-center p-4">
							{$_('thingOffsetList.noOffsets')}
						</div>
					</TableBodyCell>
				</TableBodyRow>
			{/if}
		</svelte:fragment>
	</SortingTable>
	<Button
		color="alternative"
		class="mb-2 w-full rounded-none rounded-b-lg"
		on:click={() => (showNewOffsetRow = true)}
		disabled={editingOffsetIndex != -1 || offsets.length === metricNames.length}
	>
		{$_('thingOffsetList.newOffsetButton')}
	</Button>
</form>
