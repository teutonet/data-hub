<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		Button,
		FloatingLabelInput,
		TableBodyCell,
		TableBodyRow,
		Tooltip
	} from 'flowbite-svelte';
	import type { GetAllPropertiesQuery } from './common/generated/types';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import SortingTable from './common/SortingTable.svelte';
	import type { TableHeadItem } from './common/sortingTableUtils';
	import { caseInsensitiveIncludes } from './stringUtils';
	import { activeProjectId } from './nav/activeProject';

	export let properties: NonNullable<GetAllPropertiesQuery['properties']>;

	let filteredProject: string;
	let filteredName: string;
	let filteredMeasure: string;
	let filteredMetricName: string;

	function resetFilters() {
		filteredProject = '';
		filteredName = '';
		filteredMeasure = '';
		filteredMetricName = '';
	}

	$: items = properties.filter(
		(item) =>
			(filteredProject
				? item.project && caseInsensitiveIncludes(item.project, filteredProject)
				: true) &&
			(filteredName
				? caseInsensitiveIncludes(item.name, filteredName) ||
					caseInsensitiveIncludes(item.id, filteredName)
				: true) &&
			(filteredMeasure
				? item.measure && caseInsensitiveIncludes(item.measure, filteredMeasure)
				: true) &&
			(filteredMetricName
				? item.metricName && caseInsensitiveIncludes(item.metricName, filteredMetricName)
				: true)
	);

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
			key: 'name',
			sortable: true
		},
		{
			name: 'measure',
			key: 'measure',
			sortable: true
		},
		{
			name: 'metricName',
			key: 'metricName',
			sortable: true
		}
	];

	$: filtered = !!filteredProject || !!filteredName || !!filteredMeasure || !!filteredMetricName;
</script>

<SortingTable hoverable componentLocKey="component.propertiesOverview" {items} {shownKeys}>
	<svelte:fragment slot="caption">
		<caption class="caption-top">
			<Accordion>
				<AccordionItem>
					<span slot="header">
						{$_(`component.propertiesOverview.filterHeader${filtered ? 'Filtered' : ''}`, {
							values: { number: properties.length, filteredNumber: items.length }
						})}
					</span>
					{#if $activeProjectId === 'all'}
						<div class="mt-2 flex w-full gap-2">
							<FloatingLabelInput
								classDiv="xs:w-full sm:w-1/2"
								style="outlined"
								bind:value={filteredProject}
							>
								{$_('component.propertiesOverview.projectFilterHeader')}
							</FloatingLabelInput>
						</div>
					{/if}
					<div class="mt-2 flex w-full gap-2">
						<FloatingLabelInput
							classDiv="xs:w-full sm:w-1/2"
							style="outlined"
							bind:value={filteredName}
						>
							{$_('component.propertiesOverview.nameFilterHeader')}
						</FloatingLabelInput>
					</div>
					<div class="mt-2 flex w-full gap-2">
						<FloatingLabelInput
							classDiv="xs:w-full sm:w-1/2"
							style="outlined"
							bind:value={filteredMeasure}
						>
							{$_('component.propertiesOverview.measureFilterHeader')}
						</FloatingLabelInput>
					</div>
					<div class="mt-2 flex w-full gap-2">
						<FloatingLabelInput
							classDiv="xs:w-full sm:w-1/2"
							style="outlined"
							bind:value={filteredMetricName}
						>
							{$_('component.propertiesOverview.metricNameFilterHeader')}
						</FloatingLabelInput>
					</div>
					<div class="mt-2 flex w-full justify-end gap-2">
						<Button on:click={() => resetFilters()}>
							{$_('component.propertiesOverview.resetFilters')}
						</Button>
					</div>
				</AccordionItem>
			</Accordion>
		</caption>
	</svelte:fragment>
	<svelte:fragment slot="bodyContent" let:item>
		<TableBodyRow
			class="cursor-pointer"
			on:click={async () => await goto(`property/${encodeURI(item.id)}`)}
		>
			{#if $activeProjectId === 'all'}
				<TableBodyCell>{item.project ?? '-'}</TableBodyCell>
			{/if}
			<TableBodyCell>
				<span>{item.name}</span>
				<Tooltip>{item.id}</Tooltip>
			</TableBodyCell>
			<TableBodyCell>{item.measure ?? '-'}</TableBodyCell>
			<TableBodyCell>{item.metricName ?? '-'}</TableBodyCell>
		</TableBodyRow>
	</svelte:fragment>
</SortingTable>
