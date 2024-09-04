<script lang="ts">
	import { Navbar, NavBrand, NavHamburger, NavUl, NavLi, DarkMode } from 'flowbite-svelte';
	import Link from './Link.svelte';
	import UserDropdown from '../common/user/UserDropdown.svelte';

	import { _ } from 'svelte-i18n';
	import { activeProjectId } from './activeProject';
	import { projectUrl } from '$lib/common/url';
	import ActiveProjectSelector from './ActiveProjectSelector.svelte';
	import { isAuthenticated } from '$lib/common/auth';
</script>

<Navbar
	fluid
	color="form"
	class="fixed top-0 !z-[39] w-full border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
>
	<div class="flex">
		<NavBrand href="/overview">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="h-10 w-10"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
				/>
			</svg>
			<span class="self-center whitespace-nowrap text-2xl font-semibold dark:text-white">
				{$_('component.nav.brand')}
			</span>
		</NavBrand>
		<DarkMode />
	</div>
	<NavHamburger />
	<div class="flex">
		<NavUl
			ulClass="flex flex-col mt-4 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:text-sm md:font-medium pe-4"
		>
			{#if $isAuthenticated}
				<NavLi>
					<ActiveProjectSelector autoselectProject={false} />
				</NavLi>
			{/if}
			<NavLi>
				<Link
					href={$activeProjectId ? projectUrl($activeProjectId, 'overview') : '#'}
					textKey={$_('component.nav.overview')}
					disabled={!$activeProjectId}
				/>
			</NavLi>
			<NavLi>
				<Link
					href={$activeProjectId ? projectUrl($activeProjectId, 'new') : '#'}
					textKey={$_('component.nav.newSensors')}
					disabled={!$activeProjectId}
				/>
			</NavLi>
			<NavLi>
				<Link
					href={$activeProjectId ? projectUrl($activeProjectId, 'sensors') : '#'}
					textKey={$_('component.nav.sensors')}
					disabled={!$activeProjectId}
				/>
			</NavLi>
			<NavLi>
				<Link
					href={$activeProjectId ? projectUrl($activeProjectId, 'sensortypes') : '#'}
					textKey={$_('component.nav.sensortypes')}
					disabled={!$activeProjectId}
				/>
			</NavLi>
			<NavLi>
				<Link
					href={$activeProjectId ? projectUrl($activeProjectId, 'properties') : '#'}
					textKey={$_('component.nav.properties')}
					disabled={!$activeProjectId}
				/>
			</NavLi>
		</NavUl>
		<UserDropdown />
	</div>
</Navbar>
