<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { Button } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
</script>

<PageTitle title={$_('page.apiRoot.title')} />

<Button href="api/tenants">
	{$_('page.apiRoot.tenantsLink')}
</Button>
