<script lang="ts">
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import type { GetPropertyByIdQuery, PropertyInput } from '$lib/common/generated/types';
	import { _ } from 'svelte-i18n';
	import { Button } from 'flowbite-svelte';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import { Tooltip } from 'flowbite-svelte';

	interface Props {
		id: string;
		create?: boolean;
		property: NonNullable<GetPropertyByIdQuery['property']> | PropertyInput;
		submitFunction: () => Promise<void>;
		deleteFunction?: (() => Promise<void>) | undefined;
	}

	let {
		id,
		create = false,
		property = $bindable(),
		submitFunction,
		deleteFunction = undefined
	}: Props = $props();

	async function handleFormSubmit(event: Event) {
		event.preventDefault();
		const formElement = event.target as HTMLFormElement;
		if (!formElement.checkValidity()) {
			formElement.classList.add('was-validated');
		} else {
			formElement.classList.remove('was-validated');
			await submitFunction();
		}
	}

	let isPropertyProjectNull = $derived(property.project == null);
</script>

<form class="needs-validation" onsubmit={handleFormSubmit} novalidate {id}>
	<div class="grid grid-cols-1 gap-4 pb-4">
		<ValidatedFormField
			bind:value={property.name}
			required
			inputLabel={$_('component.propertyEdit.name')}
			inputId="property-name"
		/>
		<ValidatedFormField
			bind:value={property.measure}
			inputLabel={$_('component.propertyEdit.measure')}
			inputId="property-measure"
		/>
		<ValidatedFormField
			bind:value={property.description}
			inputLabel={$_('component.propertyEdit.description')}
			inputType="textarea"
			inputId="property-description"
		/>
		<ValidatedFormField
			bind:value={property.metricName}
			inputLabel={$_('component.propertyEdit.metricName')}
			inputId="property-metricname"
			pattern="^(?![Tt][Ee][Cc][Hh][Nn][Ii][Cc][Aa][Ll]_).*"
			patternMismatchText={$_('component.propertyEdit.technicalPrefixNotAllowed')}
		/>
	</div>
	<div class="flex flex-row gap-4">
		<Button type="submit" color="green" disabled={isPropertyProjectNull}>
			{$_('shared.action.save')}
		</Button>
		{#if isPropertyProjectNull}
			<Tooltip>{$_('component.propertyEdit.editGlobalToolTip')}</Tooltip>
		{/if}
		{#if !create && !!deleteFunction}
			<DeleteButton
				modalTitle="component.propertyEdit.deleteModal.title"
				modalBody="component.propertyEdit.deleteModal.body"
				buttonTitle="shared.action.delete"
				submitFunction={deleteFunction}
				disabled={isPropertyProjectNull}
			/>
			{#if isPropertyProjectNull}
				<Tooltip>{$_('component.propertyEdit.deleteGlobalToolTip')}</Tooltip>
			{/if}
		{/if}
	</div>
</form>
