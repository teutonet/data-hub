<script lang="ts">
	import { Label, Textarea } from 'flowbite-svelte';
	import type { Snippet } from 'svelte';
	import { twMerge } from 'tailwind-merge';
	import type { FullAutoFill } from 'svelte/elements';

	function generateId(): string {
		let n = Date.now();
		return (++n).toString(36);
	}

	interface Props {
		id?: string;
		style?: 'standard' | 'filled' | 'outlined';
		size?: 'small' | 'default';
		color?: 'base' | 'green' | 'red';
		value?: string | (string[] & string);
		label?: string;
		disabled?: boolean;
		required?: boolean;
		autocomplete?: FullAutoFill | null;
		name?: string;
		classDiv?: string | null;
		classInput?: string;
		classLabel?: string;
		placeholder?: string;
		rows?: number;
		header?: Snippet;
		footer?: Snippet;
	}

	let {
		id = generateId(),
		style = 'standard',
		size = 'default',
		color = 'base',
		value = $bindable(),
		label = '',
		disabled = false,
		required = false,
		autocomplete = undefined,
		name = undefined,
		classDiv = undefined,
		classInput = undefined,
		classLabel = undefined,
		placeholder = undefined,
		header = undefined,
		footer = undefined,
		rows,
		...others
	}: Props = $props();

	const divClasses = {
		filled: 'relative',
		outlined: 'relative',
		standard: 'relative z-0'
	};

	const inputSizes = {
		filled: {
			small: 'px-2.5 pb-1.5 pt-4',
			default: 'px-2.5 pb-2.5 pt-5'
		},
		outlined: {
			small: 'px-2.5 pb-1.5 pt-3',
			default: 'px-2.5 pb-2.5 pt-4'
		},
		standard: {
			small: 'py-2 px-0',
			default: 'py-2.5 px-0'
		}
	};

	const labelSizes = {
		filled: {
			small: 'top-3',
			default: 'top-4'
		},
		outlined: {
			small: 'top-1',
			default: 'top-2'
		},
		standard: {
			small: 'top-3',
			default: 'top-3'
		}
	};

	const inputClasses = {
		filled:
			'block rounded-t-lg w-full text-sm text-gray-900 bg-gray-50 dark:bg-gray-700 border-0 border-b-2 appearance-none [-moz-appearance:textfield;] dark:text-white focus:outline-hidden focus:ring-0 peer',
		outlined:
			'block w-full text-sm text-gray-900 bg-transparent rounded-lg border-1 appearance-none [-moz-appearance:textfield;] dark:text-white  focus:outline-hidden focus:ring-0 peer',
		standard:
			'block w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 appearance-none [-moz-appearance:textfield;] dark:text-white  focus:outline-hidden focus:ring-0 peer'
	};

	const labelClasses = {
		filled:
			'absolute text-sm duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-2.5  peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4',
		outlined:
			'absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-gray-900 px-2 peer-focus:px-2  peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1 peer-focus:dark:bg-slate-900 dark:bg-transparent peer-disabled:bg-gray-100 peer-disabled:dark:bg-slate-800',
		standard:
			'absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0  peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6'
	};

	const inputColorClasses = {
		base: 'border-gray-300 dark:border-gray-600 dark:focus:border-primary-500 focus:border-primary-600 dark:text-slate-100 dark:bg-slate-900',
		green:
			'border-green-600 dark:border-green-500 dark:focus:border-green-500 focus:border-green-600',
		red: 'border-red-600 dark:border-red-500 dark:focus:border-red-500  focus:border-red-600'
	};

	const labelColorClasses = {
		base: 'text-gray-500 dark:text-gray-400 peer-focus:text-primary-600 peer-focus:dark:text-primary-500 rounded-xl dark:bg-slate-900',
		green: 'text-green-600 dark:text-green-500 dark:bg-slate-800 rounded-xl',
		red: 'text-red-600 dark:text-red-500 dark:bg-slate-800 rounded-xl'
	};
</script>

<div class={twMerge(divClasses[style], classDiv)}>
	<Label
		for={id}
		class={twMerge(
			labelClasses[style],
			labelColorClasses[color],
			labelSizes[style][size],
			classLabel
		)}
	>
		{label}
	</Label>
	<Textarea
		{id}
		{name}
		{disabled}
		{required}
		{autocomplete}
		{placeholder}
		{rows}
		{...others}
		bind:value
		class={twMerge(
			inputClasses[style],
			inputColorClasses[color],
			inputSizes[style][size],
			classInput
		)}
	>
		{#if header}
			{@render header()}
		{/if}
		{#if footer}
			{@render footer()}
		{/if}
	</Textarea>
</div>
