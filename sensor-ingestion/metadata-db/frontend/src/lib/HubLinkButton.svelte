<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';

	export let href: string;
	export let component: string;
</script>

{#if href}
	<Button {href} target="_blank">{$_(`page.hub.links.${component}`)}</Button>
{/if}
