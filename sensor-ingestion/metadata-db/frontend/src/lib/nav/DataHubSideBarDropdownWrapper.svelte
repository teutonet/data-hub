<script lang="ts">
	import { SidebarDropdownWrapper } from 'flowbite-svelte';
	import type { Component, Snippet } from 'svelte';
	import { activeProjectId, getMode, SelectMode } from './activeProject';
	const allProjectColor = 'var(--theme-color-primary-600)';
	const singleProjectColor = 'var(--theme-color-complementary-400)';

	interface Props {
		isProjectmodeSpecific: boolean;
		label: string;
		children: Snippet;
		Icon: Component;
		minimized?: boolean;
	}

	let {
		isProjectmodeSpecific = false,
		label,
		children,
		Icon,
		minimized = $bindable()
	}: Props = $props();
	let open: boolean = $state(false);

	function toggle() {
		if (minimized) {
			minimized = false;
			open = true;
		} else {
			open = !open;
		}
	}
</script>

{#if minimized}
	<li>
		<button
			class={`${isProjectmodeSpecific ? 'project-indicator' : ''} flex w-full rounded-lg text-base font-normal text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700`}
			onclick={toggle}
			style={`--project-color: ${getMode($activeProjectId) == SelectMode.Global ? allProjectColor : singleProjectColor}`}
		>
			{#if Icon}
				<Icon class="m-2" />
			{/if}
		</button>
	</li>
{:else}
	<SidebarDropdownWrapper
		on:click={toggle}
		class={`relative ${isProjectmodeSpecific ? 'project-indicator' : ''}`}
		style={`--project-color: ${getMode($activeProjectId) == SelectMode.Global ? allProjectColor : singleProjectColor}`}
		spanClass="flex-1 text-left whitespace-nowrap"
		ulClass="[&>*]:m-3 [&>*]:ms-8 rounded-xl p-0 my-2 min-w-none"
		label={minimized ? '' : label}
		isOpen={open}
	>
		<span slot="icon">
			{#if Icon}
				<Icon class="me-3" />
			{/if}
		</span>
		{#if children}
			{@render children()}
		{/if}
	</SidebarDropdownWrapper>
{/if}
