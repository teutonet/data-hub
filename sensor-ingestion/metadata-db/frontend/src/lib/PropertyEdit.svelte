<script lang="ts">
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import type { GetPropertyByIdQuery, PropertyInput } from '$lib/common/generated/types';
	import { _ } from 'svelte-i18n';
	import FloatingLabelSelect from '$lib/flowbite-extensions/FloatingLabelSelect.svelte';
	import { Button } from 'flowbite-svelte';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';

	export let id: string;
	export let create = false;
	export let property: NonNullable<GetPropertyByIdQuery['property']> | PropertyInput;
	export let submitFunction: () => Promise<void>;
	export let deleteFunction: (() => Promise<void>) | undefined = undefined;
	export let projects:
		| {
				value: string;
				name: string;
		  }[]
		| undefined = undefined;
	export let projectId: string | undefined = undefined;

	async function handleFormSubmit(event: Event) {
		const formElement = event.target as HTMLFormElement;
		if (!formElement.checkValidity()) {
			formElement.classList.add('was-validated');
		} else {
			formElement.classList.remove('was-validated');
			await submitFunction();
		}
	}
</script>

<form class="needs-validation" on:submit|preventDefault={handleFormSubmit} novalidate {id}>
	<div class="grid grid-cols-1 gap-4 pb-4">
		{#if projects && (!projectId || (create && projectId === 'all'))}
			<FloatingLabelSelect
				bind:value={property.project}
				items={projects}
				id="project-select"
				name="project-select"
				labelText={$_('component.propertyEdit.project')}
				required
				disabled={!create}
			/>
		{/if}
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
		/>
	</div>
	<div class="flex flex-row gap-4">
		<Button type="submit" color="green">
			{$_('shared.action.save')}
		</Button>
		{#if !create && !!deleteFunction}
			<DeleteButton
				modalTitle="component.propertyEdit.deleteModal.title"
				modalBody="component.propertyEdit.deleteModal.body"
				buttonTitle="shared.action.delete"
				submitFunction={deleteFunction}
			/>
		{/if}
	</div>
</form>
