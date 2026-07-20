<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script lang="ts" module>
	export enum FormMode {
		Create,
		Edit
	}

	export type SensorFormType = {
		id: string;
		name: string;
		project: string;
		datasheet?: string | null | undefined;
		description?: string | null | undefined;
		sensorProperties: Array<{
			alias?: string | null | undefined;
			property?:
				| {
						measure?: string | null | undefined;
						metricName?: string | null | undefined;
						name: string;
				  }
				| null
				| undefined;
		}>;
	};
</script>

<script lang="ts">
	import {
		Card,
		P,
		TableBodyRow,
		TableBodyCell,
		ListPlaceholder,
		Button,
		Modal,
		Helper
	} from 'flowbite-svelte';
	import PageTitle from './PageTitle.svelte';
	import { type ThingInput, type ThingPatch } from './common/generated/types';
	import { _ } from 'svelte-i18n';
	import ValidatedFormField from './ValidatedFormField.svelte';
	import MapPinIcon from '~icons/heroicons/map-pin-solid';
	import Map from './leaflet/Map.svelte';
	import FloatingLabelSelect from './flowbite-extensions/FloatingLabelSelect.svelte';
	import type { GetAllSensorsQuery } from './common/generated/types';
	import { parsePayload } from './common/sensor-ingestion';
	import SensorFind from './SensorFind.svelte';
	import SortingTable from './common/SortingTable.svelte';
	import ChevronDownIcon from '~icons/heroicons/chevron-down';
	import ChevronRightIcon from '~icons/heroicons/chevron-right';
	import InfoIcon from '~icons/heroicons/information-circle';
	import { handleSubmit } from './nav/fetchUtils';
	import { error } from './common/toast/toast';
	import CheckIcon from '~icons/heroicons/check';
	import CancelIcon from '~icons/heroicons/x-mark';
	import TrashIcon from '~icons/heroicons/trash';
	import EditIcon from '~icons/heroicons/pencil-square';
	import type { Snippet } from 'svelte';
	import ThingOffsetList from './ThingOffsetList.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Title from './Title.svelte';

	interface Props {
		title: string;
		sensorTypes?: GetAllSensorsQuery['sensors'];
		thing: ThingPatch | ThingInput;
		thingId?: string;
		payload?: string;
		alertTop?: Snippet;
		generalExtension?: Snippet;
		bottomButtons?: Snippet;
		children?: Snippet;
	}

	let {
		title,
		sensorTypes = [],
		thing = $bindable(),
		thingId,
		payload,
		alertTop,
		generalExtension,
		bottomButtons,
		children
	}: Props = $props();

	const labelKeyInputRegex = '^(?!__)^[a-zA-Z_][a-zA-Z0-9_]*$';
	const labelValueInputRegex = '^[^\x00-\x1F\x7F]+$';

	const largeScreenQuery = new MediaQuery('min-width: 60rem');

	let showNewCustomLabelRow = $state(false);
	let customLabelEditingIndex = $state(-1);

	function getSensorPropertyItems(currentSensorType: SensorFormType) {
		return currentSensorType.sensorProperties.map((prop) => {
			return {
				...prop,
				aliasOrName: prop.alias ?? prop.property?.name ?? '-',
				metricName: prop.property?.metricName ?? '-',
				measure: prop.property?.measure ?? '-'
			};
		});
	}

	let allSensorTypes = $derived(
		sensorTypes?.filter((sensorType) => sensorType.project == thing?.project) ?? []
	);

	let currentSensorTypeId = $derived(thing?.sensorId);
	let currentSensorType = $derived(allSensorTypes?.find((e) => e.id === currentSensorTypeId));
	let parsedPayload = $derived(parsePayload(payload));
	let customLabels = $derived(
		thing?.customLabels
			?.filter((label) => {
				const splitLabel = label?.split(':', 2);
				return label && splitLabel && splitLabel.length;
			})
			.map((label) => {
				const splitLabel = label?.split(':', 2);
				if (!label || !splitLabel || splitLabel.length != 2) {
					console.error($_('sensorView.brokenCustomLabels'));
					return {
						key: '',
						value: ''
					};
				}
				return {
					key: splitLabel[0],
					value: splitLabel[1]
				};
			}) ?? []
	);

	let sensortypeSelectModalOpen = $state(false);
	let showLastPayload = $state(false);

	let newCustomLabelKey: string | undefined = $state(undefined);
	let newCustomLabelValue: string | undefined = $state(undefined);
	let originalKey: string | undefined = $state(undefined);

	function setCustomLabelEditingIndex(index: number, key: string, value: string) {
		customLabelEditingIndex = index;
		originalKey = key;
		newCustomLabelKey = key;
		newCustomLabelValue = value;
	}

	function deleteCustomLabel(labeltext: string) {
		if (!thing.customLabels?.length) {
			error($_('sensorView.customLabelArrayBroken'));
			return;
		}
		const deleteIndex = thing.customLabels.findIndex((elem) => elem == labeltext);
		if (deleteIndex === -1) {
			error($_('sensorView.customLabelNotFound'));
			return;
		}
		thing.customLabels.splice(deleteIndex, 1);
		thing = thing;
	}

	function saveCustomLabel(e: Event) {
		handleSubmit(e, () => {
			if (!newCustomLabelKey) {
				error($_('sensorView.newKeyMissing'));
				return;
			}
			if (labelIsDuplicate(newCustomLabelKey, newCustomLabelKey != originalKey)) {
				error($_('sensorView.duplicateKey'));
				return;
			}
			const newCustomLabel = `${newCustomLabelKey}:${newCustomLabelValue}`;
			if (!thing.customLabels?.length) {
				error($_('sensorView.customLabelArrayBroken'));
				return;
			}
			const fullLabelIndex = thing.customLabels.findIndex((elem) => {
				const elemKey = elem?.split(':')[0];
				if (!elemKey) {
					console.error($_('sensorView.customLabelArrayBroken'));
					return;
				}
				return elemKey == originalKey;
			});
			if (fullLabelIndex === -1) {
				error($_('sensorView.customLabelNotFound'));
				return;
			}
			thing.customLabels[fullLabelIndex] = newCustomLabel;
			resetInputs();
		});
	}

	function labelIsDuplicate(key: string, keyEdited = true) {
		if (customLabels.length === 0) {
			return false;
		}
		const existingCount = customLabels.filter((elem) => elem.key == key).length;
		return keyEdited ? existingCount > 0 : existingCount > 1;
	}

	function resetInputs() {
		newCustomLabelKey = undefined;
		newCustomLabelValue = undefined;
		customLabelEditingIndex = -1;
		showNewCustomLabelRow = false;
	}

	function saveNewCustomLabel(e: Event) {
		handleSubmit(e, () => {
			if (!newCustomLabelKey) {
				error($_('sensorView.newKeyMissing'));
				return;
			}
			if (labelIsDuplicate(newCustomLabelKey)) {
				error($_('sensorView.duplicateKey'));
				return;
			}
			const newCustomLabel = `${newCustomLabelKey}:${newCustomLabelValue}`;
			if (thing.customLabels != null) {
				thing.customLabels.push(newCustomLabel);
			} else {
				thing.customLabels = [newCustomLabel];
			}
			thing = thing;
			resetInputs();
		});
	}

	function labelSubmit(e: Event, index: number) {
		e.preventDefault();
		if (index === -1) {
			saveNewCustomLabel(e);
		} else {
			saveCustomLabel(e);
		}
	}
</script>

<PageTitle {title} />
{#if alertTop}
	{@render alertTop()}
{/if}
<Card class="max-w-full">
	<div class="mb-4">
		<div class="flex flex-col gap-4">
			<Title type="SubTitle" title={$_('sensorView.general')} />
			<div class="grid grid-cols-1 gap-4 pr-4">
				<ValidatedFormField
					bind:value={thing.name}
					inputLabel={$_('sensorView.thing.name')}
					inputId="things-name"
				/>
				<ValidatedFormField
					class="col-span-2"
					bind:value={thing.deveui}
					inputLabel={$_('sensorView.thing.deveui')}
					inputId="things-id"
				/>
				{#if generalExtension}
					{@render generalExtension()}
				{/if}
				<!-- <slot name="general-extension" /> -->
			</div>
		</div>
	</div>
	<div class="mb-4">
		<Title type="SubTitle" title={$_('sensorView.sensorLocation')} />
		<div class="flex flex-row">
			<div>
				<div class="flex flex-row gap-4">
					<P class="flex flex-row">
						<MapPinIcon class="text-slate-700 " />
						{$_('page.sensorPage.currentPosition')}
					</P>

					<P class="flex flex-row">
						<MapPinIcon class="text-orange-600" />
						{$_('page.sensorPage.newPosition')}
					</P>
				</div>
				<Map bind:latSensor={thing.lat} bind:lngSensor={thing.long} sensorName={thing.name ?? ''} />
				<br />
			</div>
			<div class=" flex w-full max-w-full flex-col gap-4 px-4">
				<ValidatedFormField
					class="col-span-3"
					bind:value={thing.locationname}
					inputLabel={$_('sensorView.map.location')}
					inputId="things-location-name"
				/>

				<ValidatedFormField
					bind:value={thing.lat}
					inputLabel={$_('sensorView.map.latitude')}
					inputId="things-latitude"
				/>
				<ValidatedFormField
					bind:value={thing.long}
					inputLabel={$_('sensorView.map.longitude')}
					inputId="things-longitude"
				/>
				<ValidatedFormField
					bind:value={thing.altitude}
					inputLabel={$_('sensorView.map.altitude')}
					inputId="things-altitude"
				/>
				<ValidatedFormField
					outerDivClasses="h-full pb-5"
					innerDivClasses="h-full"
					inputClass="h-full"
					innerWrappedClass="h-full"
					unWrappedClass="h-full"
					inputType="textarea"
					bind:value={thing.locationdesc}
					inputLabel={$_('sensorView.map.description')}
					inputId="things-location-description"
				/>
			</div>
		</div>
	</div>
	<div class="mr-4 mb-4">
		<Title type="SubTitle" title={$_('sensorView.sensorType')} />
		{#if allSensorTypes}
			{@const allSensorItems = allSensorTypes.map((e) => ({ name: e.name, value: e.id }))}
			<FloatingLabelSelect
				id="sensorSelect"
				name="sensorSelect"
				bind:value={thing.sensorId}
				labelText={$_('sensorView.sensorType')}
				items={[{ name: $_('sensorView.noSensorType'), value: null }, ...allSensorItems]}
				classDiv="mt-4"
			/>
			{#if parsedPayload}
				<div class="my-4 flex flex-row gap-2">
					<Button on:click={() => (sensortypeSelectModalOpen = true)}>
						{$_('sensorView.findSensortype')}
					</Button>
					<Button on:click={() => (showLastPayload = !showLastPayload)}>
						<div class="flex flex-row gap-2">
							{$_('sensorView.lastPayload')}
							{#if showLastPayload}
								<ChevronDownIcon />
							{:else}
								<ChevronRightIcon />
							{/if}
						</div>
					</Button>
				</div>
			{:else}
				<Card color="primary" class="mt-2 p-2 sm:p-4">
					<div class="inline-flex gap-2">
						<InfoIcon />
						{$_('sensorView.noPayload')}
					</div>
				</Card>
			{/if}
			{#if showLastPayload}
				{#if parsedPayload}
					<ValidatedFormField
						value={JSON.stringify(parsedPayload, null, 2)}
						disabled
						inputType="textarea"
						inputLabel={$_('sensorView.lastPayload')}
						inputId="sensorPayload"
						inputClass="h-72"
					/>
				{/if}
			{/if}
			{#if currentSensorType}
				{@const items = getSensorPropertyItems(currentSensorType)}
				<Title type="SubTitle" title={$_('sensorView.sensorProperties.properties')} />
				<SortingTable
					hoverable
					tableDivClass="my-4"
					{items}
					shownKeys={[
						{
							name: 'name',
							key: 'aliasOrName',
							sortable: true
						},
						{
							name: 'metricName',
							key: 'metricName',
							sortable: true
						},
						{
							name: 'measure',
							key: 'measure',
							sortable: true
						}
					]}
					componentLocKey="sensorView.sensorProperties"
				>
					{#snippet bodyContent(item)}
						<TableBodyRow>
							<TableBodyCell>
								{item.aliasOrName}
							</TableBodyCell>
							<TableBodyCell>
								{item.metricName}
							</TableBodyCell>
							<TableBodyCell>
								{item.measure}
							</TableBodyCell>
						</TableBodyRow>
					{/snippet}
				</SortingTable>
			{:else if thing.sensorId}
				<ListPlaceholder />
			{/if}
		{/if}
	</div>
	<div class={`mr-4 mb-4 flex gap-5 ${largeScreenQuery.current ? 'flex-row' : 'flex-col'}`}>
		<div
			class={`flex flex-col ${largeScreenQuery.current && thingId && thing.sensorId ? 'w-[50%]' : 'w-full'}`}
		>
			<Title type="SubTitle" title={$_('sensorView.customLabels')} />
			<form
				novalidate
				class="needs-validation"
				onsubmit={(e) => labelSubmit(e, customLabelEditingIndex)}
			>
				<SortingTable
					hoverable
					componentLocKey="sensorView.sensorProperties"
					shownKeys={[
						{
							name: 'key',
							key: 'key',
							sortable: true
						},
						{
							name: 'value',
							key: 'value',
							sortable: true
						},
						{
							name: null,
							key: null,
							sortable: false,
							cellClasses: 'w-44'
						}
					]}
					items={customLabels}
					sortKey="key"
				>
					{#snippet bodyContent(item, index)}
						<TableBodyRow class="h-[5rem]">
							{#if customLabelEditingIndex === index}
								<TableBodyCell>
									<ValidatedFormField
										bind:value={newCustomLabelKey}
										inputId="newCustomLabelKeyInput"
										inputLabel={$_('sensorView.customLabelKey')}
										pattern={labelKeyInputRegex}
										required
										patternMismatchText={$_('sensorView.customLabelKeyPatternMismatch')}
									/>
								</TableBodyCell>
								<TableBodyCell>
									<ValidatedFormField
										bind:value={newCustomLabelValue}
										inputId="newCustomLabelValueInput"
										inputLabel={$_('sensorView.customLabelValue')}
										required
										pattern={labelValueInputRegex}
										patternMismatchText={$_('sensorView.customLabelValuePatternMismatch')}
									/>
								</TableBodyCell>
								<TableBodyCell>
									<Button color="green" type="submit" title={$_('shared.action.save')}>
										<CheckIcon />
									</Button>
									<Button
										color="alternative"
										on:click={() => (customLabelEditingIndex = -1)}
										title={$_('shared.action.abort')}
									>
										<CancelIcon />
									</Button>
								</TableBodyCell>
							{:else}
								<TableBodyCell>
									{item.key}
								</TableBodyCell>
								<TableBodyCell>
									{item.value}
								</TableBodyCell>
								<TableBodyCell>
									<Button
										on:click={() => setCustomLabelEditingIndex(index, item.key, item.value)}
										title={$_('sensorView.editCustomLabelButton')}
										disabled={showNewCustomLabelRow}
									>
										<EditIcon />
									</Button>
									<Button
										color="red"
										on:click={() => deleteCustomLabel(`${item.key}:${item.value}`)}
										title={$_('sensorview.deleteCustomLabelButton')}
									>
										<TrashIcon />
									</Button>
								</TableBodyCell>
							{/if}
						</TableBodyRow>
						{#if index === customLabels.length - 1 && showNewCustomLabelRow}
							<TableBodyRow>
								<TableBodyCell>
									<ValidatedFormField
										bind:value={newCustomLabelKey}
										inputId="newCustomLabelKeyInput"
										inputLabel={$_('sensorView.customLabelKey')}
										pattern={labelKeyInputRegex}
										required
										patternMismatchText={$_('sensorView.customLabelKeyPatternMismatch')}
									/>
								</TableBodyCell>
								<TableBodyCell>
									<ValidatedFormField
										bind:value={newCustomLabelValue}
										inputId="newCustomLabelValueInput"
										inputLabel={$_('sensorView.customLabelValue')}
										required
										pattern={labelValueInputRegex}
										patternMismatchText={$_('sensorView.customLabelValuePatternMismatch')}
									/>
								</TableBodyCell>
								<TableBodyCell>
									<Button color="green" type="submit" title={$_('shared.action.save')}>
										<CheckIcon />
									</Button>
									<Button
										color="alternative"
										on:click={() => (showNewCustomLabelRow = false)}
										title={$_('shared.action.abort')}
									>
										<CancelIcon />
									</Button>
								</TableBodyCell>
							</TableBodyRow>
						{/if}
					{/snippet}
					{#snippet defaultContent()}
						{#if showNewCustomLabelRow}
							<TableBodyRow>
								<TableBodyCell>
									<ValidatedFormField
										bind:value={newCustomLabelKey}
										inputId="newCustomLabelKeyInput"
										inputLabel={$_('sensorView.customLabelKey')}
										pattern={labelKeyInputRegex}
										required
										patternMismatchText={$_('sensorView.customLabelKeyPatternMismatch')}
									/>
								</TableBodyCell>
								<TableBodyCell>
									<ValidatedFormField
										bind:value={newCustomLabelValue}
										inputId="newCustomLabelValueInput"
										inputLabel={$_('sensorView.customLabelValue')}
										required
										pattern={labelValueInputRegex}
										patternMismatchText={$_('sensorView.customLabelValuePatternMismatch')}
									/>
								</TableBodyCell>
								<TableBodyCell>
									<Button color="green" type="submit" title={$_('shared.action.save')}>
										<CheckIcon />
									</Button>
									<Button
										color="red"
										on:click={() => (showNewCustomLabelRow = false)}
										title={$_('shared.action.abort')}
									>
										<CancelIcon />
									</Button>
								</TableBodyCell>
							</TableBodyRow>
						{:else}
							<TableBodyRow>
								<TableBodyCell colspan={3}>
									<div class="flex h-full content-center justify-center p-4">
										{$_('sensorView.noCustomLabels')}
									</div>
								</TableBodyCell>
							</TableBodyRow>
						{/if}
					{/snippet}
				</SortingTable>
			</form>
			<Button
				outline
				color="green"
				class="mb-2 w-full rounded-none rounded-b-lg"
				on:click={() => (showNewCustomLabelRow = true)}
				disabled={customLabelEditingIndex != -1}
			>
				{$_('sensorView.newCustomLabelButton')}
			</Button>
			<Helper>
				{$_('sensorView.customLabelHelperText')}
			</Helper>
		</div>
		{#if thingId && thing.sensorId}
			<div class={`flex flex-col ${largeScreenQuery.current ? 'w-[50%]' : 'w-full'}`}>
				<Title type="SubTitle" title={$_('sensorView.offsetsHeading')} />
				<ThingOffsetList {thingId} sensorTypeId={thing.sensorId} />
				<Helper>
					{$_('sensorView.editOrDeleteWarning')}
				</Helper>
			</div>
		{/if}
	</div>
	{#if children}
		{@render children()}
	{/if}
</Card>
<div class="flex flex-row gap-4">
	{#if bottomButtons}
		{@render bottomButtons()}
	{/if}
</div>

<Modal bind:open={sensortypeSelectModalOpen}>
	{#if thing && parsedPayload}
		<SensorFind
			selectCallback={(sensorId) => {
				if (thing) {
					thing.sensorId = sensorId;
					sensortypeSelectModalOpen = false;
				}
			}}
			payload={parsedPayload.variables}
			project={thing.project ?? ''}
		/>
	{/if}
</Modal>
