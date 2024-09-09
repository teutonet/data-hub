<script lang="ts">
	import type { LayoutData } from './$types';
	import { projectAccess } from '$lib/common/auth';
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import PageTitle from '$lib/PageTitle.svelte';

	export let data: LayoutData;

	$: projectMissing = data.projectId != 'all' && !$projectAccess.includes(data.projectId);
</script>

{#if projectMissing}
	<PageTitle title={$_('page.overview.projectNotFound')} />
	<Button href="/" class="mt-2">
		{$_('page.overview.goToOverview')}
	</Button>
{:else}
	<slot />
{/if}
