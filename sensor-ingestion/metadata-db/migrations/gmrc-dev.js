function enc(s) {
	return encodeURIComponent(s);
}

const host = enc(process.env.PGHOST || 'localhost');
const user = enc(process.env.PGUSER || 'postgres');
const password = enc(process.env.PGPASSWORD || 'postgres');
const db = enc(process.env.PGDATABASE || 'postgres');

module.exports = {
	connectionString: `postgres://${user}:${password}@${host}:5432/${db}`,
	shadowConnectionString: `postgres://${user}:${password}@${host}:5432/shadow`,
	rootConnectionString: `postgres://${user}:${password}@${host}:5432/template1`,
	beforeAllMigrations: ['dev-user.sql'],
	afterAllMigrations: ['test-data.sql'],
	blankMigrationContent: ''
};
