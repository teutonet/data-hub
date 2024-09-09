<script lang="ts">
	import { FloatingLabelInput, Helper, type InputType } from 'flowbite-svelte';
	import { onMount } from 'svelte';
	import FloatingLabelNumberInput from '$lib/flowbite-extensions/FloatingLabelNumberInput.svelte';
	import { twMerge } from 'tailwind-merge';
	import { _ } from 'svelte-i18n';
	import FloatingLabelTextArea from '$lib/flowbite-extensions/FloatingLabelTextArea.svelte';

	export let patternMismatchText: string | null = null;
	export let valueMissingText: string | null = null;

	export let style: 'filled' | 'outlined' | 'standard' = 'outlined';
	export let inputType: InputType | 'textarea' | undefined = 'text';
	export let value;
	export let inputLabel: string;
	export let inputId: string;
	export let disabled = false;
	export let required = false;
	export let autocomplete: string | null = null;
	export let pattern: string | null = null;
	export let name = '';
	export let outerDivClasses: string | null = null;
	export let innerDivClasses: string | null = null;
	export let helperText: string | null = null;
	export let customErrorText: string | null = null;
	export let inputClass: string | null = null;
	export let labelClass: string | null = null;
	export let lengthWarning: boolean = true;

	$: classInput = twMerge(
		'peer disabled:bg-gray-100 disabled:dark:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed bg-opacity-100 dark:bg-opacity-100 bg-white disabled:bg-gray-100 disabled:dark:bg-slate-800 dark:bg-slate-900',
		inputClass
	);
	$: classLabel = twMerge(
		'peer-disabled:dark:bg-slate-800 peer-disabled:bg-gray-100 rounded-full',
		labelClass
	);
	let inputContainer: HTMLDivElement;

	let message: undefined | string = undefined;

	let invalid = false;

	$: valueNearMax =
		value && $$restProps?.maxlength && value.length && $$restProps.maxlength - value.length <= 10;
	onMount(() => {
		(['input', 'select', 'textarea'] as const)
			.map((name) => Array.from(inputContainer.getElementsByTagName(name)))
			.flat()
			.forEach((element) =>
				['invalid', 'input', 'textarea'].forEach((event) =>
					element.addEventListener(event, (e: Event) => {
						const eventTarget = e.target as HTMLInputElement | HTMLTextAreaElement;
						const validityState = eventTarget.validity;
						if (!validityState.valid) {
							invalid = true;
						} else {
							invalid = false;
						}

						if (patternMismatchText && validityState.patternMismatch) {
							message = $_(patternMismatchText);
						} else if (valueMissingText && validityState.valueMissing) {
							message = $_(valueMissingText);
						} else {
							message = element.validationMessage;
						}
					})
				)
			);
	});
</script>

<div bind:this={inputContainer} class={twMerge(outerDivClasses)}>
	{#if inputType === 'number'}
		<FloatingLabelNumberInput
			{style}
			bind:value
			label={inputLabel}
			id={inputId}
			{disabled}
			{required}
			{autocomplete}
			{name}
			color={invalid ? 'red' : 'base'}
			{classInput}
			classDiv={innerDivClasses}
			{...$$restProps}
		/>
	{:else if inputType === 'textarea'}
		<FloatingLabelTextArea
			{style}
			bind:value
			label={inputLabel}
			id={inputId}
			{disabled}
			{required}
			{autocomplete}
			{name}
			{classInput}
			classDiv={innerDivClasses}
			{...$$restProps}
			{classLabel}
			color={invalid ? 'red' : 'base'}
		/>
	{:else}
		<FloatingLabelInput
			{style}
			type={inputType}
			bind:value
			label={inputLabel}
			id={inputId}
			{disabled}
			{required}
			{autocomplete}
			{pattern}
			{name}
			color={invalid ? 'red' : 'base'}
			{classInput}
			classDiv={innerDivClasses}
			{classLabel}
			{...$$restProps}
		>
			{inputLabel}
		</FloatingLabelInput>
	{/if}

	{#if invalid}
		<Helper class="invalid-feedback ml-2 mt-2" color="red">
			{message}
		</Helper>
	{:else if customErrorText}
		<Helper class="invalid-feedback ml-2 mt-2" color="red">
			{customErrorText}
		</Helper>
	{:else if valueNearMax && lengthWarning}
		<Helper
			class="helpertext peer-focus:text-primary-600 peer-focus:dark:text-primary-500 ml-2 mt-2 text-gray-500 dark:text-gray-400"
		>
			{$_('shared.maxLength', {
				values: { value: $$restProps.maxlength - value.length }
			})}
		</Helper>
	{:else if helperText}
		<Helper
			class="helpertext peer-focus:text-primary-600 peer-focus:dark:text-primary-500 ml-2 mt-2 text-gray-500 dark:text-gray-400"
			color="gray"
		>
			{helperText}
		</Helper>
	{/if}
</div>
