<script lang="ts">
	import { Button, Helper, Modal } from 'flowbite-svelte';
	import ValidatedFormField from './ValidatedFormField.svelte';
	import { type ResourceType } from './nav/fetchUtils';
	import { getResourceApiClient } from './common/graphql/utils';
	import { _ } from 'svelte-i18n';
	import { setResourceDisplayName } from './common/graphql/ressource-api-utils';

	interface Props {
		isOpen: boolean;
		resource: ResourceType;
	}

	let { isOpen = $bindable(), resource = $bindable() }: Props = $props();

	let gqlClient = getResourceApiClient();

	let newDisplayName = $derived(resource.displayName);

	async function onsubmit() {
		await setResourceDisplayName(gqlClient, resource, newDisplayName).then(() => {
			location.reload();
		});
	}
</script>

<Modal title={$_('component.displayNameModal.title')} outsideclose bind:open={isOpen}>
	<form {onsubmit}>
		<ValidatedFormField
			outerDivClasses="mb-1"
			bind:value={newDisplayName}
			inputLabel={$_('component.displayNameModal.newDisplayName')}
			inputId={$_('component.displayNameModal.newDisplayName')}
			pattern="[\S]+[\S\s]*[\S]*"
			required
		/>
		<Helper class="mb-3 ml-1">
			{$_('component.displayNameModal.description')}
		</Helper>
		<Button type="submit" color="green">
			{$_('shared.action.save')}
		</Button>
	</form>
</Modal>
