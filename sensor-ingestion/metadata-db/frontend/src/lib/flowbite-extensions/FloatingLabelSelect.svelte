<script lang="ts">
	import { Select, Label, Helper, type SelectOptionType } from 'flowbite-svelte';
	import { twMerge } from 'tailwind-merge';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props {
		items?: SelectOptionType<any>[];
		labelText: string;
		helperText?: string;
		classDiv?: string;
		classInput?: string;
		classLabel?: string;
		placeholder?: string;
		style?: 'standard' | 'filled' | 'outlined';
		color?: 'base' | 'green' | 'red';
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		items = [],
		value = $bindable(),
		labelText,
		helperText = '',
		color = 'base',
		style = 'standard',
		classDiv = undefined,
		classInput = undefined,
		classLabel = undefined,
		...others
	}: Props & Omit<HTMLSelectAttributes, 'placeholder'> = $props();

	const defaultLabelClass =
		'absolute transform -translate-y-4 transform top-2 z-10 origin-[0] px-2 px-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 text-gray-500 peer-disabled:dark:text-slate-400 dark:text-slate-400 bg-white dark:bg-gray-900 peer-disabled:!bg-gray-100 peer-disabled:dark:!bg-slate-800 scale-75 left-1 rounded-full';
	const defaultInputClass =
		'peer py-3 bg-transparent h-[3rem] disabled:!bg-gray-100 disabled:dark:!bg-slate-800 disabled:text-gray-500 disabled:dark:text-slate-400 disabled:cursor-not-allowed dark:bg-slate-900 dark:bg-slate-900';

	const inputColorClasses = {
		base: 'border-gray-300 dark:border-gray-600 dark:focus:border-primary-500 focus:border-primary-600 dark:text-slate-100 dark:bg-slate-900',
		green:
			'border-green-600 dark:border-green-500 dark:focus:border-green-500 focus:border-green-600',
		red: 'border-red-600 dark:border-red-500 dark:focus:border-red-500  focus:border-red-600'
	};

	const labelColorClasses = {
		base: 'contrast-100 grayscale-0 text-gray-500 dark:text-gray-400 peer-focus:text-primary-600 peer-focus:dark:text-primary-500 rounded-xl dark:bg-slate-900',
		green: 'text-green-600 dark:text-green-500 dark:bg-slate-800 rounded-xl',
		red: 'text-red-600 dark:text-red-500 dark:bg-slate-800 rounded-xl'
	};
</script>

<div class={twMerge('relative', classDiv)}>
	<Select
		{style}
		class={twMerge(defaultInputClass, inputColorClasses[color], classInput)}
		bind:value
		{items}
		{...others}
	/>
	<Label
		class={twMerge(defaultLabelClass, labelColorClasses[color], classLabel)}
		for={others.id ?? undefined}
	>
		{labelText}
	</Label>

	{#if helperText}
		<Helper
			class="helpertext peer-focus:text-primary-600 peer-focus:dark:text-primary-500 mt-2 ml-2 text-gray-500 dark:text-gray-400"
			color="gray"
		>
			{helperText}
		</Helper>
	{/if}
</div>
