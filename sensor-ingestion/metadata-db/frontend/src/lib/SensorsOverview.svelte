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
	import { projectUrl } from './common/url';

	interface Props {
		sensors: NonNullable<GetAllSensorsQuery['sensors']>;
	}

	let { sensors }: Props = $props();

	let filteredProject: string = $state('');
	let filteredId: string = $state('');
	let filteredName: string = $state('');

	let items = $derived(
		sensors.filter(
			(item) =>
				(filteredProject ? caseInsensitiveIncludes(item.project, filteredProject) : true) &&
				(filteredId ? caseInsensitiveIncludes(item.id, filteredId) : true) &&
				(filteredName ? caseInsensitiveIncludes(item.name, filteredName) : true)
		)
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

	let filtered = $derived(!!filteredId || !!filteredName || !!filteredProject);
</script>

<SortingTable hoverable {items} {shownKeys} componentLocKey="component.sensorsOverview">
	{#snippet caption()}
		<caption class="caption-top">
			<Accordion>
				<AccordionItem>
					<span slot="header">
						{$_(`component.sensorsOverview.filterHeader${filtered ? 'Filtered' : ''}`, {
							values: { number: sensors.length, filteredNumber: items.length }
						})}
					</span>
					<div class="flex flex-col gap-2 xl:flex-row">
						{#if $activeProjectId === 'all'}
							<FloatingLabelInput classDiv="grow" style="outlined" bind:value={filteredProject}>
								{$_('component.sensorsOverview.projectFilterHeader')}
							</FloatingLabelInput>
						{/if}
						<FloatingLabelInput classDiv="grow" style="outlined" bind:value={filteredId}>
							{$_('component.sensorsOverview.idFilterHeader')}
						</FloatingLabelInput>
						<FloatingLabelInput classDiv="grow" style="outlined" bind:value={filteredName}>
							{$_('component.sensorsOverview.nameFilterHeader')}
						</FloatingLabelInput>
						<Button color="red" on:click={() => resetFilters()}>
							{$_('component.sensorsOverview.resetFilters')}
						</Button>
					</div>
				</AccordionItem>
			</Accordion>
		</caption>
	{/snippet}
	{#snippet bodyContent(item)}
		<TableBodyRow
			class="cursor-pointer"
			on:click={async () =>
				await goto(projectUrl(item.project ?? 'all', 'sensortype', encodeURI(item.id)))}
		>
			{#if $activeProjectId === 'all'}
				<TableBodyCell>{item.project}</TableBodyCell>
			{/if}
			<TableBodyCell>{item.id}</TableBodyCell>
			<TableBodyCell>{item.name}</TableBodyCell>
		</TableBodyRow>
	{/snippet}
</SortingTable>
