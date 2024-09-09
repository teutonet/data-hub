<script lang="ts">
	import { Badge, Button, Card, Heading, P } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import type { PermissionItem } from './types';
	import { goto } from '$app/navigation';
	import { deleteResource } from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';

	export let tenant: string;
	export let project: string | null;

	export let permissions: PermissionItem[];

	async function deletePermission(permission: string) {
		await deleteResource(
			`data-hub/tenants/${tenant}/${project ? `projects/${project}/` : ''}permissions/${permission}`,
			$accessToken
		).then(() => {
			reload();
		});
	}

	export let reload: () => void;
</script>

{#each permissions as permission}
	<div class="mb-2 flex flex-row gap-2">
		<Card class="max-w-[100vw]" on:click={() => goto(`permissions/${permission.name}`)}>
			<Heading tag="h3">{permission.name}</Heading>
			{$_('component.permissions.groups')}
			{#each permission.principals.map( (principal) => (principal.type == 'tenant' ? null : principal.group) ) as group}
				<Badge>{group}</Badge>
			{/each}
			{$_('component.permissions.scopes')}
			{#each permission.scopes as scope}
				<Badge>{scope}</Badge>
			{/each}
		</Card>
		<DeleteButton
			modalTitle="component.permissions.list.deleteModal.title"
			modalBody="component.permissions.list.deleteModal.body"
			buttonTitle="shared.action.delete"
			submitFunction={() => deletePermission(permission.name)}
		/>
	</div>
{:else}
	<P>
		{$_('component.permissions.list.noExistingPermissions')}
	</P>
{/each}

<Button on:click={() => goto('permissions/new')} color="green"
	>{$_('component.permissions.create')}</Button
>
