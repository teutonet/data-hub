<script lang="ts">
	import HubLinkButton from '$lib/HubLinkButton.svelte';
	import PageTitle from '$lib/PageTitle.svelte';
	import { getConfig } from '$lib/config';
	import { Card, P, DarkMode } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
</script>

<div class="flex justify-center">
	<div class="flex flex-col justify-center pt-40">
		<PageTitle title={$_('page.hub.welcome')} />

		<Card class="mt-10 max-w-full gap-4">
			<P class="text-center">{$_('page.hub.navigation')}</P>
			<HubLinkButton href={getConfig('KEYCLOAK_URL')} component="keycloak" />
			<HubLinkButton href={getConfig('GRAFANA_URL')} component="grafana" />
			<HubLinkButton href={getConfig('JUPYTERHUB_URL')} component="jupyterhub" />
			<HubLinkButton href="/overview" component="mdb" />
			<HubLinkButton href={getConfig('MDB_GRAPHIQL_URL')} component="mdbGraphiql" />
			<HubLinkButton href="/api/tenants" component="authApi" />
		</Card>
	</div>
</div>
<DarkMode />
