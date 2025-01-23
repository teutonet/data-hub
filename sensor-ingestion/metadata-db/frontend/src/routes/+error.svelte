<script lang="ts">
	import { Heading, P } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';

	let errMsg = $derived(
		page.status === 404 ? `Not found: ${page.url.pathname}` : (page.error?.message ?? '')
	);
</script>

<div class="flex h-screen items-center justify-center">
	<div class="flex flex-col">
		<Heading>{page.status}</Heading>
		<P><pre>{errMsg}</pre></P>
	</div>
</div>
