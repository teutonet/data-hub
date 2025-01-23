<script lang="ts">
	import { Card, Heading, P } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';

	interface Props {
		href: string;
		title: string;
		description?: string | null;
	}

	let { href, title, description = null }: Props = $props();
</script>

<div class="p-0 pe-4 pt-4 sm:w-full md:w-1/2">
	<Card class="h-full max-w-full " {href} {title}>
		<Heading tag="h4">{title}</Heading>
		<P>{$_(description ?? '')}</P>
	</Card>
</div>
