<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { Card, P, Spinner, TabItem, Tabs } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { _ } from 'svelte-i18n';
	import PermissionList from '$lib/permissions/PermissionList.svelte';
	import { fetchPermissions, type ResourceType } from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import { getResourceApiClient, hasPermission } from '$lib/common/graphql/utils';
	import {
		type GetTenantDisplayNameQuery,
		type GetTenantDisplayNameQueryVariables,
		type GetScopesQuery,
		type GetScopesQueryVariables
	} from '$lib/common/generated/types-resource-api';
	import { GET_SCOPES } from '$lib/common/graphql/queries-resource-api';
	import DisplayNameModal from '$lib/DisplayNameModal.svelte';
	import { Client as GraphQLClient, queryStore } from '@urql/svelte';
	import { GET_TENANT_DISPLAY_NAME } from '$lib/common/graphql/queries-resource-api';
	import ResourceOverviewMenu from '$lib/ResourceOverviewMenu.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

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
		queryStore<GetTenantDisplayNameQuery, GetTenantDisplayNameQueryVariables>({
			client: gqlClient,
			query: GET_TENANT_DISPLAY_NAME,
			variables: {
				tenant: tenant
			}
		})
	);

	let resource: ResourceType = $derived({
		type: 'tenant',
		tenant: tenant,
		resourceName: tenant,
		displayName: $displayNameStore.data?.tenant?.displayName ?? tenant
	});

	let tenantObject = $derived($scopesStore.data?.tenant);
	let scopes = $derived(tenantObject?.scopes?.granted ?? []);

	let promise = $derived(fetchPermissions(resource, $accessToken));

	let displayNameModalOpen = $state(false);

	function reload() {
		promise = fetchPermissions(resource, $accessToken);
	}
</script>

<PageTitle title={$_('page.tenantsList.tenantPageOverview') + (resource.displayName ?? tenant)} />

{#if hasPermission(tenantObject, 'tenant:admin')}
	{#await promise}
		<Spinner />
	{:then permissions}
		<Tabs>
			<TabItem open title={$_('page.resourceTabMenu.overview')}>
				<ResourceOverviewMenu {tenantObject} {resource} bind:displayNameModalOpen />
			</TabItem>
			<TabItem title={$_('page.resourceTabMenu.tenantPermissions')}>
				<PermissionList {tenantObject} {resource} {reload} {permissions} />
			</TabItem>
		</Tabs>
	{/await}
{:else if scopes.length > 0}
	<Card class="min-w-full p-0 sm:p-2">
		<P>{$_('page.tenantsList.scopesOnThisResource')}</P>
		{#each scopes as scope (scope)}
			<div>
				{scope}
			</div>
		{/each}
	</Card>
{:else}
	<P>{$_('page.tenantsList.noScopesOnThisResource')}</P>
{/if}

<DisplayNameModal bind:isOpen={displayNameModalOpen} bind:resource />
