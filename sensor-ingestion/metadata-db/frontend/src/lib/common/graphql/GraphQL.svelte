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

	if (browser) {
		const wsClient = createWSClient({
			url: getConfig('GRAPHQL_WS_ENDPOINT'),
			connectionParams: () => ({
				// Parameter is not properly document in Postgraphile docs, see source code
				// https://github.com/graphile/postgraphile/blob/601a1086a2c10ebae4747364e199f2517d653861/src/postgraphile/http/subscriptions.ts#L349
				authorization: $isAuthenticated ? `Bearer ${$accessToken}` : ''
			})
		});

		const client = createClient({
			url: getConfig('GRAPHQL_HTTP_ENDPOINT'),
			fetchOptions: () => {
				// Set Auth for Fetch requests (query, mutation)
				return {
					headers: {
						authorization: $isAuthenticated ? `Bearer ${$accessToken}` : ''
					}
				};
			},
			exchanges: [
				requestPolicyExchange({
					// The amount of time in ms that has to go by before upgrading, default is 5 minutes.
					ttl: 60 * 1000, // 1 minute.
					// An optional function that allows you to specify whether an operation should be upgraded.
					shouldUpgrade: (operation) => operation.context.requestPolicy !== 'cache-only'
				}),
				cacheExchange,
				errorExchange({
					onError(errors, req) {
						Sentry.captureMessage('GraphQL error', {
							level: 'error',
							extra: {
								networkError: errors.networkError,
								graphQLErrors: errors.graphQLErrors.map(
									(e) => `${e.message}, path: ${e.path?.join(',')}`
								),
								requestVariables: JSON.stringify(req.variables)
							}
						});
						// we never expect errors on queries so handle all of them here
						if (req.kind === 'query' || req.kind === 'subscription') {
							handleCombinedErrors(errors, { showToasts: true });
						}
					}
				}),
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
	}
</script>

<slot />
