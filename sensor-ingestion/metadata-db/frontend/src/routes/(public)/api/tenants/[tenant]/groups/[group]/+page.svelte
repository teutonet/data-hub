<script lang="ts">
	import { Tabs, TabItem, Spinner, Card, Tooltip } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { _ } from 'svelte-i18n';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import { fetchPermissions, type ResourceType } from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import PermissionList from '$lib/permissions/PermissionList.svelte';
	import { refreshAccessToken } from '$lib/common/auth/Auth.svelte';
	import PageTitle from '$lib/PageTitle.svelte';
	import { getResourceApiClient, hasPermission } from '$lib/common/graphql/utils';
	import { GET_SCOPES } from '$lib/common/graphql/queries-resource-api';
	import {
		type GetGroupDisplayNameQuery,
		type GetGroupDisplayNameQueryVariables,
		type GetScopesQuery,
		type GetScopesQueryVariables
	} from '$lib/common/generated/types-resource-api';
	import { deleteGroup } from '$lib/common/graphql/ressource-api-utils';
	import DisplayNameModal from '$lib/DisplayNameModal.svelte';
	import { Client as GraphQLClient, queryStore } from '@urql/svelte';
	import { GET_GROUP_DISPLAY_NAME } from '$lib/common/graphql/queries-resource-api';
	import ResourceOverviewMenu from '$lib/ResourceOverviewMenu.svelte';
	import ResourceScopesMenu from '$lib/ResourceScopesMenu.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const group: string = $derived(data.group);
	const tenant: string = $derived(data.tenant);

	const gqlClient: GraphQLClient = getResourceApiClient();
	let scopesStore = $derived(
		queryStore<GetScopesQuery, GetScopesQueryVariables>({
			client: gqlClient,
			query: GET_SCOPES,
			variables: {
				tenant: tenant
			}
		})
	);
	let displayNameStore = $derived(
		queryStore<GetGroupDisplayNameQuery, GetGroupDisplayNameQueryVariables>({
			client: gqlClient,
			query: GET_GROUP_DISPLAY_NAME,
			variables: {
				tenant: tenant,
				resourceName: group
			}
		})
	);

	let resource: ResourceType = $derived({
		type: 'group',
		tenant: tenant,
		resourceName: group,
		displayName: $displayNameStore.data?.group?.displayName ?? group
	});

	let tenantObject = $derived($scopesStore.data?.tenant);
	let scopes = $derived(tenantObject?.groups.find((g) => g.group == group)?.scopes?.granted ?? []);
	let displayNameModalOpen = $state(false);

	let permissionsPromise = $derived(fetchPermissions(resource, $accessToken));

	function reload() {
		permissionsPromise = fetchPermissions(resource, $accessToken);
	}

	let hasAdminOnGroup = $derived(hasPermission(tenantObject, 'group:admin', 'group', group));
</script>

<PageTitle title={$_('page.groupsList.groupPageOverview') + (resource.displayName ?? group)} />

<Tabs>
	<TabItem open title={$_('page.resourceTabMenu.overview')}>
		<ResourceOverviewMenu {tenantObject} {resource} bind:displayNameModalOpen />
	</TabItem>
	<TabItem title={$_('page.resourceTabMenu.scopes')}>
		<ResourceScopesMenu {scopes} />
	</TabItem>
	<TabItem
		class="permissions-list-tab"
		disabled={!hasAdminOnGroup}
		title={$_('page.groupsList.permissionListTitle')}
	>
		{#await permissionsPromise}
			<Spinner />
		{:then permissions}
			<PermissionList {tenantObject} {resource} {reload} {permissions} />
		{/await}
	</TabItem>
	{#if !hasAdminOnGroup}
		<Tooltip triggeredBy=".permissions-list-tab" placement="top">
			{$_('component.permissions.missingPermissions')}
		</Tooltip>
	{/if}
	<TabItem title={$_('page.resourceTabMenu.dangerZone')}>
		<Card class="max-w-full">
			<DeleteButton
				buttonTitle={!hasAdminOnGroup
					? $_('component.permissions.missingPermissions')
					: 'shared.action.delete'}
				buttonText="shared.action.delete"
				disabled={!hasAdminOnGroup}
				additionalClasses="w-fit"
				modalTitle="page.groupsList.deleteModal.title"
				modalBody="page.groupsList.deleteModal.body"
				submitFunction={async () => {
					await deleteGroup(gqlClient, tenant, group, refreshAccessToken);
				}}
			/>
		</Card>
	</TabItem>
</Tabs>

<DisplayNameModal bind:isOpen={displayNameModalOpen} bind:resource />
