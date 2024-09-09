<script lang="ts">
	import {
		TableBodyRow,
		TableBodyCell,
		Tooltip,
		Accordion,
		AccordionItem,
		FloatingLabelInput,
		Button
	} from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import type { GetAllThingsQuery } from './common/generated/types';
	import { _ } from 'svelte-i18n';
	import { projectUrl } from '$lib/common/url';
	import SortingTable from './common/SortingTable.svelte';
	import type { TableHeadItem } from './common/sortingTableUtils';
	import { caseInsensitiveIncludes } from './stringUtils';
	import { activeProjectId } from './nav/activeProject';
	export let things: NonNullable<GetAllThingsQuery['things']>;

	$: items = things
		.map((thing) => {
			const thingNameOrId = thing.name ?? thing.id;
			const sensorNameOrId = thing.sensor?.name ?? thing.sensor?.id ?? '-';

			return { ...thing, thingNameOrId, sensorNameOrId };
		})
		.filter(
			(item) =>
				(filteredName ? caseInsensitiveIncludes(item.thingNameOrId, filteredName) : true) &&
				(filteredProject ? caseInsensitiveIncludes(item.project, filteredProject) : true) &&
				(filteredSensorType
					? caseInsensitiveIncludes(item.sensorNameOrId, filteredSensorType)
					: true) &&
				(filteredStatus
					? item.status && caseInsensitiveIncludes(item.status, filteredStatus)
					: true)
		);

	let filteredName: string;
	let filteredProject: string;
	let filteredSensorType: string;
	let filteredStatus: string;

	function resetFilters() {
		filteredName = '';
		filteredProject = '';
		filteredSensorType = '';
		filteredStatus = '';
	}

	const shownKeys: TableHeadItem[] = [
		...($activeProjectId === 'all'
			? [
					{
						name: 'project',
						key: 'project',
						sortable: true
					}
				]
			: []),
		{
			name: 'name',
			key: 'thingNameOrId',
			sortable: true
		},
		{
			name: 'sensorType',
			key: 'sensorNameOrId',
			sortable: true
		},
		{
			name: 'status',
			key: 'status',
			sortable: true
		}
	];

	$: filtered = !!filteredProject || !!filteredName || !!filteredSensorType || !!filteredStatus;
</script>

<SortingTable hoverable {shownKeys} {items} componentLocKey="component.thingsOverview">
	<svelte:fragment slot="caption">
		<caption class="caption-top">
			<Accordion>
				<AccordionItem>
					<span slot="header">
						{$_(`component.thingsOverview.filterHeader${filtered ? 'Filtered' : ''}`, {
							values: { number: things.length, filteredNumber: items.length }
						})}
					</span>
					{#if $activeProjectId === 'all'}
						<div class="mt-2 flex w-full gap-2">
							<FloatingLabelInput
								classDiv="xs:w-full sm:w-1/2"
								style="outlined"
								bind:value={filteredProject}
							>
								{$_('component.thingsOverview.projectFilterHeader')}
							</FloatingLabelInput>
						</div>
					{/if}
					<div class="mt-2 flex w-full gap-2">
						<FloatingLabelInput
							classDiv="xs:w-full sm:w-1/2"
							style="outlined"
							bind:value={filteredName}
						>
							{$_('component.thingsOverview.nameFilterHeader')}
						</FloatingLabelInput>
					</div>
					<div class="mt-2 flex w-full gap-2">
						<FloatingLabelInput
							classDiv="xs:w-full sm:w-1/2"
							style="outlined"
							bind:value={filteredSensorType}
						>
							{$_('component.thingsOverview.sensorTypeFilterHeader')}
						</FloatingLabelInput>
					</div>
					<div class="mt-2 flex w-full gap-2">
						<FloatingLabelInput
							classDiv="xs:w-full sm:w-1/2"
							style="outlined"
							bind:value={filteredStatus}
						>
							{$_('component.thingsOverview.statusFilterHeader')}
						</FloatingLabelInput>
					</div>
					<div class="mt-2 flex w-full justify-end gap-2">
						<Button on:click={() => resetFilters()}>
							{$_('component.thingsOverview.resetFilters')}
						</Button>
					</div>
				</AccordionItem>
			</Accordion>
		</caption>
	</svelte:fragment>
	<svelte:fragment slot="bodyContent" let:item>
		<TableBodyRow
			on:click={async () => await goto(projectUrl(item.project, 'sensor', encodeURI(item.id)))}
			class="cursor-pointer"
		>
			{#if $activeProjectId === 'all'}
				<TableBodyCell>{item.project}</TableBodyCell>
			{/if}
			<TableBodyCell>
				<span>{item.thingNameOrId}</span>
				<Tooltip>{item.id}</Tooltip>
			</TableBodyCell>
			<TableBodyCell>
				<span>{item.sensorNameOrId}</span>
				<Tooltip>{item.sensor?.id ?? '-'}</Tooltip>
			</TableBodyCell>
			<TableBodyCell>{item.status}</TableBodyCell>
		</TableBodyRow>
	</svelte:fragment>
</SortingTable>
