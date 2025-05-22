<script lang="ts">
	import { projectUrl } from '$lib/common/url';
	import { Dropdown, DropdownItem, DropdownDivider, Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import ChevronDownIcon from '~icons/heroicons/chevron-down';
	import { activeProjectId } from '$lib/nav/activeProject';
	import { projectAccess } from '$lib/common/auth';

	interface Props {
		autoselectProject?: boolean;
	}

	let { autoselectProject = $bindable(true) }: Props = $props();

	//TODO: Show project name instead of ID
	$effect(() => {
		if ($projectAccess.length === 1 && autoselectProject) {
			activeProjectId.set($projectAccess[0]);
		}
		autoselectProject = $projectAccess.length === 0;
	});

	const dropdownContainerClass = 'min-w-50 searchDropdown divide-y z-[99]';
	const dropdownClass =
		'py-0 z-50 !transform-none !left-0 !top-12 min-w-full searchDropdown overflow-y-auto max-h-80';

	let dropdownOpen = $state(false);
</script>

<div class="float-left">
	<Button
		color="none"
		id="activeProjectButton"
		class="text-base font-normal text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
	>
		<div class="align-items begin flex flex-col">
			<div>
				{#if !$activeProjectId}
					{$_('component.activeProjectSelector.select')}
				{:else}
					{$activeProjectId === 'all'
						? $_('component.nav.allProjects')
						: $_('component.activeProjectSelector.projectName', {
								values: { name: $activeProjectId }
							})}
				{/if}
			</div>
		</div>
		<ChevronDownIcon class="ml-2" />
	</Button>
	<Dropdown containerClass={dropdownContainerClass} class={dropdownClass} bind:open={dropdownOpen}>
		<DropdownItem
			href={projectUrl('all', 'overview')}
			data-sveltekit-preload-data="tap"
			on:click={() => (dropdownOpen = false)}
		>
			{$_('component.nav.allProjects')}
		</DropdownItem>
		{#if $projectAccess.length}
			<DropdownDivider />
		{/if}
		{#each $projectAccess as project, i (project)}
			<DropdownItem
				href={projectUrl(project, 'overview')}
				data-sveltekit-preload-data="tap"
				on:click={() => (dropdownOpen = false)}
			>
				{project}
			</DropdownItem>
			{#if i != $projectAccess.length - 1}
				<DropdownDivider />
			{/if}
		{/each}
	</Dropdown>
</div>
