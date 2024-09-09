<script context="module" lang="ts">
	import { goto } from '$app/navigation';
	import { UserManager, type UserManagerSettings } from 'oidc-client-ts';
	import {
		accessToken,
		errorMessage,
		isAuthenticated,
		profile,
		type ExtendedTokenClaims
	} from '$lib/common/auth/stores';

	let userManager: UserManager | null = null;

	type RedirectState =
		| {
				pathname?: string;
				search?: string;
		  }
		| null
		| undefined;

	function setupEventHandlers(userManager: UserManager) {
		userManager.events.addUserLoaded((user) => {
			// Triggered by initial login and silent refresh
			isAuthenticated.set(true);
			profile.set(user.profile as ExtendedTokenClaims);
			accessToken.set(user.access_token);
		});

		userManager.events.addSilentRenewError((error) => {
			isAuthenticated.set(false);
			accessToken.set('');
			errorMessage.set({
				msgKey: 'auth.silentRenewError',
				srcMsg: error.message
			});
			startLogin(); // currently we lose all user input anyway, might as well redirect to Keycloak instead of displaying a cryptic message
		});

		userManager.events.addUserSignedOut(() => {
			isAuthenticated.set(false);
			accessToken.set('');
			startLogin();
		});
	}

	/**
	 * login executes a silent login and if that fails redirects the user to Keycloak
	 */
	async function login(userManager: UserManager, redirect: boolean) {
		try {
			await userManager.signinSilent();
		} catch (e) {
			// Silent Signin is not possible, redirect user to login page
			if (redirect) {
				// Current href is saved so users can be returned to this page after
				// authenticating. UserManager saves this in LocalStorage.
				const state: RedirectState = {
					pathname: window.location.pathname,
					search: window.location.search
				};

				// hack to not go into infinite redirect mode on firefox on prod
				// chrome works fine because of some bullshit with what cookies are set on the silent refresh call in the iframe
				if (!get(isAuthenticated)) {
					await userManager.signinRedirect({
						state
					});
				}
			}
		}
	}

	/**
	 * handleInit takes care of the different callback/initialization scenarios
	 *   - Callback from successful login
	 *   - Callback from unsuccessful login
	 *   - Initial navigation to page (-> Login)
	 *
	 * We need to function wrapper to work asynchronously with the oidc-client-ts
	 * functions.
	 */
	async function handleInit(userManager: UserManager, redirect: boolean) {
		if (window.location.pathname.startsWith('/auth/silent')) {
			// current context is hidden iframe used for silent signin
			return await userManager.signinSilentCallback();
		}

		const params = new URLSearchParams(window.location.search);
		// Parameters are used in Login callback
		if (params.has('code') && params.has('state') && params.has('session_state')) {
			// Auth Callback
			try {
				const res = await userManager.signinCallback();

				if (res) {
					// Cleanup stale data in LocalStorage
					await userManager.clearStaleState();

					// If no res is returned, callback was for silent iframe login
					// and there is no need to redirect user to previous page, because
					// main frame never left the page.
					if (redirect) {
						const state = res.state as RedirectState;
						let href = state?.pathname ? `${state.pathname}${state.search ?? ''}` : '/';

						// Access Token is set in userLoaded event handler
						await goto(href, { replaceState: true });
					}
				}
			} catch (err) {
				errorMessage.set({
					msgKey: 'auth.loginError',
					srcMsg: err
				});
			}
		} else if (params.has('error')) {
			console.error(
				'Auth: Login could not be finished successfully:',
				params.get('error'),
				params.get('error_description')
			);
			errorMessage.set({
				msgKey: 'auth.loginError',
				srcMsg: params.get('error') ?? ''
			});
		} else {
			await login(userManager, redirect);
		}
	}

	/**
	 * Get a new access token from Keycloak. Might be necessary if details in the
	 * token have changed (e.g. list of authorized customers and/or roles).
	 */
	export async function refreshAccessToken(): Promise<void> {
		if (userManager === null) {
			throw new Error('UserManagerNotInitialized');
		} else {
			await userManager.signinSilent();
		}
	}

	/**
	 * logout redirects the user to the keycloak logout endpoint and then back
	 * to the specified uri
	 */
	export async function logout(_returnUri: string): Promise<void> {
		if (userManager === null) {
			throw new Error('UserManagerNotInitialized');
		} else {
			await userManager.signoutRedirect();
		}
	}

	function startLogin(redirect = true) {
		if (userManager) {
			// Handle different auth callbacks
			handleInit(userManager, redirect).catch(() => {
				// handleInit checks errors internally
			});
			return true;
		} else return false;
	}
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import { InMemoryWebStorage, WebStorageStateStore } from 'oidc-client-ts';
	import { get } from 'svelte/store';

	// Props
	export let settings: Pick<
		UserManagerSettings,
		'authority' | 'client_id' | 'redirect_uri' | 'silent_redirect_uri'
	>;

	export let redirect = true;

	if (browser) {
		userManager = new UserManager({
			...settings,
			// eslint-disable-next-line camelcase
			response_type: 'code',
			scope: 'openid profile data-hub',

			// Automatically sets a timer to refresh access token 60 seconds before
			// expiration. Triggers `UserLoaded` event and we can update our copy of
			// the access token.
			automaticSilentRenew: true,

			// Disable filtering of claims. We need this to also have the issuer in the user profile.
			filterProtocolClaims: false,

			// By default oidc-client-ts saves all user data (profile, access+refresh+id
			// tokens) to SessionStorage (see WebStorageStateStore.ts in source code).
			// This is not secure, as it allows other (potentially malicous) running
			// code in the context website context to access those credentials.
			// The InMemoryWebStorage only saves the data to a local Map.
			// This has the disadvantage that we have to generate new tokens on every
			// browser navigation, but as long as the Keycloak cookie is still set,
			// we can do this silently and the user does not even see a redirect.
			userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() })
		});

		// Setup event handlers when userManager is initialized
		setupEventHandlers(userManager);

		startLogin(redirect);
	}
</script>
