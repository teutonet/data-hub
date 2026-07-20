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
	import {
		type GetVizGroupDisplayNameQuery,
		type GetVizGroupDisplayNameQueryVariables,
		type GetScopesQuery,
		type GetScopesQueryVariables
	} from '$lib/common/generated/types-resource-api';
	import { GET_SCOPES } from '$lib/common/graphql/queries-resource-api';
	import { deleteVizGroup } from '$lib/common/graphql/ressource-api-utils';
	import DisplayNameModal from '$lib/DisplayNameModal.svelte';
	import { queryStore, type Client as GraphQLClient } from '@urql/svelte';
	import { GET_VIZGROUP_DISPLAY_NAME } from '$lib/common/graphql/queries-resource-api';
	import ResourceOverviewMenu from '$lib/ResourceOverviewMenu.svelte';
	import ResourceScopesMenu from '$lib/ResourceScopesMenu.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const tenant: string = $derived(data.tenant);
	const vizGroup: string = $derived(data.vizGroup);

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
		queryStore<GetVizGroupDisplayNameQuery, GetVizGroupDisplayNameQueryVariables>({
			client: gqlClient,
			query: GET_VIZGROUP_DISPLAY_NAME,
			variables: {
				tenant: tenant,
				resourceName: vizGroup
			}
		})
	);

	let resource: ResourceType = $derived({
		type: 'vizGroup',
		tenant: tenant,
		resourceName: vizGroup,
		displayName: $displayNameStore.data?.vizGroup?.displayName ?? vizGroup
	});

	let tenantObject = $derived($scopesStore.data?.tenant);
	let scopes = $derived(
		tenantObject?.vizGroups.find((vg) => vg.vizGroup == vizGroup)?.scopes?.granted ?? []
	);
	let displayNameModalOpen = $state(false);

	let permissionsPromise = $derived(fetchPermissions(resource, $accessToken));

	function reload() {
		permissionsPromise = fetchPermissions(resource, $accessToken);
	}
	let hasAdminOnVizGroup = $derived(
		hasPermission(tenantObject, 'viz-group:admin', 'viz-group', vizGroup)
	);
</script>

<PageTitle
	title={$_('page.viz-groupsList.vizGroupPageOverview') + (resource.displayName ?? vizGroup)}
/>

<Tabs>
	<TabItem open title={$_('page.resourceTabMenu.overview')}>
		<ResourceOverviewMenu {tenantObject} {resource} bind:displayNameModalOpen />
	</TabItem>
	<TabItem title={$_('page.resourceTabMenu.scopes')}>
		<ResourceScopesMenu {scopes} />
	</TabItem>
	<TabItem
		class="permissions-list-tab"
		disabled={!hasAdminOnVizGroup}
		title={$_('page.viz-groupsList.permissionListTitle')}
	>
		{#await permissionsPromise}
			<Spinner />
		{:then permissions}
			<PermissionList {tenantObject} {resource} {reload} {permissions} />
		{/await}
	</TabItem>
	{#if !hasAdminOnVizGroup}
		<Tooltip triggeredBy=".permissions-list-tab" placement="top">
			{$_('component.permissions.missingPermissions')}
		</Tooltip>
	{/if}
	<TabItem title={$_('page.resourceTabMenu.dangerZone')}>
		<Card class="max-w-full">
			<DeleteButton
				buttonTitle={!hasAdminOnVizGroup
					? $_('component.permissions.missingPermissions')
					: 'shared.action.delete'}
				buttonText="shared.action.delete"
				disabled={!hasAdminOnVizGroup}
				additionalClasses="w-fit"
				modalTitle="page.viz-groupsList.deleteModal.title"
				modalBody="page.viz-groupsList.deleteModal.body"
				submitFunction={async () => {
					deleteVizGroup(gqlClient, tenant, vizGroup, refreshAccessToken);
				}}
			/>
		</Card>
	</TabItem>
</Tabs>

<DisplayNameModal bind:isOpen={displayNameModalOpen} bind:resource />
