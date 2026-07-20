import { PostGraphileAmberPreset } from 'postgraphile/presets/amber';
import { makeV4Preset } from 'postgraphile/presets/v4';
import { makePgService } from 'postgraphile/adaptors/pg';
import { PgSimplifyInflectionPreset } from '@graphile/simplify-inflection';
import { OmitAuditIdsPlugin } from './plugins/omitAuditIds';
import { IncomingMessage } from 'http';
import { AuthResult } from 'express-oauth2-jwt-bearer';
import type {} from 'postgraphile/grafserv/node'; // import all types, so tslint is satisfied

const isDebug = process.env.LOGLEVEL === 'DEBUG';
const isSchemaWatch = !!process.env.WATCH;
const isDevLocal = process.env.DEV_LOCAL === 'true';

interface ExtendedIncomingMessage extends IncomingMessage {
	auth?: AuthResult;
	header: (key: string) => string | undefined;
}

function projectFromToken(req: ExtendedIncomingMessage): Record<string, string> {
	const settings: Record<string, string> = {};
	if (req.auth) {
		settings['jwt.claims.projects'] = JSON.stringify(req.auth.payload.projects);
		settings['pgmemento.session_info'] = JSON.stringify({
			sub: req.auth.payload.sub,
			iss: req.auth.payload.iss,
			// either this is a keycloak user
			preferred_username: req.auth.payload.preferred_username ?? undefined,
			// or an api token
			api_user: req.auth.payload.api_token_name ?? req.auth.payload.client_address ?? undefined
		});
	}
	return settings;
}

function projectFromHeader(req: ExtendedIncomingMessage): Record<string, string> {
	return {
		'jwt.claims.projects': req.header('projects') ?? ''
	};
}

const preset: GraphileConfig.Preset = {
	extends: [
		PostGraphileAmberPreset,
		PgSimplifyInflectionPreset,
		makeV4Preset({
			simpleCollections: 'only',
			graphiql: process.env.GRAPHIQL === 'true',
			graphiqlRoute: '/',
			graphqlRoute: '/graphql',
			ignoreRBAC: false,
			showErrorStack: isDebug,
			subscriptions: false,
			enhanceGraphiql: true,
			extendedErrors: isDebug
				? [
						'severity',
						'code',
						'detail',
						'hint',
						'position',
						'internalPosition',
						'internalQuery',
						'where',
						'schema',
						'table',
						'column',
						'dataType',
						'constraint',
						'file',
						'line',
						'routine'
					]
				: [],
			graphileBuildOptions: {
				pgSkipInstallingWatchFixtures: !isSchemaWatch
			} as Record<string, unknown>
		})
	],
	plugins: [OmitAuditIdsPlugin],
	schema: {
		pgOmitListSuffix: true
	},
	pgServices: [
		makePgService({
			connectionString: `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=${process.env.PGSSLMODE ?? 'no-verify'}`,
			schemas: (process.env.PGSCHEMA || 'sensor').split(','),
			superuserConnectionString: isSchemaWatch
				? `postgres://${process.env.PGOWNERUSER}:${process.env.PGOWNERPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=${process.env.PGSSLMODE ?? 'no-verify'}`
				: undefined
		})
	],
	grafast: {
		context(ctx) {
			const req = ctx.node?.req as ExtendedIncomingMessage | undefined;
			if (!req) return {};
			const pgSettings = isDevLocal ? projectFromHeader(req) : projectFromToken(req);
			return { pgSettings };
		}
	}
};

export default preset;
