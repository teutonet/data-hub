<script lang="ts">
	import { page } from '$app/state';
	import GraphQL from '$lib/common/graphql/GraphQL.svelte';
	import Nav from '$lib/nav/Nav.svelte';
	import Auth from '$lib/common/auth/Auth.svelte';
	import { getConfig } from '$lib/config';
	import { _ } from 'svelte-i18n';
	import DataHubSidebar from '$lib/nav/DataHubSidebar.svelte';
	import type { Snippet } from 'svelte';
	import { isAuthenticated } from '$lib/common/auth';
	import UserProjectPermissions from '$lib/permissions/UserProjectPermissions.svelte';
	interface Props {
		children: Snippet;
	}
	let { children }: Props = $props();
</script>

<Auth
	settings={{
		authority: getConfig('OIDC_AUTHORITY'),
		// eslint-disable-next-line camelcase
		client_id: getConfig('OIDC_CLIENT'),
		// eslint-disable-next-line camelcase,
		redirect_uri: `${page.url.protocol}//${page.url.host}/auth/`,
		// eslint-disable-next-line camelcase,
		silent_redirect_uri: `${page.url.protocol}//${page.url.host}/auth/silent/`
	}}
/>
{#if $isAuthenticated}
	<GraphQL>
		<UserProjectPermissions>
			<Nav />
			<DataHubSidebar>
				{@render children()}
			</DataHubSidebar>
		</UserProjectPermissions>
	</GraphQL>
{/if}
