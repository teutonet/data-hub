import express from 'express';
import helmet from 'helmet';
import { makeSchema, postgraphile } from 'postgraphile';
import { grafserv } from 'postgraphile/grafserv/express/v4';
import preset from './options';
import { auth } from 'express-oauth2-jwt-bearer';
import { GraphQLSchema } from 'graphql';
import { grafast } from 'postgraphile/grafast';

const isDevLocal = !!process.env.DEV_LOCAL;

console.log(isDevLocal ? 'starting DEVELOPMENT server!' : 'starting production server');

const app = express();

// ruru/graphiql would be blocked without this
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				'script-src': ["'self'", "'unsafe-inline'"],
				'style-src': ["'self'", "'unsafe-inline'"]
			}
		}
	})
);

const pgl = postgraphile(preset);
const serv = pgl.createServ(grafserv);

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

async function executeTestQuery(schema: GraphQLSchema) {
	const { resolvedPreset } = await makeSchema(preset);

	const result = await grafast({
		schema,
		source: 'query { things { deveui } }',
		resolvedPreset,
		requestContext: {}
	});

	return (result as any).data?.things?.length === 0;
}

app.get('/readyz', async (_req, resp) => {
	const ready = await Promise.race([
		new Promise((resolve) => setTimeout(() => resolve(false), 1000)),
		Promise.resolve(pgl.getSchema())
			.then((schema: GraphQLSchema) => executeTestQuery(schema))
			.catch((e: any) => {
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

const server = app.listen(5000, isDevLocal ? 'localhost' : '0.0.0.0');

serv.addTo(app, server);

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
