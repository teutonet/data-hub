<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import OverviewCard from '$lib/overview/OverviewCard.svelte';
	import { _ } from 'svelte-i18n';
	import { activeProjectId } from '$lib/nav/activeProject';
	import type { PageData } from '../new/$types';
	import { getConfig } from '$lib/config';
	import { projectUrl } from '$lib/common/url';
	import PermissionManagementIcon from '~icons/heroicons/key';
	import UserManagementIcon from '~icons/heroicons/users';
	import ApiExplorerIcon from '~icons/heroicons/server-stack';
	import SensorManagementIcon from '~icons/heroicons/wrench-screwdriver';
	import DocsIcon from '~icons/heroicons/information-circle';
	import PythonNotebookIcon from '~icons/heroicons/pencil-square';
	import DataVisualizationIcon from '~icons/heroicons/chart-bar-square';
	import S3ExplorerIcon from '~icons/heroicons/document-arrow-up';
	import OverviewIcon from '~icons/heroicons/globe-europe-africa';
	import ProjectInApiIcon from '~icons/heroicons/finger-print';
	import { getUserSensorBucketPerms } from '$lib/common/graphql/ressource-api-utils';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let [tenant, project] = $derived(data.projectId.split('.'));

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

<PageTitle title={$_('component.nav.projectOverview')} />

<div class="flex flex-wrap">
	<OverviewCard
		href="/"
		title={$_('component.nav.allProjects')}
		description={$_('component.overview.allProjects')}
		Icon={OverviewIcon}
	/>
	<OverviewCard
		href={projectUrl($activeProjectId, 'overview')}
		title={$_('component.nav.sensoradministration')}
		description={$_('component.overview.sensorOverview')}
		disabled={!($activeProjectId === 'all'
			? anyProjectWithSensorMetadataWritePerm
			: currentProjectPermissions?.sensorMetadataWrite)}
		Icon={SensorManagementIcon}
	/>
	<OverviewCard
		href={getConfig('GRAFANA_URL')}
		externalLink={true}
		title={$_('page.hub.links.grafana')}
		description={$_('component.overview.grafana')}
		disabled={!$activeProjectId}
		Icon={DataVisualizationIcon}
	/>
	<OverviewCard
		href={getConfig('JUPYTERHUB_URL')}
		externalLink={true}
		title={$_('page.hub.links.jupyterhub')}
		description={$_('component.overview.jupyterhub')}
		disabled={!$activeProjectId}
		Icon={PythonNotebookIcon}
	/>
	<OverviewCard
		href={getConfig('KEYCLOAK_URL')}
		externalLink={true}
		title={$_('page.hub.links.keycloak')}
		description={$_('component.overview.keycloak')}
		disabled={!$activeProjectId}
		Icon={UserManagementIcon}
	/>
	<OverviewCard
		href="/api/tenants"
		title={$_('page.hub.links.authApi')}
		description={$_('component.overview.authApi')}
		disabled={!$activeProjectId}
		Icon={PermissionManagementIcon}
	/>
	<OverviewCard
		href={`/api/tenants/${tenant}/projects/${project}`}
		title={$_('component.nav.projectApi')}
		description={$_('component.nav.projectApiDesc')}
		Icon={ProjectInApiIcon}
		disabled={!(tenant && project)}
	/>
	<OverviewCard
		href={getConfig('MDB_GRAPHIQL_URL')}
		externalLink={true}
		title={$_('page.hub.links.mdbGraphiql')}
		description={$_('component.overview.mdbGraphiql')}
		disabled={!$activeProjectId}
		Icon={ApiExplorerIcon}
	/>
	<OverviewCard
		href={projectUrl($activeProjectId, 's3-explorer')}
		title={$_('page.s3-explorer.title')}
		description={$_('component.overview.s3Explorer')}
		disabled={!($activeProjectId === 'all'
			? anyProjectWithBucketReadOrWritePerm
			: currentProjectPermissions?.bucketRead || currentProjectPermissions?.bucketWrite)}
		Icon={S3ExplorerIcon}
	/>
	<OverviewCard
		href={getConfig('DOCS_URL')}
		externalLink={true}
		title={$_('page.hub.links.docs')}
		description={$_('component.overview.docs')}
		disabled={!$activeProjectId}
		Icon={DocsIcon}
	/>
</div>
