<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import SensorsOverview from '$lib/SensorsOverview.svelte';
	import type { GetSensorsQuery, GetSensorsQueryVariables } from '$lib/common/generated/types';
	import { GET_SENSORS } from '$lib/common/graphql/queries';
	import { getContextClient, queryStore } from '@urql/svelte';
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import PlusIcon from '~icons/heroicons/plus';
	import type { PageData } from './$types';
	import { projectUrl } from '$lib/common/url';
	import { projectCondition } from '$lib/common/graphql/utils';

	export let data: PageData;

	const client = getContextClient();

	$: projectId = data.projectId;

	$: sensorQuery = queryStore<GetSensorsQuery, GetSensorsQueryVariables>({
		client,
		query: GET_SENSORS,
		variables: {
			condition: {
				project: projectCondition(data.projectId)
			}
		}
	});

	$: sensors = $sensorQuery.data?.sensors ?? [];
</script>

<PageTitle title={$_('page.sensorTypes.title')} />

{#if !$sensorQuery.fetching && sensors}
	<SensorsOverview {sensors} />
	<Button
		href={projectUrl(projectId, 'sensortype', 'new')}
		title={$_('page.sensortypes.newSensortype')}
	>
		<PlusIcon />
		{$_('page.sensorTypes.newSensortype')}
	</Button>
{/if}
