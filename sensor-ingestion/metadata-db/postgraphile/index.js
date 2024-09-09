import express from 'express';
import helmet from 'helmet';
import pkg from 'pg';
const { Pool } = pkg;
import { postgraphile, withPostGraphileContext } from 'postgraphile';
import { graphql } from 'graphql';
import getPostgraphileConfig from './options.js';
import { auth } from 'express-oauth2-jwt-bearer';
import { Agent } from 'https';

const isDevLocal = !!process.env.DEV_LOCAL;

console.log(isDevLocal ? 'starting DEVELOPMENT server!' : 'starting production server');

const app = express();
app.use(helmet());

if (!isDevLocal)
	app.use(
		'/graphql',
		auth({
			audience: process.env.AUTH_AUDIENCE,
			issuerBaseURL: process.env.AUTH_ISSUER
		})
	);

app.get('/livez', (_req, res) => {
	res.send('I am alive.');
});

function executeTestQuery(pgPool, schema) {
	return withPostGraphileContext(
		{ pgPool, pgSettings: { 'jwt.claims.projects': '[]' } },
		async (context) =>
			(await graphql(schema, 'query { things { deveui } }', null, { ...context }, {}, null)).data
				.things.length === 0
	);
}

const { poolConfig, schema, options } = getPostgraphileConfig(isDevLocal);
const pool = new Pool({ connectionString: poolConfig });
const middleware = postgraphile(poolConfig, schema, options);
app.use(middleware);

app.get('/readyz', async (req, res) => {
	const ready = await Promise.race([
		new Promise((resolve) => setTimeout(() => resolve(false), 1000)),
		middleware
			.getGraphQLSchema()
			.then((schema) => executeTestQuery(pool, schema))
			.catch((e) => {
				console.log(e);
				return false;
			})
	]);
	if (ready) res.send('READY');
	else res.status(503).send('NOT READY');
});

const server = app.listen(5000, isDevLocal ? 'localhost' : '0.0.0.0');

process.on('SIGTERM', () => server.close(() => process.exit(143)));
