<script lang="ts">
	import { SidebarItem } from 'flowbite-svelte';
	import type { Component, Snippet } from 'svelte';
	import ExternalLinkIcon from '~icons/heroicons/arrow-top-right-on-square';
	import { _ } from 'svelte-i18n';
	import { twMerge } from 'tailwind-merge';
	import { activeProjectId, getMode, SelectMode } from './nav/activeProject';

	const allProjectColor = 'var(--theme-color-primary-600)';
	const singleProjectColor = 'var(--theme-color-complementary-400)';

	interface Props {
		isProjectmodeSpecific?: boolean;
		href?: string;
		label: string;
		disabled?: boolean;
		minimized?: boolean;
		preload?: 'off' | 'tap' | 'hover' | undefined;
		children?: Snippet;
		Icon?: Component;
		externalLink?: boolean;
		target?: string;
	}
	let {
		isProjectmodeSpecific = false,
		href,
		label,
		disabled = false,
		preload = 'hover',
		children,
		Icon,
		externalLink = false,
		minimized = false,
		target
	}: Props = $props();

	let disabledClass = 'opacity-50 cursor-not-allowed';
	const isDisabled = $derived(disabled || !href);

	function getItemCss() {
		return twMerge(
			minimized ? 'sidebar-item' : '',
			isDisabled ? disabledClass : '',
			isProjectmodeSpecific ? 'project-indicator' : ''
		);
	}
</script>

<SidebarItem
	class={getItemCss()}
	style={`--project-color: ${getMode($activeProjectId) == SelectMode.Global ? allProjectColor : singleProjectColor}`}
	label={minimized ? '' : label}
	data-sveltekit-preload-data={preload}
	{target}
	href={isDisabled ? undefined : href}
	aria-disabled={isDisabled}
>
	<span slot="icon">
		{#if Icon}
			<Icon class={minimized ? '' : 'me-3'} />
		{/if}
	</span>
	<span slot="subtext">
		{#if children}
			{@render children()}
		{/if}
		{#if externalLink && !minimized}
			<ExternalLinkIcon class="ms-1" />
		{/if}
	</span>
</SidebarItem>

<style>
	:global(.sidebar-item > span[slot='icon']) {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	}
</style>
