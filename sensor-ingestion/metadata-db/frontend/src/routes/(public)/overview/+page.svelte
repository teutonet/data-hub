<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { A, Card, Heading } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import { projectAccess } from '$lib/common/auth';
	import { projectUrl } from '$lib/common/url';
	import { activeProjectId } from '$lib/nav/activeProject';

	activeProjectId.set(undefined);
</script>

<div>
	<PageTitle headingTag="h1" title={$_('page.overview.welcome')} />

	<Heading tag="h3" class="py-8">
		{$_('page.overview.explanation.part1')}
		<A href={projectUrl('all', 'sensors')} data-sveltekit-preload-data="tap">
			{$_('page.overview.explanation.part2')}
		</A>
		{$_('page.overview.explanation.part3')}
		<A href={projectUrl('all', 'new')} data-sveltekit-preload-data="tap">
			{$_('page.overview.explanation.part4')}
		</A>
	</Heading>
</div>

<div class="flex flex-wrap">
	{#each $projectAccess as project}
		<div class="p-0 pe-4 pt-4 sm:w-full md:w-1/2">
			<Card
				class="h-full max-w-full"
				href={projectUrl(project, 'overview')}
				data-sveltekit-preload-data="tap"
			>
				<Heading tag="h4">
					{project}
				</Heading>
			</Card>
		</div>
	{/each}
</div>
