function enc(s) {
	return encodeURIComponent(s);
}

const host = enc(process.env.PGHOST || 'local-udh-platform-postgres.udh');
const port = enc(process.env.PGPORT || '5432');
const user = enc(process.env.PGUSER || 'postgres');
const password = enc(process.env.PGPASSWORD || 'postgres');
const db = enc(process.env.PGDATABASE || 'mdb');

module.exports = {
	connectionString: `postgres://${user}:${password}@${host}:${port}/${db}?sslmode=no-verify`,
	shadowConnectionString: `postgres://${user}:${password}@${host}:${port}/${db}_shadow?sslmode=no-verify`,
	rootConnectionString: `postgres://${user}:${password}@${host}:${port}/template1?sslmode=no-verify`,
	beforeAllMigrations: ['dev-user.sql'],
	afterAllMigrations: ['test-data.sql'],
	afterReset: ['init/02_extensions.sql'],
	blankMigrationContent: ''
};
