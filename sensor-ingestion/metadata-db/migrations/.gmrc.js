function enc(s) {
	return encodeURIComponent(s);
}

const host = enc(process.env.PGHOST || 'localhost');
const user = enc(process.env.PGUSER || 'postgres');
const password = enc(process.env.PGPASSWORD || 'postgres');
const db = enc(process.env.PGDATABASE || 'postgres');
const sslmode = process.env.PGSSLMODE || 'no-verify';

module.exports = {
	connectionString: `postgres://${user}:${password}@${host}:5432/${db}?sslmode=${sslmode}`
};
