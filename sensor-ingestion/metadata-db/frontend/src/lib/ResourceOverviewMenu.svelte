<script lang="ts">
	import { Card, Button } from 'flowbite-svelte';
	import ValidatedFormField from './ValidatedFormField.svelte';
	import { _ } from 'svelte-i18n';
	import type { ResourceType } from './nav/fetchUtils';
	import { hasPermission, resourceTypeToScopeName } from './common/graphql/utils';
	import type { GetScopesQuery } from './common/generated/types-resource-api';
	interface Props {
		tenantObject: GetScopesQuery['tenant'] | undefined;
		displayNameModalOpen: boolean;
		resource: ResourceType;
	}
	// eslint-disable-next-line no-useless-assignment
	let { displayNameModalOpen = $bindable(), resource, tenantObject }: Props = $props();
	let hasAdminOnResource = $derived(
		hasPermission(
			tenantObject,
			`${resourceTypeToScopeName[resource.type]}:admin`,
			resourceTypeToScopeName[resource.type],
			resource.resourceName
		)
	);
</script>

<Card class="min-w-full gap-4">
	<ValidatedFormField
		inputLabel={$_('component.displayNameModal.displayName')}
		inputId={$_('component.displayNameModal.displayName')}
		value={resource.displayName ? resource.displayName : '-'}
		disabled
	/>
	<ValidatedFormField
		inputLabel={$_('component.displayNameModal.resourceName')}
		inputId={$_('component.displayNameModal.resourceName')}
		value={resource.resourceName}
		disabled
	/>
	{#if resource.type === 'vizGroup'}
		<ValidatedFormField
			inputLabel={$_('page.viz-groupsList.grafanaOrgName')}
			inputId={$_('page.viz-groupsList.grafanaOrgName')}
			value={`${resource.tenant}:${resource.resourceName}`}
			disabled
		/>
	{/if}

	{#if resource.type === 'project'}
		<ValidatedFormField
			inputLabel={$_('page.projectsList.bucketName')}
			inputId={$_('page.projectList.bucketName')}
			value={`${resource.tenant}.${resource.resourceName}`}
			disabled
		/>
	{/if}
	<Button
		class="w-fit"
		onclick={() => (displayNameModalOpen = true)}
		title={!hasAdminOnResource
			? $_('component.permissions.missingPermissions')
			: $_('component.displayNameModal.title')}
		disabled={!hasAdminOnResource}
	>
		{$_('component.displayNameModal.title')}
	</Button>
</Card>
