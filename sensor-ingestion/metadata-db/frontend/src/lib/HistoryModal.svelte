<script lang="ts" context="module">
	export enum HistoryType {
		THING,
		SENSOR,
		PROPERTY,
		SENSOR_PROPERTY
	}
</script>

<script lang="ts">
	import {
		Button,
		Modal,
		Accordion,
		AccordionItem,
		Hr,
		TableBody,
		TableBodyCell,
		TableBodyRow
	} from 'flowbite-svelte';
	import type {
		AuditEvent,
		PropertyChangesQuery,
		PropertyChangesQueryVariables,
		Scalars,
		SensorChangesQuery,
		SensorChangesQueryVariables,
		SensorPropertyChangesQuery,
		SensorPropertyChangesQueryVariables,
		ThingChangesQuery,
		ThingChangesQueryVariables
	} from '$lib/common/generated/types';
	import { getContextClient, queryStore, type TypedDocumentNode } from '@urql/svelte';
	import SortingTable from '$lib/common/SortingTable.svelte';
	import {
		type TableHeadItem,
		type PaginationOptions,
		filterDateFromTo
	} from '$lib/common/sortingTableUtils';
	import { date, time, format, _ } from 'svelte-i18n';
	import { caseInsensitiveIncludes } from '$lib/stringUtils';
	import FloatingLabelSelect from '$lib/flowbite-extensions/FloatingLabelSelect.svelte';
	import FloatingLabelInput from 'flowbite-svelte/FloatingLabelInput.svelte';

	const client = getContextClient();

	const DATE_KEYS = [
		'deactivated_at',
		'gtc.signed_at',
		'dpa.signed_at',
		'revoked_date',
		'issue_date',
		'invited_at',
		'confirmed_at'
	];

	const UNIVERSAL_EXCLUDED_KEYS = ['id', 'pg_memento_audit_id', 'pgmemento_audit_id'];
	const KEYS_REQUIRING_NAME = ['sensor_id', 'property_id'];

	export let entityId: Scalars['UUID']['input'];
	export let excludedKeys: string[] = [];
	export let dataKey: string;
	export let query: TypedDocumentNode;
	export let additionalNames: Record<string, string> | undefined = undefined;

	let filteredName: string | undefined = undefined;
	let filteredDateFrom: string | undefined = undefined;
	let filteredDateTo: string | undefined = undefined;
	let filteredAttribute: string | undefined = undefined;

	let modalOpen = false;
	$: uselessKeys = UNIVERSAL_EXCLUDED_KEYS.concat(excludedKeys);

	$: historyStore = queryStore<
		ThingChangesQuery | SensorChangesQuery | SensorPropertyChangesQuery | PropertyChangesQuery,
		| ThingChangesQueryVariables
		| SensorChangesQueryVariables
		| SensorPropertyChangesQueryVariables
		| PropertyChangesQueryVariables
	>({
		client: client,
		query,
		variables: { id: entityId },
		context: {
			additionalTypenames: ['Property', 'Thing', 'ThingOffset', 'Sensor', 'SensorProperty']
		},
		pause: !modalOpen
	});

	type ProcessedChange = AuditEvent & {
		table: string;
		displayName: string;
		parsedValuesBefore: Record<string, any>;
		parsedValuesAfter: Record<string, any>;
		changesTable: [string, [any, any]][];
	};

	function filterOutUselessKeys(values: Record<string, any>): Record<string, any> {
		if (!values) {
			return {};
		}
		return Object.fromEntries(
			Object.entries(values).filter(([key, _v]) => !uselessKeys.includes(key))
		);
	}

	function addNameKeys(values: Record<string, any>): Record<string, any> {
		const keyRequiringName = Object.entries(values).find(([key, _v]) =>
			KEYS_REQUIRING_NAME.includes(key)
		);

		if (keyRequiringName) {
			const [key, value] = keyRequiringName;
			let valuesCopy = values;
			switch (key) {
				case 'sensor_id': {
					if (additionalNames && Object.keys(additionalNames).includes(value)) {
						valuesCopy['sensorName'] = additionalNames[value];
					}
					break;
				}
				case 'property_id': {
					if (additionalNames && Object.keys(additionalNames).includes(value)) {
						valuesCopy['propertyName'] = additionalNames[value];
					}
					break;
				}
			}
			return valuesCopy;
		} else {
			return values;
		}
	}

	function tryFlatten(key: string, value: any): [string, any][] {
		if (typeof value == 'object' && value && !Array.isArray(value)) {
			return Object.entries(value).map(([innerKey, value]) => [`${key}.${innerKey}`, value]);
		} else {
			return [[key, value]];
		}
	}

	function getTableName(eventKey: string) {
		const splitKey = eventKey.split(';');

		if (splitKey.length < 5) {
			console.error('Faulty eventkey:', eventKey);
			return 'unknown';
		}

		return splitKey[4];
	}

	function resetFilters() {
		filteredName = '';
		filteredAttribute = '';
		filteredDateFrom = undefined;
		filteredDateTo = undefined;
	}

	// the goal is to include changes even if the change is only on one side
	// also make sure the keys are sorted to have a consistent ordering
	function zipChanges(
		valuesBefore: Record<string, any>,
		valuesAfter: Record<string, any>
	): [string, [any, any]][] {
		const flattenedBefore = Object.fromEntries(
			Object.entries(valuesBefore).flatMap(([key, value]) => tryFlatten(key, value))
		);
		const flattenedAfter = Object.fromEntries(
			Object.entries(valuesAfter).flatMap(([key, value]) => tryFlatten(key, value))
		);
		const keys = [
			...new Set([...Object.keys(flattenedBefore), ...Object.keys(flattenedAfter)]).keys()
		].sort();
		return (
			keys
				.map((key) => [key, [flattenedBefore[key], flattenedAfter[key]]])
				// don't include values that didn't change
				.filter(([key, [before, after]]) => {
					if (key === 'sensorName' || key === 'propertyName') {
						return true;
					} else {
						return before != after;
					}
				}) as [string, [any, any]][]
		);
	}

	$: formatDatetime = (rawDate: string | null | undefined): string => {
		if (!rawDate) {
			return '';
		} else {
			let asDate = new Date(rawDate);
			return `${$date(asDate, { format: 'medium' })} ${$time(asDate)}`;
		}
	};

	$: formatDate = (rawDate: string | null | undefined): string => {
		if (!rawDate) {
			return '';
		} else {
			let asDate = new Date(rawDate);
			return $date(asDate, { format: 'medium' });
		}
	};

	function formatUser(userJson: string | null | undefined): string {
		interface SessionInfo {
			preferred_username?: string;
			api_user?: string;
		}
		const sessionInfo: SessionInfo = JSON.parse(userJson || '');
		if (sessionInfo.preferred_username) {
			return sessionInfo.preferred_username;
		} else if (sessionInfo.api_user) {
			return sessionInfo.api_user;
		} else {
			return '-';
		}
	}

	$: changes =
		$historyStore.data && dataKey
			? $historyStore.data[dataKey]
					?.flatMap((c: AuditEvent): ProcessedChange[] => {
						if (c) {
							const before = addNameKeys(filterOutUselessKeys(JSON.parse(c?.valuesBefore ?? '{}')));
							const after = addNameKeys(filterOutUselessKeys(JSON.parse(c?.valuesAfter ?? '{}')));
							const changesTable = zipChanges(before, after);
							return [
								{
									...c,
									table: getTableName(c.eventKey ?? ''),
									displayName: formatUser(c?.sessionInfo),
									parsedValuesBefore: before,
									parsedValuesAfter: after,
									changesTable
								}
							];
						} else {
							return [];
						}
					})
					.filter((c: ProcessedChange) => {
						return (
							Object.keys(c.parsedValuesAfter).length > 0 ||
							Object.keys(c.parsedValuesBefore).length > 0
						);
					})
			: [];

	function attributeFilter(change: ProcessedChange, keyOrString: string) {
		const hasKey = change.changesTable.find(([key, _]) => {
			if (
				caseInsensitiveIncludes(key, keyOrString) ||
				caseInsensitiveIncludes($format(`component.historyModal.attributes.${key}`), keyOrString)
			) {
				return true;
			} else {
				return false;
			}
		});
		return !!hasKey;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	$: filteredName,
		filteredAttribute,
		filteredDateFrom,
		filteredDateTo,
		(paginationParams.offset = 0);

	let filteredItems: ProcessedChange[];
	$: filteredItems = changes.filter(
		(change: ProcessedChange) =>
			(filteredName ? caseInsensitiveIncludes(change.displayName, filteredName) : true) &&
			(filteredAttribute ? attributeFilter(change, filteredAttribute) : true) &&
			filterDateFromTo(change.stmtDate, filteredDateFrom, filteredDateTo)
	);

	const shownKeys: TableHeadItem[] = [
		{
			name: 'datetime',
			key: 'stmtDate',
			sortable: true
		},
		{
			name: 'user',
			key: 'displayName',
			sortable: true
		},
		{
			name: 'attribute',
			key: null,
			sortable: false
		},
		{
			name: 'before',
			key: null,
			sortable: false
		},
		{
			name: 'after',
			key: null,
			sortable: false
		}
	];

	let paginationParams: PaginationOptions = {
		first: 25,
		offset: 0
	};
</script>

<Button
	color="alternative"
	on:click={() => {
		modalOpen = true;
	}}
>
	{$_('component.historyModal.toggleButton')}
</Button>

<Modal size="xl" bind:open={modalOpen} outsideclose title={$_('component.historyModal.modalTitle')}>
	<SortingTable
		hoverable
		striped
		shadow
		items={filteredItems}
		useTableBody={false}
		{shownKeys}
		componentLocKey="component.historyModal"
		sortKey="stmtDate"
		bind:paginationParams
	>
		<svelte:fragment slot="caption">
			<caption class="caption-top">
				<Accordion>
					<AccordionItem>
						<span slot="header">
							{$_('component.historyModal.filterHeader')}
						</span>
						<div class="flex w-full justify-start">
							<FloatingLabelSelect
								items={[
									{
										name: '25',
										value: 25
									},
									{
										name: '50',
										value: 50
									},
									{
										name: '100',
										value: 100
									}
								]}
								bind:value={paginationParams.first}
								name="itemsPerPageSelect"
								id="itemsPerPageSelect"
								labelText={$_('component.historyModal.itemsPerPage')}
								classDiv="xs:w-full sm:w-1/2"
							/>
						</div>

						<Hr />
						<div class="mt-2 flex w-full gap-2">
							<FloatingLabelInput
								classDiv="xs:w-full sm:w-1/2"
								style="outlined"
								bind:value={filteredName}
							>
								{$_('component.historyModal.nameHeader')}
							</FloatingLabelInput>
						</div>
						<div class="mt-2 flex w-full gap-2">
							<FloatingLabelInput
								classDiv="xs:w-full sm:w-1/2"
								style="outlined"
								bind:value={filteredAttribute}
							>
								{$_('component.historyModal.attributeHeader')}
							</FloatingLabelInput>
						</div>
						<div class="mt-2 flex w-full gap-2">
							<div class="flex gap-2 sm:w-1/2">
								<FloatingLabelInput
									classDiv="xs:w-full sm:w-1/2"
									style="outlined"
									bind:value={filteredDateFrom}
									type="datetime-local"
								>
									{$_('component.historyModal.dateRangeFrom')}
								</FloatingLabelInput>
								<FloatingLabelInput
									classDiv="xs:w-full sm:w-1/2"
									style="outlined"
									bind:value={filteredDateTo}
									type="datetime-local"
								>
									{$_('component.historyModal.dateRangeTo')}
								</FloatingLabelInput>
							</div>
						</div>
						<div class="mt-2 flex w-full justify-end gap-2">
							<Button on:click={() => resetFilters()}>
								{$_('component.historyModal.resetFilters')}
							</Button>
						</div>
					</AccordionItem>
				</Accordion>
			</caption>
		</svelte:fragment>
		<svelte:fragment slot="bodyContent" let:item>
			<TableBody
				tableBodyClass="border-b last:border-b-0 hover:bg-gray-100 hover:dark:bg-slate-700"
			>
				{#each item.changesTable as [key, [before, after]], index}
					<TableBodyRow
						class="bg-transparent hover:bg-transparent dark:bg-transparent hover:dark:bg-transparent"
					>
						{#if index == 0}
							<TableBodyCell rowspan={item.changesTable.length}>
								{formatDatetime(item?.stmtDate)}
							</TableBodyCell>
							<TableBodyCell rowspan={item.changesTable.length}>
								{item?.displayName}
							</TableBodyCell>
						{/if}
						<TableBodyCell>
							{$_(`component.historyModal.attributes.${key}`)}
						</TableBodyCell>
						<TableBodyCell>
							{#if DATE_KEYS.includes(key)}
								{formatDate(before)}
							{:else}
								{before ?? '-'}
							{/if}
						</TableBodyCell>
						<TableBodyCell>
							{#if DATE_KEYS.includes(key)}
								{formatDate(after)}
							{:else}
								{after ?? '-'}
							{/if}
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</svelte:fragment>
	</SortingTable>
</Modal>
