import express from 'express';
import helmet from 'helmet';
import { postgraphile, withPostGraphileContext } from 'postgraphile';
import { graphql, GraphQLSchema } from 'graphql';
import getPostgraphileConfig from './options';
import { auth } from 'express-oauth2-jwt-bearer';
import { Pool } from 'pg';

const isDevLocal = !!process.env.DEV_LOCAL;

console.log(isDevLocal ? 'starting DEVELOPMENT server!' : 'starting production server');

const app = express();
app.use(helmet());

const { connectionString, schema, options } = getPostgraphileConfig(isDevLocal);
const pool = new Pool({ connectionString });
const middleware = postgraphile(pool, schema, options);

if (!isDevLocal) {
	app.use(
		'/graphql',
		auth({
			audience: process.env.AUTH_AUDIENCE,
			issuerBaseURL: process.env.AUTH_ISSUER
		})
	);
}

app.get('/livez', (_req, res) => {
	res.send('I am alive.');
});

async function executeTestQuery(pgPool: any, schema: GraphQLSchema) {
	let result = await withPostGraphileContext(
		{ pgPool, pgSettings: { 'jwt.claims.projects': '[]' } },
		async (context) =>
			await graphql(schema, 'query { things { deveui } }', null, { ...context }, {}, null)
	);
	return result.data?.things?.length === 0;
}
app.get('/readyz', async (_req, resp) => {
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
	if (ready) {
		resp.send('READY');
	} else {
		resp.status(503).send('NOT READY');
	}
});

app.use(middleware);

const server = app.listen(5000, isDevLocal ? 'localhost' : '0.0.0.0');

const terminator = require('lil-http-terminator')({ server });

function handleShutdown(signal: 'SIGINT' | 'SIGTERM' | 'SIGHUP') {
	const code = {
		SIGHUP: 1,
		SIGINT: 2,
		SIGTERM: 15
	}[signal];
	console.log('Received', signal, ', shutting down');
	if (!server.listening) process.exit(128 + code);
	terminator
		.terminate()
		.catch((err: any) => console.error(err))
		.finally(() => {
			process.exit(128 + code);
		});
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
process.on('SIGHUP', handleShutdown);
