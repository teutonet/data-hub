<script lang="ts">
	import { Select, Label, Helper, type SelectOptionType } from 'flowbite-svelte';
	import { twMerge } from 'tailwind-merge';

	export let id: string | undefined;
	export let name: string;
	export let disabled = false;
	export let items: SelectOptionType<any>[] = [];
	export let value;
	export let labelText: string;
	export let placeholder = '';
	export let required = false;
	export let ariaLabel = '';
	export let helperText = '';

	const defaultLabelClass =
		'absolute transform -translate-y-4 transform top-2 z-10 origin-[0] px-2 px-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 text-gray-500 peer-disabled:dark:text-slate-400 dark:text-slate-400 bg-white dark:bg-gray-900 peer-disabled:!bg-gray-100 peer-disabled:dark:!bg-slate-800 scale-75 left-1 rounded-full';
	const defaultInputClass =
		'peer py-3 bg-transparent h-[3rem] disabled:!bg-gray-100 disabled:dark:!bg-slate-800 disabled:text-gray-500 disabled:dark:text-slate-400 disabled:cursor-not-allowed dark:bg-slate-900 dark:bg-slate-900';
</script>

<div class={twMerge('relative', $$props.classDiv)}>
	<Select
		{id}
		{name}
		{disabled}
		class={twMerge(defaultInputClass, $$props.classInput)}
		bind:value
		{placeholder}
		{required}
		{ariaLabel}
		{items}
		on:change
	/>
	<Label class={twMerge(defaultLabelClass, $$props.classLabel)} for={id}>
		{labelText}
	</Label>

	{#if helperText}
		<Helper
			class="helpertext peer-focus:text-primary-600 peer-focus:dark:text-primary-500 ml-2 mt-2 text-gray-500 dark:text-gray-400"
			color="gray"
		>
			{helperText}
		</Helper>
	{/if}
</div>
