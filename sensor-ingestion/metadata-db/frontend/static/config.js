/**
 * @type {import("../src/lib/config").Config}
 */
const config = {
	OIDC_AUTHORITY: 'https://login.data-hub.local/realms/udh',
	OIDC_CLIENT: 'mdb-frontend',
	GRAPHQL_WS_ENDPOINT: 'wss://mdb.si.test/graphql',
	GRAPHQL_HTTP_ENDPOINT: 'https://mdb-frontend.data-hub.local/graphql',
	MDB_URL: '',
	GRAFANA_URL: 'https://dashboard.data-hub.local',
	FROST_URL: '',
	KEYCLOAK_URL: 'https://login.data-hub.local/admin/udh/console',
	JUPYTERHUB_URL: 'https://jupyterhub.data-hub.local',
	MDB_GRAPHIQL_URL: 'https://mdb.data-hub.local',
	SENTRY_DSN: '',
	API_BASE_URL: 'https://api.data-hub.local/api/v1/sensordata',
	STORAGE_URL: 'https://storage.data-hub.local',
	DOCS_URL: 'https://docs.data-hub.local',
	RESOURCE_API_GRAPHQL_ENDPOINT: 'https://login.data-hub.local/realms/udh/data-hub/graphql'
};

// eslint-disable-next-line no-undef
window._env_ = config;
