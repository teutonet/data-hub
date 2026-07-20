<script lang="ts">
	import { getConfig } from '$lib/config';
	import { isAuthenticated } from '$lib/common/auth';
	import { Badge, Button, Sidebar, SidebarGroup } from 'flowbite-svelte';
	import DatahubSidebarItem from '$lib/DatahubSidebarItem.svelte';
	import { projectUrl } from '$lib/common/url';
	import { activeProjectId } from '$lib/nav/activeProject';
	import { _ } from 'svelte-i18n';
	import { type Snippet } from 'svelte';
	import { getallThingsErrorsStore } from '$lib/common/graphql/utils';
	import { getUserSensorBucketPerms } from '$lib/common/graphql/ressource-api-utils';
	import { MediaQuery } from 'svelte/reactivity';
	import DataHubSideBarDropdownWrapper from './DataHubSideBarDropdownWrapper.svelte';
	import PermissionManagementIcon from '~icons/heroicons/key';
	import UserManagementIcon from '~icons/heroicons/users';
	import ApiExplorerIcon from '~icons/heroicons/server-stack';
	import SensorManagementIcon from '~icons/heroicons/wrench-screwdriver';
	import OverviewIcon from '~icons/heroicons/globe-europe-africa';
	import DocsIcon from '~icons/heroicons/information-circle';
	import PythonNotebookIcon from '~icons/heroicons/pencil-square';
	import DataVisualizationIcon from '~icons/heroicons/chart-bar-square';
	import ListBulletIcon from '~icons/heroicons/list-bullet';
	import S3ExplorerIcon from '~icons/heroicons/document-arrow-up';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const largeScreenQuery = new MediaQuery('min-width: 75rem');
	let sidebarIsClosed = $derived(!largeScreenQuery.current);

	const allThingsErrorsStore = $derived(
		getallThingsErrorsStore($activeProjectId === 'all' ? undefined : $activeProjectId)
	);

	const allThingsErrorCount = $derived($allThingsErrorsStore?.data?.things?.length ?? 0);

	const userProjectPermissions = getUserSensorBucketPerms();

	const anyProjectWithSensorMetadataWritePerm: boolean = $derived(
		Object.values($userProjectPermissions).some((perm) => perm.sensorMetadataWrite)
	);
	const anyProjectWithBucketReadOrWritePerm: boolean = $derived(
		Object.values($userProjectPermissions).some((perm) => perm.bucketWrite || perm.bucketRead)
	);
	const currentProjectPermissions = $derived(
		$activeProjectId === 'all' ? undefined : $userProjectPermissions[$activeProjectId]
	);
</script>

<div class="flex h-[calc(100vh-3.4rem)]">
	{#if $isAuthenticated}
		<div
			class="dark:gray-300 sticky me-6 h-full min-w-fit overflow-y-auto border-e border-gray-200 shadow-md dark:border-gray-700 dark:bg-slate-800"
		>
			<Button
				class="min-w-full rounded-none bg-orange-500 !text-start text-xl focus:ring-0 focus:outline-none"
				on:click={() => (sidebarIsClosed = !sidebarIsClosed)}><ListBulletIcon /></Button
			>
			<div>
				<Sidebar class={sidebarIsClosed ? 'dataHubSidebar py-4' : ''} asideClass="w-auto">
					<SidebarGroup class="ps-2 pe-3 pt-4">
						<DatahubSidebarItem
							minimized={sidebarIsClosed}
							href={$activeProjectId ? projectUrl($activeProjectId, 'projectoverview') : '#'}
							label={$_('component.nav.projectOverview')}
							Icon={OverviewIcon}
						/>
						<DataHubSideBarDropdownWrapper
							isProjectmodeSpecific={true}
							bind:minimized={sidebarIsClosed}
							Icon={SensorManagementIcon}
							label={$_('component.nav.sensoradministration')}
						>
							<DatahubSidebarItem
								href={$activeProjectId ? projectUrl($activeProjectId, 'overview') : '#'}
								label={$_('component.nav.sensorOverview')}
								disabled={!($activeProjectId === 'all'
									? anyProjectWithSensorMetadataWritePerm
									: currentProjectPermissions?.sensorMetadataWrite)}
							/>
							<DatahubSidebarItem
								href={$activeProjectId ? projectUrl($activeProjectId, 'sensors') : '#'}
								label={$_('component.nav.sensors')}
								disabled={!($activeProjectId === 'all'
									? anyProjectWithSensorMetadataWritePerm
									: currentProjectPermissions?.sensorMetadataWrite)}
							/>
							<DatahubSidebarItem
								href={$activeProjectId ? projectUrl($activeProjectId, 'sensortypes') : '#'}
								label={$_('component.nav.sensortypes')}
								disabled={!($activeProjectId === 'all'
									? anyProjectWithSensorMetadataWritePerm
									: currentProjectPermissions?.sensorMetadataWrite)}
							/>
							<DatahubSidebarItem
								href={$activeProjectId ? projectUrl($activeProjectId, 'properties') : '#'}
								label={$_('component.nav.properties')}
								disabled={!($activeProjectId === 'all'
									? anyProjectWithSensorMetadataWritePerm
									: currentProjectPermissions?.sensorMetadataWrite)}
							/>
							<DatahubSidebarItem
								label={$_('component.nav.sensorerrors')}
								href={projectUrl($activeProjectId, 'sensorerrors')}
								preload="tap"
								disabled={!($activeProjectId === 'all'
									? anyProjectWithSensorMetadataWritePerm
									: currentProjectPermissions?.sensorMetadataWrite)}
							>
								<Badge rounded class="ml-3 font-semibold">{allThingsErrorCount}</Badge>
							</DatahubSidebarItem>
							<DatahubSidebarItem
								href={$activeProjectId ? projectUrl($activeProjectId, 'new') : '#'}
								label={$_('component.nav.newSensors')}
								disabled={!($activeProjectId === 'all'
									? anyProjectWithSensorMetadataWritePerm
									: currentProjectPermissions?.sensorMetadataWrite)}
							></DatahubSidebarItem>
						</DataHubSideBarDropdownWrapper>
						<DatahubSidebarItem
							minimized={sidebarIsClosed}
							href={getConfig('GRAFANA_URL')}
							label={$_('page.hub.links.grafana')}
							Icon={DataVisualizationIcon}
							target="_blank"
							externalLink={true}
						/>
						<DatahubSidebarItem
							minimized={sidebarIsClosed}
							href={getConfig('JUPYTERHUB_URL')}
							label={$_('page.hub.links.jupyterhub')}
							Icon={PythonNotebookIcon}
							target="_blank"
							externalLink={true}
						/>
						<DatahubSidebarItem
							minimized={sidebarIsClosed}
							href={getConfig('KEYCLOAK_URL')}
							label={$_('page.hub.links.keycloak')}
							Icon={UserManagementIcon}
							target="_blank"
							externalLink={true}
						/>
						<DatahubSidebarItem
							minimized={sidebarIsClosed}
							href="/api/tenants"
							label={$_('page.hub.links.authApi')}
							Icon={PermissionManagementIcon}
						/>
						<DatahubSidebarItem
							minimized={sidebarIsClosed}
							href={getConfig('MDB_GRAPHIQL_URL')}
							label={$_('page.hub.links.mdbGraphiql')}
							Icon={ApiExplorerIcon}
							target="_blank"
							externalLink={true}
						/>
						<DatahubSidebarItem
							isProjectmodeSpecific={true}
							minimized={sidebarIsClosed}
							href={projectUrl($activeProjectId, 's3-explorer')}
							label={$_('page.s3-explorer.title')}
							disabled={!($activeProjectId === 'all'
								? anyProjectWithBucketReadOrWritePerm
								: currentProjectPermissions?.bucketRead || currentProjectPermissions?.bucketWrite)}
							Icon={S3ExplorerIcon}
						/>
						<DatahubSidebarItem
							minimized={sidebarIsClosed}
							href={getConfig('DOCS_URL')}
							label={$_('page.hub.links.docs')}
							Icon={DocsIcon}
							target="_blank"
							externalLink={true}
						/>
					</SidebarGroup>
				</Sidebar>
			</div>
		</div>
		<div class="me-6 mt-[.75rem] flex max-h-[calc(100vh-5rem)] w-full flex-col overflow-auto">
			{@render children?.()}
		</div>
	{/if}
</div>

<style>
	:global(.dataHubSidebar > ul) {
		padding: 0px;
		padding-top: 0rem;
	}
</style>
