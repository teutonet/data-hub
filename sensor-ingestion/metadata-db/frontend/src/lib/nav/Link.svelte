<script lang="ts" module>
	export function trimTrailingSlash(s?: string): string | undefined {
		return s?.replace(/(.)\/*$/, '$1');
	}
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { Tooltip } from 'flowbite-svelte';

	interface Props {
		href: string;
		textKey: string;
		disabled?: boolean;
		tooltipKey?: string | undefined;
	}

	let { href, textKey, disabled = false, tooltipKey = undefined }: Props = $props();

	let active = $derived(trimTrailingSlash(href) === trimTrailingSlash(page.url.pathname));

	const disabledClass =
		'flex items-center p-2 text-base font-normal text-gray-400 rounded-lg dark:text-gray-300 pointer-events-none';
	const normalClass =
		'flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700';
	const activeClass =
		'flex items-center p-2 text-base font-normal text-gray-900 bg-gray-200 dark:bg-gray-700 rounded-lg dark:text-white  dark:hover:bg-gray-700';
</script>

<div class="py-[0.15rem]" class:cursor-not-allowed={disabled}>
	<li>
		<a
			class={disabled ? disabledClass : active ? activeClass : normalClass}
			aria-disabled={disabled}
			href={disabled ? undefined : trimTrailingSlash(href)}
		>
			<span>
				{$_(textKey)}
			</span>
		</a>
	</li>
	{#if tooltipKey}
		<Tooltip placement="bottom">{$_(tooltipKey)}</Tooltip>
	{/if}
</div>
