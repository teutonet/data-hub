import { browser } from '$app/environment';
export interface Config {
	GRAFANA_URL: string;
	MDB_URL: string;
	FROST_URL: string;
	OIDC_AUTHORITY: string;
	OIDC_CLIENT: string;
	GRAPHQL_WS_ENDPOINT: string;
	GRAPHQL_HTTP_ENDPOINT: string;
	KEYCLOAK_URL: string;
	JUPYTERHUB_URL: string;
	MDB_GRAPHIQL_URL: string;
	SENTRY_DSN: string;
	API_BASE_URL: string;
}

const DUMMY_CONFIG: Config = {
	GRAFANA_URL: '',
	MDB_URL: '',
	FROST_URL: '',
	OIDC_AUTHORITY: '',
	OIDC_CLIENT: '',
	GRAPHQL_WS_ENDPOINT: '',
	GRAPHQL_HTTP_ENDPOINT: '',
	KEYCLOAK_URL: '',
	JUPYTERHUB_URL: '',
	MDB_GRAPHIQL_URL: '',
	SENTRY_DSN: '',
	API_BASE_URL: ''
};

export function getConfig<K extends keyof Config>(key: K): Config[K] {
	// We can not directly export the configuration keys because `window` is not
	// defined during the build process and all imports must be explicitly
	// resolvable at that time.
	// By having a wrapper function we defer accessing `window` until the values
	// are actually used.
	if (browser) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		return (window._env_ as Config)[key];
	} else {
		return DUMMY_CONFIG[key];
	}
}
