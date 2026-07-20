<script lang="ts">
	import { logout } from '$lib/common/auth/Auth.svelte';
	import { page } from '$app/stores';
	import UserCircle from '~icons/heroicons/user-circle';
	import { isAuthenticated, profile } from '$lib/common/auth/stores';
	import { Dropdown, DropdownItem, DropdownDivider, Button, P } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';

	function doLogout(): void {
		logout(`https://${$page.url.host}`).catch((e) => {
			console.error(e);
		});
	}
</script>

{#if $isAuthenticated}
	<Button
		class="mt-[.4rem] h-fit w-fit rounded-[100%] border-none p-0"
		outline={true}
		color="light"
		size="xl"
	>
		<span class="">
			<UserCircle class="h-8 w-8 text-gray-800 dark:text-white" />
		</span>
		<span class="sr-only">
			{$_('component.userDropdown.title')}
		</span>
	</Button>
	<Dropdown placement="bottom" class="!position-zero !right-3 z-50 max-w-fit text-right">
		<DropdownItem class="text-right">
			<P>{$profile?.preferred_username}</P>
		</DropdownItem>
		<DropdownDivider />
		<DropdownItem on:click={doLogout} class="text-right">
			{$_('component.userDropdown.logout')}
		</DropdownItem>
	</Dropdown>
{:else}
	<Button href="/auth">{$_('component.userDropdown.login')}</Button>
{/if}
