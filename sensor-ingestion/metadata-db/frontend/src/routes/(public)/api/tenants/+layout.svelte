<script lang="ts">
	import {
		Button,
		DropdownDivider,
		P,
		Search,
		Sidebar,
		SidebarDropdownWrapper,
		SidebarGroup,
		SidebarItem
	} from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import NewResourceModal from '$lib/NewResourceModal.svelte';
	import { twMerge } from 'tailwind-merge';
	import PlusIcon from '~icons/heroicons/plus';
	import WarnIcon from '~icons/heroicons/exclamation-triangle';
	import ChevronLeftIcon from '~icons/heroicons/chevron-left';
	import CancelIcon from '~icons/heroicons/x-mark';
	import { MediaQuery } from 'svelte/reactivity';
	import { getResourceApiClient, hasPermission } from '$lib/common/graphql/utils.js';
	import type {
		GetScopesQuery,
		GetScopesQueryVariables
	} from '$lib/common/generated/types-resource-api.js';
	import { GET_SCOPES } from '$lib/common/graphql/queries-resource-api.js';
	import { Client as GraphQLClient, queryStore } from '@urql/svelte';
	import { GET_ALL_RESOURCES, GET_ALL_TENANTS } from '$lib/common/graphql/queries-resource-api.js';
	import {
		type GetAllResourcesQuery,
		type GetAllResourcesQueryVariables,
		type GetAllTenantsQuery,
		type GetAllTenantsQueryVariables
	} from '$lib/common/generated/types-resource-api.js';
	import { type ResourceType } from '$lib/nav/fetchUtils.js';

	let { children, data } = $props();

	const largeScreenQuery = new MediaQuery('min-width: 100rem');
	let largeScreen = $derived(largeScreenQuery.current);

	let gqlClient: GraphQLClient = getResourceApiClient();
	let tenantsStore = $derived(
		queryStore<GetAllTenantsQuery, GetAllTenantsQueryVariables>({
			client: gqlClient,
			query: GET_ALL_TENANTS
		})
	);

	let tenants = $derived($tenantsStore.data?.tenants ?? []);
	let currentTenant = $derived(data.tenant);

	let scopesStore = $derived(
		queryStore<GetScopesQuery, GetScopesQueryVariables>({
			client: gqlClient,
			query: GET_SCOPES,
			variables: {
				tenant: currentTenant
			}
		})
	);

	let rootScopes = $derived($scopesStore.data?.scopes?.granted ?? []);
	let selectedMenu: 'groups' | 'projects' | 'viz-groups' | '' = $state(setSelectedMenu());

	let tenantObject = $derived($scopesStore.data?.tenant);

	let createModalOpen = $state(false);

	let resourcesStore = $derived(
		queryStore<GetAllResourcesQuery, GetAllResourcesQueryVariables>({
			client: gqlClient,
			query: GET_ALL_RESOURCES,
			variables: {
				tenant: currentTenant
			}
		})
	);
	let resources = $derived(filterResources());
	let query = $state('');

	let newResource: ResourceType | null = $state(null);

	let dropdownClass =
		'flex items-center p-2 w-full dark:text-white overflow-hidden hover:bg-transparent dark:hover:bg-transparent';
	let itemClass =
		'overflow-hidden rounded-none hover:bg-gray-100 dark:hover:bg-slate-600 hover:text-black hover:dark:text-white';
	let buttonClass =
		'bg-transparent dark:bg-transparent w-[3.5rem] h-[2.5rem] rounded-none rounded-tr-lg hover:bg-black/10 dark:hover:bg-white/10 border border-black/25 dark:border-white/25 text-black dark:text-white text-lg focus-within:ring-0';

	let bgColors = {
		activeElement: 'bg-primary-600 text-white [&_svg]:text-white!',
		inactiveElement: 'bg-gray-300 dark:bg-slate-800',
		activeChild: 'bg-gray-100 dark:bg-slate-600',
		inactiveChild: 'bg-gray-200 dark:bg-slate-700',
		background: 'bg-white dark:bg-slate-900'
	};

	function setSelectedMenu() {
		if (data.group) {
			return 'groups';
		} else if (data.project) {
			return 'projects';
		} else if (data.vizGroup) {
			return 'viz-groups';
		} else {
			return '';
		}
	}

	const activeRessource: string = $derived.by(() => {
		switch (selectedMenu) {
			case 'groups':
				return data.group;
			case 'projects':
				return data.project;
			case 'viz-groups':
				return data.vizGroup;
			default:
				return data.tenant;
		}
	});

	async function selectTenant(tenant: string) {
		query = '';
		selectedMenu = '';
		await goto(`/api/tenants/${tenant}`);
	}

	async function selectMenu(menu: 'groups' | 'projects' | 'viz-groups') {
		query = '';
		selectedMenu = menu;
	}

	function filterResources() {
		let resourceList: { resourceName: string; displayName: string | null }[];

		switch (selectedMenu) {
			case 'groups':
				resourceList = $resourcesStore.data?.tenant?.groups ?? [];
				break;
			case 'viz-groups':
				resourceList = $resourcesStore.data?.tenant?.vizGroups ?? [];
				break;
			case 'projects':
				resourceList = $resourcesStore.data?.tenant?.projects ?? [];
				break;
			default:
				resourceList = [];
				break;
		}

		resourceList = resourceList.map((r) => {
			return { resourceName: r.resourceName, displayName: r.displayName };
		});

		if (query) {
			resourceList = resourceList.filter((r) =>
				(r.displayName ?? r.resourceName).toLowerCase().includes(query.toLowerCase())
			);
		}

		return resourceList;
	}

	function openCreateModal(newResourceType: ResourceType['type']) {
		newResource = {
			type: newResourceType,
			tenant: currentTenant,
			resourceName: '',
			displayName: ''
		};
		createModalOpen = true;
	}
</script>

<div class="flex max-h-[calc(100vh-10rem)] grow flex-row gap-[1em] pt-3">
	{#if !selectedMenu || (selectedMenu && largeScreen)}
		<Sidebar class="w-60 min-w-60">
			<SidebarGroup class="{bgColors['inactiveElement']} space-y-0 rounded-lg">
				<div class="nowrap flex flex-row items-center">
					<P class="grow text-center">{$_('page.tenantsList.title')}</P>
					{#if rootScopes.includes('tenant:admin')}
						<Button
							title={$_('page.tenantsList.newTenantTooltip')}
							class="{buttonClass} flex-end"
							on:click={() => openCreateModal('tenant')}
						>
							<PlusIcon class="text-xs" />
						</Button>
					{:else}
						<Button
							title={$_(`page.tenantsList.noResourceCreationPermission`)}
							disabled
							class={buttonClass}
						>
							<WarnIcon class="text-xs" />
						</Button>
					{/if}
				</div>
				{#if tenants.length > 0}
					{#each tenants as tenant (tenant)}
						<DropdownDivider class="{bgColors['background']} m-0" hidden={tenant === tenants[0]} />
						<SidebarGroup
							class="{tenant.resourceName === data.tenant
								? bgColors['activeElement']
								: bgColors['inactiveElement']} rounded-none
								{tenant == tenants[tenants.length - 1] ? ' rounded-b-lg' : ''}"
						>
							<SidebarDropdownWrapper
								ulClass="p-0"
								label={tenant.displayName ?? tenant.resourceName}
								btnClass={dropdownClass}
								isOpen={data.tenant === tenant.resourceName}
								on:click={() => selectTenant(tenant.resourceName)}
							>
								<SidebarGroup
									class="{data.tenant === tenant.resourceName
										? bgColors['inactiveChild']
										: bgColors['inactiveElement']} m-0 space-y-0
										{tenant === tenants[tenants.length - 1] ? 'rounded-b-lg' : ''}"
								>
									<SidebarItem
										label="Übersicht"
										href="/api/tenants/{tenant.resourceName}"
										class={twMerge(
											itemClass,
											selectedMenu === '' ? bgColors['activeChild'] : bgColors['inactiveChild']
										)}
										on:click={() => (selectedMenu = '')}
									/>
									<SidebarItem
										label={$_('page.groupsList.title')}
										class={twMerge(
											itemClass,
											selectedMenu === 'groups'
												? bgColors['activeChild']
												: bgColors['inactiveChild']
										)}
										on:click={() => selectMenu('groups')}
									/>
									<SidebarItem
										label={$_('page.viz-groupsList.title')}
										class={twMerge(
											itemClass,
											selectedMenu === 'viz-groups'
												? bgColors['activeChild']
												: bgColors['inactiveChild']
										)}
										on:click={() => selectMenu('viz-groups')}
									/>
									<SidebarItem
										label={$_('page.projectsList.title')}
										class={twMerge(
											itemClass,
											selectedMenu === 'projects'
												? bgColors['activeChild']
												: bgColors['inactiveChild']
										)}
										on:click={() => selectMenu('projects')}
									/>
								</SidebarGroup>
							</SidebarDropdownWrapper>
						</SidebarGroup>
					{/each}
				{:else}
					<P class="pt-2 pb-2 pl-5">{$_('page.tenantsList.noTenants')}</P>
				{/if}
			</SidebarGroup>
		</Sidebar>
	{/if}
	{#if selectedMenu && data.tenant}
		<Sidebar class="w-auto">
			<SidebarGroup
				class="{bgColors[
					'inactiveChild'
				]} max-h-[calc(100vh-10rem)] space-y-0 overflow-auto rounded-lg"
			>
				<div class="nowrap flex flex-row items-center">
					{#if !largeScreen}
						<Button
							title={$_('shared.previous')}
							href={data.group || data.project || data.vizGroup ? '..' : ''}
							on:click={() => (selectedMenu = '')}
							class={twMerge(buttonClass, 'cursor-default rounded-tl-lg rounded-tr-none')}
						>
							<ChevronLeftIcon />
						</Button>
					{/if}
					<P class="grow px-2 text-center">{$_(`page.${selectedMenu}List.title`)}</P>
					{#if selectedMenu === 'groups' ? hasPermission(tenantObject, 'group:admin') : selectedMenu === 'projects' ? hasPermission(tenantObject, 'project:admin') : hasPermission(tenantObject, 'viz-group:admin')}
						<Button
							title={$_(`page.${selectedMenu}List.newTooltip`)}
							class={buttonClass}
							on:click={() =>
								openCreateModal(
									selectedMenu === 'groups'
										? 'group'
										: selectedMenu === 'viz-groups'
											? 'vizGroup'
											: 'project'
								)}
						>
							<PlusIcon class="text-xs" />
						</Button>
					{:else}
						<Button
							title={$_(`page.tenantsList.noResourceCreationPermission`)}
							class={buttonClass}
							disabled
						>
							<WarnIcon class="text-xs" />
						</Button>
					{/if}
				</div>
				<Search
					size="md"
					class="ms-auto rounded-{resources.length === 0 ? 'b-lg rounded-t-none' : 'none'}"
					placeholder={$_('shared.action.search')}
					bind:value={query}
					on:input={() => (resources = filterResources())}
				>
					<Button
						title={$_('shared.action.clearSearch')}
						class={twMerge(
							buttonClass,
							'mr-2 h-[3em] w-[3em] cursor-pointer rounded-[100%] border-none p-0 text-xs hover:bg-black/10 dark:hover:bg-white/10'
						)}
						on:click={() => (query = '')}
					>
						<CancelIcon class="text-xs" />
					</Button>
				</Search>
				<div class="max-h-[calc(100vh-15rem)] overflow-auto">
					{#if resources.length > 0}
						{#each resources as resource (resource)}
							<DropdownDivider
								class="{bgColors['background']} m-0"
								hidden={resource == resources[0] || resource == resources[0]}
							/>
							<SidebarGroup
								class="{activeRessource === resource.resourceName
									? bgColors['activeElement']
									: bgColors['inactiveChild']} rounded-none"
							>
								<SidebarItem
									label={resource.displayName ?? resource.resourceName}
									class="{itemClass} {activeRessource === resource.resourceName
										? 'text-white'
										: 'text-black dark:text-white'}"
									href="/api/tenants/{currentTenant}/{selectedMenu}/{resource.resourceName}/"
								/>
							</SidebarGroup>
						{/each}
					{:else}
						<P class="pt-2 pb-2 pl-5">
							{$_(`page.${selectedMenu}List.empty`)}
						</P>
					{/if}
				</div>
			</SidebarGroup>
		</Sidebar>
	{/if}

	<div class="max-h-[calc(100vh-6.5rem)] grow overflow-auto">
		{#key data}
			{@render children()}
		{/key}
	</div>
</div>

{#if newResource}
	<NewResourceModal
		{gqlClient}
		bind:resource={newResource}
		bind:createModalOpen
		createFunction={(tenantCreated: boolean) => {
			if (tenantCreated) tenantsStore.reexecute({ requestPolicy: 'network-only' });
			else resourcesStore.reexecute({ requestPolicy: 'network-only' });
			scopesStore.reexecute({ requestPolicy: 'network-only' });
			newResource = null;
		}}
	/>
{/if}
