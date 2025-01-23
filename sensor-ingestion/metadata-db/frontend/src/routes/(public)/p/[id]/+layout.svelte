<script lang="ts">
	import type { LayoutData } from './$types';
	import { projectAccess } from '$lib/common/auth';
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import PageTitle from '$lib/PageTitle.svelte';

	interface Props {
		data: LayoutData;
		children?: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();

	let projectMissing = $derived(
		data.projectId != 'all' && !$projectAccess.includes(data.projectId)
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
