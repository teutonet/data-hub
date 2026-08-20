<script lang="ts">
	import { Accordion, AccordionItem, Alert, Badge, Button, Card } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { type PermissionItem, type ResourceType } from '$lib/nav/fetchUtils';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import { page } from '$app/state';
	import {
		deleteGroupPermission,
		deleteProjectPermission,
		deleteTenantPermission,
		deleteVizGroupPermission
	} from '$lib/common/graphql/ressource-api-utils';
	import {
		getResourceApiClient,
		hasPermission,
		resourceTypeToScopeName
	} from '$lib/common/graphql/utils';
	import InfoIcon from '~icons/heroicons/information-circle';
	import type { GetScopesQuery } from '$lib/common/generated/types-resource-api';

	const gqlClient = getResourceApiClient();

	async function deletePermission(permission: string) {
		switch (resource.type) {
			case 'tenant':
				await deleteTenantPermission(gqlClient, resource.tenant, permission);
				break;
			case 'group':
				await deleteGroupPermission(gqlClient, resource.tenant, resource.resourceName, permission);
				break;
			case 'vizGroup':
				await deleteVizGroupPermission(
					gqlClient,
					resource.tenant,
					resource.resourceName,
					permission
				);
				break;
			case 'project':
				await deleteProjectPermission(
					gqlClient,
					resource.tenant,
					resource.resourceName,
					permission
				);
				break;
		}
		reload();
	}

	interface Props {
		tenantObject: GetScopesQuery['tenant'] | undefined;
		resource: ResourceType;
		permissions: PermissionItem[];
		reload: () => void;
	}

	let { tenantObject, resource, permissions, reload }: Props = $props();
	let hasAdminOnResource = $derived(
		hasPermission(
			tenantObject,
			`${resourceTypeToScopeName[resource.type]}:admin`,
			resourceTypeToScopeName[resource.type],
			resource.resourceName
		)
	);
</script>

<Card class="min-w-full">
	<Accordion flush>
		{#each permissions as permission (permission.name)}
			<AccordionItem>
				<span slot="header">{permission.name}</span>
				{@const groups = permission.principals
					.filter((p) => p.type == 'group')
					.map((principal) => principal.group)}
				{#if groups.length > 0}
					<div>{$_('component.permissions.groups')}</div>
					{#each permission.principals
						.filter((p) => p.type == 'group')
						.map((principal) => principal.group) as group (group)}
						<Badge>{group ?? $_('component.permissions.allGroups')}</Badge>
					{/each}
				{:else if permission.principals.some((p) => p.type == 'tenant')}
					<div>{$_('component.permissions.groups')}</div>
					<Badge>{$_('component.permissions.list.allGroups')}</Badge>
				{/if}

				{@const vizGroups = permission.principals
					.filter((p) => p.type == 'vizGroup')
					.map((principal) => principal.vizGroup)}
				{#if vizGroups.length > 0}
					<div>{$_('component.permissions.vizGroups')}</div>
					{#each vizGroups as vizGroup (vizGroup)}
						<Badge>{vizGroup}</Badge>
					{/each}
				{/if}

				<div>{$_('component.permissions.scopes')}</div>
				{#each permission.scopes as scope (scope)}
					<Badge>{scope}</Badge>
				{/each}
				<div class="mt-4">
					<DeleteButton
						buttonTitle={!hasAdminOnResource
							? $_('component.permissions.missingPermissions')
							: 'shared.action.delete'}
						buttonText="shared.action.delete"
						disabled={!hasAdminOnResource}
						modalTitle="component.permissions.list.deleteModal.title"
						modalBody="component.permissions.list.deleteModal.body"
						submitFunction={() => deletePermission(permission.name)}
					/>
					<Button
						onclick={() => goto(`${page.url.pathname}/permissions/${permission.name}`)}
						title={!hasAdminOnResource
							? $_('component.permissions.missingPermissions')
							: $_('shared.action.edit')}
						disabled={!hasAdminOnResource}>{$_('shared.action.edit')}</Button
					>
				</div>
			</AccordionItem>
		{:else}
			<Alert color="blue" class="mb-2 inline-flex w-full gap-2">
				<InfoIcon class="h-5 w-5" />
				<p>{$_('component.permissions.list.noExistingPermissions')}</p>
			</Alert>
		{/each}
	</Accordion>
	{#if resource.type}
		<Button
			title={!hasAdminOnResource
				? $_('component.permissions.missingPermissions')
				: $_('component.permissions.create')}
			disabled={!hasAdminOnResource}
			class="mt-2 cursor-copy"
			href={window.location.pathname + '/permissions/new'}
			color="green"
		>
			{$_('component.permissions.create')}
		</Button>
	{/if}
</Card>
