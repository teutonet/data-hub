function makeUrl(deployment: string) {
	return `https://${deployment}${process.env.TARGET_URL_SUFFIX ?? '.data-hub.local'}/`;
}

export const MDB_FRONTEND = makeUrl('mdb-frontend');
export const MDB_GRAPHIQL = makeUrl('mdb');
export const GRAFANA = makeUrl('dashboard');
export const GRAFANA_PUBLIC = makeUrl('dashboard-public');
export const API = makeUrl('api');
export const KEYCLOAK = makeUrl('login');
export const EXPORT = makeUrl('export');
