<script lang="ts">
	import { Navbar, NavBrand, NavHamburger, NavUl, NavLi, DarkMode } from 'flowbite-svelte';

	import UserDropdown from '../common/user/UserDropdown.svelte';
	import { _ } from 'svelte-i18n';
	import ActiveProjectSelector from './ActiveProjectSelector.svelte';
	import { isAuthenticated } from '$lib/common/auth';
	import BrandIcon from '~icons/heroicons/circle-stack-solid';
	import { getUserReadableProjects } from '$lib/common/graphql/ressource-api-utils';

	const projects = getUserReadableProjects();
</script>

<Navbar
	fluid
	color="form"
	class="sticky top-0 !z-[39] w-full border-b border-gray-200 bg-white py-1 shadow-xs dark:border-gray-700 dark:bg-gray-800"
>
	<div class="flex">
		<NavBrand href="/">
			<BrandIcon class="me-2" />
			<span class="self-center text-2xl font-bold tracking-tight whitespace-nowrap dark:text-white">
				{$_('component.nav.brand')}
			</span>
		</NavBrand>
	</div>
	<NavHamburger />
	<div class="flex">
		<DarkMode />
		<NavUl
			ulClass="flex flex-col mt-4 md:flex-row md:space-x-4 rtl:space-x-reverse md:mt-0 md:text-sm md:font-medium pe-4"
		>
			{#if $isAuthenticated}
				<NavLi>
					<ActiveProjectSelector autoselectProject={false} projects={$projects} />
				</NavLi>
			{/if}
		</NavUl>
		<UserDropdown />
	</div>
</Navbar>
