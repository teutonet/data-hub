<script lang="ts">
	import {
		TableBodyRow,
		TableBodyCell,
		Accordion,
		AccordionItem,
		FloatingLabelInput,
		Button
	} from 'flowbite-svelte';
	import type { GetAllSensorsQuery } from '$lib/common/generated/types';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import SortingTable from './common/SortingTable.svelte';
	import type { TableHeadItem } from './common/sortingTableUtils';
	import { caseInsensitiveIncludes } from './stringUtils';
	import { activeProjectId } from './nav/activeProject';
	export let sensors: NonNullable<GetAllSensorsQuery['sensors']>;

	let filteredProject: string;
	let filteredId: string;
	let filteredName: string;

	$: items = sensors.filter(
		(item) =>
			(filteredProject ? caseInsensitiveIncludes(item.project, filteredProject) : true) &&
			(filteredId ? caseInsensitiveIncludes(item.id, filteredId) : true) &&
			(filteredName ? caseInsensitiveIncludes(item.name, filteredName) : true)
	);

	function resetFilters() {
		filteredProject = '';
		filteredId = '';
		filteredName = '';
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
			name: 'id',
			key: 'id',
			sortable: true
		},
		{
			name: 'name',
			key: 'name',
			sortable: true
		}
	];

	$: filtered = !!filteredId || !!filteredName || !!filteredProject;
</script>

<SortingTable hoverable {items} {shownKeys} componentLocKey="component.sensorsOverview">
	<svelte:fragment slot="caption">
		<caption class="caption-top">
			<Accordion>
				<AccordionItem>
					<span slot="header">
						{$_(`component.sensorsOverview.filterHeader${filtered ? 'Filtered' : ''}`, {
							values: { number: sensors.length, filteredNumber: items.length }
						})}
					</span>
					{#if $activeProjectId === 'all'}
						<div class="mt-2 flex w-full gap-2">
							<FloatingLabelInput
								classDiv="xs:w-full sm:w-1/2"
								style="outlined"
								bind:value={filteredProject}
							>
								{$_('component.sensorsOverview.projectFilterHeader')}
							</FloatingLabelInput>
						</div>
					{/if}
					<div class="mt-2 flex w-full gap-2">
						<FloatingLabelInput
							classDiv="xs:w-full sm:w-1/2"
							style="outlined"
							bind:value={filteredId}
						>
							{$_('component.sensorsOverview.idFilterHeader')}
						</FloatingLabelInput>
					</div>
					<div class="mt-2 flex w-full gap-2">
						<FloatingLabelInput
							classDiv="xs:w-full sm:w-1/2"
							style="outlined"
							bind:value={filteredName}
						>
							{$_('component.sensorsOverview.nameFilterHeader')}
						</FloatingLabelInput>
					</div>
					<div class="mt-2 flex w-full justify-end gap-2">
						<Button on:click={() => resetFilters()}>
							{$_('component.sensorsOverview.resetFilters')}
						</Button>
					</div>
				</AccordionItem>
			</Accordion>
		</caption>
	</svelte:fragment>
	<svelte:fragment slot="bodyContent" let:item>
		<TableBodyRow
			class="cursor-pointer"
			on:click={async () => await goto(`sensortype/${encodeURI(item.id)}`)}
		>
			{#if $activeProjectId === 'all'}
				<TableBodyCell>{item.project}</TableBodyCell>
			{/if}
			<TableBodyCell>{item.id}</TableBodyCell>
			<TableBodyCell>{item.name}</TableBodyCell>
		</TableBodyRow>
	</svelte:fragment>
</SortingTable>
