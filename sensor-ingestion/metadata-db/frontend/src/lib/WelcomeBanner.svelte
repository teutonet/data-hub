<script lang="ts">
	import { Heading, P } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
</script>

<div>
	<Heading>{$_('component.welcomeBanner.heading')}</Heading>
	<P>{$_('component.welcomeBanner.description')}</P>
</div>
