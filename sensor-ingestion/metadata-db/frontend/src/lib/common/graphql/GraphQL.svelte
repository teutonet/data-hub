<script lang="ts">
	import { browser } from '$app/environment';
	import { accessToken, isAuthenticated } from '$lib/common/auth';
	import { getConfig } from '$lib/config';
	import { retryExchange } from '@urql/exchange-retry';
	import {
		cacheExchange,
		createClient,
		errorExchange,
		fetchExchange,
		setContextClient,
		subscriptionExchange
	} from '@urql/svelte';
	import { createClient as createWSClient } from 'graphql-ws';
	import { handleCombinedErrors } from './utils';
	import { requestPolicyExchange } from '@urql/exchange-request-policy';

	import * as Sentry from '@sentry/sveltekit';
	import { setContext } from 'svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	if (browser) {
		const wsClient = createWSClient({
			url: getConfig('GRAPHQL_WS_ENDPOINT'),
			connectionParams: () => ({
				// Parameter is not properly document in Postgraphile docs, see source code
				// https://github.com/graphile/postgraphile/blob/601a1086a2c10ebae4747364e199f2517d653861/src/postgraphile/http/subscriptions.ts#L349
				authorization: $isAuthenticated ? `Bearer ${$accessToken}` : ''
			})
		});

		const reqPolicyExchange = requestPolicyExchange({
			// The amount of time in ms that has to go by before upgrading, default is 5 minutes.
			ttl: 60 * 1000, // 1 minute.
			// An optional function that allows you to specify whether an operation should be upgraded.
			shouldUpgrade: (operation) => operation.context.requestPolicy !== 'cache-only'
		});

		const errExchange = errorExchange({
			onError(errors, req) {
				const extra = {
					networkError: errors.networkError,
					graphQLErrors: errors.graphQLErrors.map(
						(e) => `${e.message}, path: ${e.path?.join(',')}`
					),
					requestVariables: JSON.stringify(req.variables)
				};
				Sentry.captureMessage(
					`GraphQL error ${extra.networkError || extra.graphQLErrors.join(', ')}`,
					{
						level: 'error',
						extra
					}
				);
				// we never expect errors on queries so handle all of them here
				if (req.kind === 'query' || req.kind === 'subscription') {
					handleCombinedErrors(errors, { showToasts: true });
				}
			}
		});

		const client = createClient({
			url: getConfig('GRAPHQL_HTTP_ENDPOINT'),
			preferGetMethod: false,
			fetchOptions: () => {
				// Set Auth for Fetch requests (query, mutation)
				return {
					headers: {
						authorization: $isAuthenticated ? `Bearer ${$accessToken}` : ''
					}
				};
			},
			exchanges: [
				reqPolicyExchange,
				cacheExchange,
				errExchange,
				retryExchange({
					maxNumberAttempts: 10,
					maxDelayMs: 10000
				}),
				fetchExchange,
				subscriptionExchange({
					forwardSubscription(request) {
						// Code from https://formidable.com/open-source/urql/docs/advanced/subscriptions/#setting-up-graphql-ws
						const input = { ...request, query: request.query ?? '' };
						return {
							subscribe: (sink) => {
								const dispose = wsClient.subscribe(input, sink);
								return {
									unsubscribe: dispose
								};
							}
						};
					}
				})
			]
		});

		setContextClient(client);

		const resourceApiClient = createClient({
			url: getConfig('RESOURCE_API_GRAPHQL_ENDPOINT'),
			preferGetMethod: false,
			fetchOptions: () => {
				// Set Auth for Fetch requests (query, mutation)
				return {
					headers: {
						authorization: $isAuthenticated ? `Bearer ${$accessToken}` : ''
					}
				};
			},
			exchanges: [
				reqPolicyExchange,
				cacheExchange,
				errExchange,
				retryExchange({
					maxNumberAttempts: 10,
					maxDelayMs: 10000
				}),
				fetchExchange
			]
		});

		setContext('resourceApiGraphql', resourceApiClient);
	}
</script>

{@render children?.()}
