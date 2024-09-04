<!--
  @component
  A wrapper component for a table that enables sorting by clicking on the table's header cells, pagination and filtering with a caption slot.

  ## Props
  ### Functionality
  @prop items (`T[]`): Array of objects of type T to feed into the table
  @prop shownKeys (`TableHeadItem[]`): Array of `TableHeadItem` objects that defines which cells show up in the table head and with which names and keys and styles.
  @prop componentLocKey (`string`): Localization string prefix for the component being implemented. I.e. `"component.importantChanges"` for the important changes list. If `shownKeys` contains an item with the `name` `"custName"`, the i18n identifier for that header cell will be `"component.importantChanges.custName"`.
  @prop itemCompareFunction (optional - `(a: T, b: T) => number`): Optional function used while sorting *after* the array of items has been sorted by the selected key.
  @prop sortDirection (`1 | -1`): Helper for `itemCompareFunction` in case you want to take sort direction into consideration
  @prop paginationParams (optional - `PaginationOptions`): If set, shows pagination buttons. Contains `first` and `offset` properties analogous to PostGraphile pagination.
  ### Styling
  @prop headClass (`string`): Class string for the table head
  @prop tableClass (`string`): Class string for the table element
  @prop divClass (`string`): Class string for the wrapper div
  @prop hoverable (`boolean`): Whether or not the table rows are highlighted when hovering over them
  @prop striped (`boolean`): Whether or not to highlight every other row
  @prop noborder (`boolean`): Disables the table's borders if set
  @prop shadow (`boolean`): Whether or not the table has a shadow
  @prop color (`TableColorType | undefined`): The table's color. Default is grey.
  @prop customeColor (`string | undefined`): Custom colors for the table, use with `color` set to `custom`
  
  More docs for the table component contained here can be found [here](https://flowbite-svelte.com/docs/components/table) 
-->
<script lang="ts" generics="T extends Object">
	import { Table, TableHead, TableHeadCell, TableBody, ButtonGroup, Button } from 'flowbite-svelte';
	import type { PaginationOptions, TableHeadItem } from './sortingTableUtils';
	import { _ } from 'svelte-i18n';
	import ChevronUpIcon from '~icons/heroicons/chevron-up';
	import ChevronDownIcon from '~icons/heroicons/chevron-down';
	import ChevronUpDown from '~icons/heroicons/chevron-up-down';

	// eslint-disable-next-line no-undef
	export let items: T[];
	export let shownKeys: TableHeadItem[];
	export let componentLocKey: string;
	// eslint-disable-next-line no-undef
	export let itemCompareFunction: ((a: T, b: T) => number) | undefined = undefined;

	export let sortKey: string | null = null;
	export let sortDirection: 1 | -1 = 1;
	// eslint-disable-next-line no-undef
	let sortedItems: T[] = items;
	export let headClass: string | undefined = undefined;
	export let tableClass: string | undefined = undefined;
	export let tableDivClass: string | undefined = undefined;
	export let paginationParams: PaginationOptions | undefined = undefined;
	export let useTableBody = true;
	export let usePgPagination = false;

	export let hoverable: boolean = false;
	export let striped: boolean = false;
	export let noborder: boolean = false;
	export let shadow: boolean = false;
	export let color:
		| 'blue'
		| 'green'
		| 'red'
		| 'yellow'
		| 'purple'
		| 'pink'
		| 'indigo'
		| 'custom'
		| 'default'
		| undefined = undefined;
	export let customeColor: string | undefined = undefined;

	function setSorting(key: string | null) {
		if (sortKey === key) {
			sortDirection = sortDirection === 1 ? -1 : 1;
		} else {
			sortKey = key;
			sortDirection = 1;
		}
	}

	function sortItems(
		// eslint-disable-next-line no-undef
		items: T[],
		sortKey: string | null,
		sortDirection: 1 | -1
		// eslint-disable-next-line no-undef
	): T[] {
		if (sortKey == null || items.length === 0 || !Object.keys(items[0]).includes(sortKey)) {
			return items;
		}

		return items.sort((a, b) => {
			if (sortKey == null) {
				return sortDirection;
			}
			const aVal = a[sortKey];
			const bVal = b[sortKey];
			let value =
				(aVal ?? '').toString().localeCompare((bVal ?? '').toString(), ['en', 'de'], {
					sensitivity: 'base'
				}) * sortDirection;

			return itemCompareFunction ? value || itemCompareFunction(a, b) : value;
		});
	}

	const previous = () => {
		if (paginationParams) {
			if (paginationParams.offset > 0) {
				paginationParams.offset = Math.max(0, paginationParams.offset - paginationParams.first);
			}
		}
	};

	$: hasPrevious = paginationParams && paginationParams.offset > 0;
	$: hasNext =
		paginationParams && items.at(paginationParams.offset + paginationParams.first) !== undefined;

	const next = () => {
		if (paginationParams) {
			let nextFirst = paginationParams.offset + paginationParams.first;
			if (items.at(nextFirst) !== undefined) {
				paginationParams.offset = nextFirst;
			}
		}
	};

	$: sortedItems = sortItems(items, sortKey, sortDirection);

	// eslint-disable-next-line no-undef
	let finalItems: T[];
	$: finalItems = usePgPagination
		? sortedItems
		: paginationParams
			? sortedItems.slice(paginationParams.offset, paginationParams.offset + paginationParams.first)
			: sortedItems;
</script>

<Table
	{hoverable}
	{striped}
	{noborder}
	{shadow}
	{color}
	{customeColor}
	class={tableClass}
	divClass={tableDivClass}
>
	{#if $$slots.caption}
		<slot name="caption" />
	{/if}
	<TableHead theadClass={headClass}>
		{#each shownKeys as { name, key, sortable, cellClasses }}
			<TableHeadCell
				on:click={() => {
					if (sortable) {
						setSorting(key);
					}
				}}
				class={!!cellClasses && cellClasses}
			>
				{#if name}
					<span class="flex">
						{$_(`${componentLocKey}.${name}`)}
						{#if sortable}
							{#if sortKey && sortKey === key}
								{#if sortDirection === 1}
									<ChevronUpIcon />
								{:else}
									<ChevronDownIcon />
								{/if}
							{:else}
								<ChevronUpDown />
							{/if}
						{/if}
					</span>
				{/if}
			</TableHeadCell>
		{/each}
	</TableHead>
	{#if finalItems.length}
		{#if useTableBody}
			<TableBody>
				{#each finalItems as item, index}
					<slot name="bodyContent" {item} {index} />
				{/each}
			</TableBody>
		{:else}
			{#each finalItems as item, index}
				<slot name="bodyContent" {item} {index} />
			{/each}
		{/if}
	{:else if $$slots.defaultContent}
		<slot name="defaultContent" />
	{/if}
	{#if $$slots.footer}
		<slot name="footer" />
	{/if}
</Table>
{#if paginationParams}
	<div class="mt-2 flex justify-center">
		<ButtonGroup>
			<Button disabled={!hasPrevious} on:click={previous}>
				{$_('shared.previous')}
			</Button>
			<Button disabled={!hasNext} on:click={next}>
				{$_('shared.next')}
			</Button>
		</ButtonGroup>
	</div>
{/if}
