<script lang="ts">
	import { page } from '$app/state';
	import Auth from '$lib/common/auth/Auth.svelte';
	import { getConfig } from '$lib/config';
	import GraphQL from '$lib/common/graphql/GraphQL.svelte';
	import { isAuthenticated } from '$lib/common/auth';
	import Nav from '$lib/nav/Nav.svelte';
	interface Props {
		children?: import('svelte').Snippet;
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
		<Nav />
		<div class="flex flex-col justify-center p-40 pb-10">
			{@render children?.()}
		</div>
	</GraphQL>
{/if}
