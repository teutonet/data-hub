<script lang="ts">
	import { FloatingLabelInput, Helper, type InputType } from 'flowbite-svelte';
	import { onMount } from 'svelte';
	import FloatingLabelNumberInput from '$lib/flowbite-extensions/FloatingLabelNumberInput.svelte';
	import { twMerge } from 'tailwind-merge';
	import { _ } from 'svelte-i18n';
	import FloatingLabelTextArea from '$lib/flowbite-extensions/FloatingLabelTextArea.svelte';
	import type { FullAutoFill } from 'svelte/elements';

	interface Props {
		patternMismatchText?: string | null;
		valueMissingText?: string | null;
		style?: 'filled' | 'outlined' | 'standard';
		inputType?: InputType | 'textarea' | undefined;
		value: any;
		inputLabel: string;
		inputId: string;
		disabled?: boolean;
		required?: boolean;
		autocomplete?: FullAutoFill | undefined | null;
		pattern?: string | null;
		name?: string;
		outerDivClasses?: string | null;
		innerDivClasses?: string | null;
		helperText?: string | null;
		customErrorText?: string | null;
		inputClass?: string | null;
		labelClass?: string | null;
		lengthWarning?: boolean;
		[key: string]: any;
	}

	let {
		patternMismatchText = null,
		valueMissingText = null,
		style = 'outlined',
		inputType = 'text',
		value = $bindable(),
		inputLabel,
		inputId,
		disabled = false,
		required = false,
		autocomplete = null,
		pattern = null,
		name = '',
		outerDivClasses = null,
		innerDivClasses = null,
		helperText = null,
		customErrorText = null,
		inputClass = null,
		labelClass = null,
		lengthWarning = true,
		...rest
	}: Props = $props();

	let classInput = $derived(
		twMerge(
			'peer disabled:bg-gray-100 disabled:dark:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed bg-opacity-100 dark:bg-opacity-100 bg-white disabled:bg-gray-100 disabled:dark:bg-slate-800 dark:bg-slate-900',
			inputClass
		)
	);
	let classLabel = $derived(
		twMerge('peer-disabled:dark:bg-slate-800 peer-disabled:bg-gray-100 rounded-full', labelClass)
	);
	let inputContainer: HTMLDivElement | undefined = $state();

	let message: undefined | string = $state(undefined);

	let invalid = $state(false);

	let valueNearMax = $derived(
		value && rest?.maxlength && value.length && rest.maxlength - value.length <= 10
	);
	onMount(() => {
		(['input', 'select', 'textarea'] as const)
			.map((name) => Array.from(inputContainer?.getElementsByTagName(name) ?? []))
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
			labelText={inputLabel}
			id={inputId}
			{disabled}
			{required}
			{autocomplete}
			{name}
			color={invalid ? 'red' : 'base'}
			{classInput}
			classDiv={innerDivClasses}
			{...rest}
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
			{...rest}
			{classLabel}
			color={invalid ? 'red' : 'base'}
		/>
	{:else}
		<FloatingLabelInput
			{style}
			type={inputType}
			bind:value
			id={inputId}
			{disabled}
			{required}
			{autocomplete}
			{pattern}
			{name}
			color={invalid ? 'red' : 'base'}
			{classInput}
			classDiv={innerDivClasses ?? undefined}
			{classLabel}
			{...rest}
		>
			{inputLabel}
		</FloatingLabelInput>
	{/if}

	{#if invalid}
		<Helper class="invalid-feedback mt-2 ml-2" color="red">
			{message}
		</Helper>
	{:else if customErrorText}
		<Helper class="invalid-feedback mt-2 ml-2" color="red">
			{customErrorText}
		</Helper>
	{:else if valueNearMax && lengthWarning}
		<Helper
			class="helpertext peer-focus:text-primary-600 peer-focus:dark:text-primary-500 mt-2 ml-2 text-gray-500 dark:text-gray-400"
		>
			{$_('shared.maxLength', {
				values: { value: rest.maxlength - value.length }
			})}
		</Helper>
	{:else if helperText}
		<Helper
			class="helpertext peer-focus:text-primary-600 peer-focus:dark:text-primary-500 mt-2 ml-2 text-gray-500 dark:text-gray-400"
			color="gray"
		>
			{helperText}
		</Helper>
	{/if}
</div>
