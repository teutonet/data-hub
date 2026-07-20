<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { A, Alert, Card, Heading } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import { projectAccess } from '$lib/common/auth';
	import { projectUrl } from '$lib/common/url';
	import { activeProjectId } from '$lib/nav/activeProject';
	import HeroiconsExclamationCircle20Solid from '~icons/heroicons/exclamation-circle-20-solid';
	import { getContextClient, queryStore } from '@urql/svelte';
	import type {
		GetThingsLatestErrorsQuery,
		GetThingsLatestErrorsQueryVariables
	} from '$lib/common/generated/types';
	import { GET_THINGS_ERRORS } from '$lib/common/graphql/queries';

	const client = getContextClient();
	let allThingsErrorsStore = $derived(
		queryStore<GetThingsLatestErrorsQuery, GetThingsLatestErrorsQueryVariables>({
			client: client,
			query: GET_THINGS_ERRORS,
			variables: {
				condition: {
					project: $activeProjectId == 'all' ? undefined : $activeProjectId,
					hasError: true
				}
			}
		})
	);

	const allThingsErrorCount = $derived($allThingsErrorsStore.data?.things?.length ?? 0);
</script>

<div>
	<PageTitle title={$_('page.overview.welcome')} />

	<Heading class="text-xl font-normal">
		{$_('page.overview.explanation.part1')}
		<A class="underline" href={projectUrl('all', 'sensors')} data-sveltekit-preload-data="tap">
			{$_('page.overview.explanation.part2')}
		</A>
		{$_('page.overview.explanation.part3')}
		<A class="underline" href={projectUrl('all', 'new')} data-sveltekit-preload-data="tap">
			{$_('page.overview.explanation.part4')}
		</A>
		{#if allThingsErrorCount > 0}
			<Alert class="mt-4 flex w-full items-center border" color="red">
				<HeroiconsExclamationCircle20Solid class="-mr-2 -ml-1" font-size="20" />
				{$_('component.thingsError.overviewAlert', { values: { count: allThingsErrorCount } })}
				<a
					href="./p/all/sensorerrors"
					class="text-red-900 underline dark:text-red-300"
					data-sveltekit-preload-data="tap">{$_('component.thingsError.hyperlink')}!</a
				>
			</Alert>
		{/if}
	</Heading>
</div>

<div class="flex flex-wrap">
	{#each $projectAccess as project (project)}
		<div class="p-0 pe-4 pt-4 sm:w-full md:w-1/2">
			<Card
				class="h-full max-w-full"
				href={projectUrl(project, 'projectoverview')}
				data-sveltekit-preload-data="tap"
			>
				<Heading tag="h4">
					{project}
				</Heading>
			</Card>
		</div>
	{/each}
</div>
