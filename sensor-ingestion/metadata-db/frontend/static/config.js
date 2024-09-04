/**
 * @type {import("../src/lib/config").Config}
 */
const config = {
	OIDC_AUTHORITY: 'https://login.data-hub.local/realms/udh',
	OIDC_CLIENT: 'mdb-frontend',
	GRAPHQL_WS_ENDPOINT: 'wss://mdb.si.test/graphql',
	GRAPHQL_HTTP_ENDPOINT: 'https://mdb-frontend.data-hub.local/graphql',
	MDB_URL: '',
	GRAFANA_URL: '',
	FROST_URL: '',
	KEYCLOAK_URL: '',
	JUPYTERHUB_URL: '',
	MDB_GRAPHIQL_URL: '',
	SENTRY_DSN: '',
	API_BASE_URL: ''
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window._env_ = config;
