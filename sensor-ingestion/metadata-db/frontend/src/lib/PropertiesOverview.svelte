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
	import { projectUrl } from './common/url';

	interface Props {
		properties: NonNullable<GetAllPropertiesQuery['properties']>;
	}

	let { properties }: Props = $props();

	let filteredProject: string = $state('');
	let filteredName: string = $state('');
	let filteredMeasure: string = $state('');
	let filteredMetricName: string = $state('');

	function resetFilters() {
		filteredProject = '';
		filteredName = '';
		filteredMeasure = '';
		filteredMetricName = '';
	}

	let items = $derived(
		properties.filter(
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
		)
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

	let filtered = $derived(
		!!filteredProject || !!filteredName || !!filteredMeasure || !!filteredMetricName
	);
</script>

<SortingTable hoverable componentLocKey="component.propertiesOverview" {items} {shownKeys}>
	{#snippet caption()}
		<caption class="caption-top">
			<Accordion>
				<AccordionItem>
					<span slot="header">
						{$_(`component.propertiesOverview.filterHeader${filtered ? 'Filtered' : ''}`, {
							values: { number: properties.length, filteredNumber: items.length }
						})}
					</span>
					<div class="flex flex-col gap-2 xl:flex-row">
						{#if $activeProjectId === 'all'}
							<FloatingLabelInput classDiv="grow" style="outlined" bind:value={filteredProject}>
								{$_('component.propertiesOverview.projectFilterHeader')}
							</FloatingLabelInput>
						{/if}
						<FloatingLabelInput classDiv="grow" style="outlined" bind:value={filteredName}>
							{$_('component.propertiesOverview.nameFilterHeader')}
						</FloatingLabelInput>
						<FloatingLabelInput classDiv="grow" style="outlined" bind:value={filteredMeasure}>
							{$_('component.propertiesOverview.measureFilterHeader')}
						</FloatingLabelInput>
						<FloatingLabelInput classDiv="grow" style="outlined" bind:value={filteredMetricName}>
							{$_('component.propertiesOverview.metricNameFilterHeader')}
						</FloatingLabelInput>
						<Button color="red" on:click={() => resetFilters()}>
							{$_('component.propertiesOverview.resetFilters')}
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
				await goto(projectUrl(item.project ?? 'all', 'property', encodeURI(item.id)))}
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
	{/snippet}
</SortingTable>
