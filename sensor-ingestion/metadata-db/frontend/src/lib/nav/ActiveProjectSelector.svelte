<script lang="ts">
	import { projectUrl } from '$lib/common/url';
	import { Dropdown, DropdownItem, DropdownDivider, Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import ChevronDownIcon from '~icons/heroicons/chevron-down';
	import InfoIcon from '~icons/heroicons/information-circle';
	import { activeProjectId, getMode, SelectMode } from '$lib/nav/activeProject';
	import { getProjectsWithBucketPermissions } from '$lib/common/graphql/ressource-api-utils';
	import { page } from '$app/state';
	import { twMerge } from 'tailwind-merge';
	import { Tooltip } from 'flowbite-svelte';
	import { goto } from '$app/navigation';

	const allProjectModeClass =
		'hover:bg-primary-100 text-primary-900 dark:text-primary-300 dark:bg-transparent dark:bg-gray-700 bg-primary-50 border dark:border-primary-500 border-primary-400 dark:border-1';
	const singleProjectModeClass =
		'hover:bg-complementary-100 text-complementary-900 dark:text-complementary-300 dark:bg-transparent dark:bg-gray-700 bg-complementary-50 border dark:border-complementary-400 border-complementary-300 dark:border-1';

	interface Props {
		autoselectProject?: boolean;
		projects?: string[];
	}
	const isApiRoute = $derived(page.url.pathname.startsWith('/api'));
	let { autoselectProject = $bindable(true), projects = [] }: Props = $props();

	const bucketPermissions = $derived(getProjectsWithBucketPermissions());

	//TODO: Show project name instead of ID
	$effect(() => {
		if (projects.length === 1 && autoselectProject) {
			activeProjectId.set(projects[0]);
		}
		autoselectProject = projects.length === 0;
	});

	function getUrl(project: string) {
		if (
			$bucketPermissions.some((p) => p.project === project) &&
			page.url.pathname.split('/')[3] === 's3-explorer'
		) {
			return projectUrl(project, 's3-explorer');
		} else {
			return projectUrl(project, 'projectoverview');
		}
	}

	const dropdownContainerClass = 'min-w-50 searchDropdown divide-y z-[99]';
	const dropdownClass =
		'py-0 z-50 !transform-none !left-0 !top-12 min-w-full searchDropdown overflow-y-auto max-h-80';
	const baseButtonClass =
		'dark:text-white text-base font-normal hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent';
	let dropdownOpen = $state(false);
	function getSelectorBtnCss(isApiRoute: boolean) {
		let modeClass = '';

		if (!isApiRoute) {
			modeClass =
				getMode($activeProjectId) === SelectMode.Global
					? allProjectModeClass
					: singleProjectModeClass;
		}
		return twMerge(baseButtonClass, modeClass);
	}
</script>

<div class="float-left">
	<Button color="none" id="activeProjectButton" class={getSelectorBtnCss(isApiRoute)}>
		<div class="align-items flex flex-row items-center gap-2">
			{#if !isApiRoute}
				<InfoIcon class="h-5 w-5" />
			{/if}
			<div>
				{$activeProjectId === 'all'
					? $_('component.nav.allProjects')
					: $_('component.activeProjectSelector.projectName', {
							values: { name: $activeProjectId }
						})}
			</div>
		</div>
		<ChevronDownIcon class="ml-2" />
	</Button>
	{#if !dropdownOpen && !isApiRoute}
		<Tooltip triggeredBy="#activeProjectButton" placement="bottom">
			{$_(
				`component.activeProjectSelector.${$activeProjectId === 'all' ? 'globalMode' : 'projectMode'}`
			)}
		</Tooltip>
	{/if}
	<Dropdown containerClass={dropdownContainerClass} class={dropdownClass} bind:open={dropdownOpen}>
		<DropdownItem
			data-sveltekit-preload-data="tap"
			on:click={() => {
				dropdownOpen = false;
				goto(getUrl('all'));
			}}
		>
			{$_('component.nav.allProjects')}
		</DropdownItem>
		{#if projects.length}
			<DropdownDivider />
		{/if}
		{#each projects as project, i (project)}
			<DropdownItem
				data-sveltekit-preload-data="tap"
				on:click={() => {
					dropdownOpen = false;
					goto(getUrl(project));
				}}
			>
				{project}
			</DropdownItem>
			{#if i != projects.length - 1}
				<DropdownDivider />
			{/if}
		{/each}
	</Dropdown>
</div>
