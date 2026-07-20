<script lang="ts">
	import type { GetSensorBucketPermissionsQuery } from '$lib/common/generated/types-resource-api';
	import { GET_PROJECT_SENSOR_BUCKET_PERMISSIONS } from '$lib/common/graphql/queries-resource-api';
	import { getResourceApiClient } from '$lib/common/graphql/utils';
	import { queryStore } from '@urql/svelte';
	import { setContext, type Snippet } from 'svelte';
	import { writable } from 'svelte/store';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const gqlClient = getResourceApiClient();

	const projectSensorBucketPermsStore = $derived(
		queryStore<GetSensorBucketPermissionsQuery>({
			client: gqlClient,
			query: GET_PROJECT_SENSOR_BUCKET_PERMISSIONS,
			context: {
				additionalTypenames: ['Project', 'Permission']
			}
		})
	);

	const projectSensorBucketPerms: Record<
		string,
		{ sensorMetadataWrite: boolean; bucketRead: boolean; bucketWrite: boolean }
	> = $derived(
		Object.fromEntries(
			$projectSensorBucketPermsStore.data?.tenants.flatMap((tenant) =>
				tenant.projects.map((project) => {
					return [
						`${tenant.tenant}.${project.project}`,
						{
							sensorMetadataWrite: project.sensorMetadataWrite,
							bucketRead: project.bucketRead,
							bucketWrite: project.bucketWrite
						}
					];
				})
			) ?? []
		)
	);

	const projects: string[] = $derived(
		Object.entries(projectSensorBucketPerms)
			.filter(([, perm]) => perm.sensorMetadataWrite || perm.bucketRead || perm.bucketWrite)
			.map(([project]) => project)
	);

	const projectsWithBucketPermissions: {
		project: string;
		permission: { read: boolean; write: boolean };
	}[] = $derived(
		Object.entries(projectSensorBucketPerms)
			.filter(([, perm]) => perm.bucketRead || perm.bucketWrite)
			.map(([project, perm]) => ({
				project,
				permission: { read: perm.bucketRead, write: perm.bucketWrite }
			}))
	);

	const projectPermissionsStore = writable<typeof projectSensorBucketPerms>({});
	setContext('resourceApi-projectSensorBucketPerms', projectPermissionsStore);

	const projectsStore = writable<string[]>([]);
	setContext('resourceApi-userReadableProjects', projectsStore);

	const projectsWithBucketPermissionsStore = writable<
		{ project: string; permission: { read: boolean; write: boolean } }[]
	>([]);
	setContext('resourceApi-projectsWithBucketPermissions', projectsWithBucketPermissionsStore);

	$effect(() => {
		projectPermissionsStore.set(projectSensorBucketPerms);
		projectsStore.set(projects);
		projectsWithBucketPermissionsStore.set(projectsWithBucketPermissions);
	});
</script>

{@render children?.()}
