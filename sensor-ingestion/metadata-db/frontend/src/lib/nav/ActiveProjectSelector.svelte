<script lang="ts">
	import { projectUrl } from '$lib/common/url';
	import { Dropdown, DropdownItem, DropdownDivider } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import ChevronDownIcon from '~icons/heroicons/chevron-down';
	import { activeProjectId } from '$lib/nav/activeProject';
	import { projectAccess } from '$lib/common/auth';

	export let autoselectProject = true;

	//TODO: Show project name instead of ID
	$: {
		if ($projectAccess.length === 1 && autoselectProject) {
			activeProjectId.set($projectAccess[0]);
		}
		autoselectProject = $projectAccess.length === 0;
	}
</script>

<div class="py-[0.15rem]">
	<div
		class="flex flex-row items-center gap-2 rounded-lg p-2 text-base font-normal text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
	>
		{#if !$activeProjectId}
			{$_('component.activeProjectSelector.select')}
		{:else}
			{$activeProjectId === 'all'
				? $_('component.nav.allProjects')
				: $_('component.activeProjectSelector.projectName', { values: { name: $activeProjectId } })}
		{/if}

		<ChevronDownIcon />
	</div>
</div>

<Dropdown>
	<DropdownItem href={projectUrl('all', 'overview')} data-sveltekit-preload-data="tap">
		{$_('component.nav.allProjects')}
	</DropdownItem>
	{#if $projectAccess.length}
		<DropdownDivider />
	{/if}
	{#each $projectAccess as project, i}
		<DropdownItem href={projectUrl(project, 'overview')} data-sveltekit-preload-data="tap">
			{project}
		</DropdownItem>
		{#if i != $projectAccess.length - 1}
			<DropdownDivider />
		{/if}
	{/each}
</Dropdown>
