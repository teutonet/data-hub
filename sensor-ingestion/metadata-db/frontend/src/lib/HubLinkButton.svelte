<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';

	interface Props {
		href: string;
		component: string;
	}

	let { href, component }: Props = $props();
</script>

{#if href}
	<Button {href} target="_blank">{$_(`page.hub.links.${component}`)}</Button>
{/if}
