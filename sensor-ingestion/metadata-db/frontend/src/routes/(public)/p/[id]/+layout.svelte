<script lang="ts">
	import type { LayoutData } from './$types';
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import PageTitle from '$lib/PageTitle.svelte';
	import { getUserReadableProjects } from '$lib/common/graphql/ressource-api-utils';

	interface Props {
		data: LayoutData;
		children?: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	const projects = getUserReadableProjects();

	// TODO: remove `&& $projects.length` again, only required to fix a race condition
	let projectMissing = $derived(
		data.projectId != 'all' && $projects.length && !$projects.includes(data.projectId)
	);
</script>

{#if projectMissing}
	<PageTitle title={$_('page.overview.projectNotFound')} />
	<Button href="/" class="mt-2">
		{$_('page.overview.goToOverview')}
	</Button>
{:else}
	{@render children?.()}
{/if}
