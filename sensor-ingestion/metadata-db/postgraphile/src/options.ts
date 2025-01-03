import { mixed, PostGraphileOptions, PostGraphilePlugin } from 'postgraphile';
import PgSimplifyInflectorPlugin from '@graphile-contrib/pg-simplify-inflector';
import { IncomingMessage, ServerResponse } from 'http';
import PgManyCreateUpdateDeletePlugin from 'postgraphile-plugin-many-create-update-delete';
import { AuthResult } from 'express-oauth2-jwt-bearer';
import { AuditPluginOptions, OmitAuditIds } from 'postgraphile-audit-plugin';

const isDebug = process.env.LOGLEVEL === 'DEBUG';
const isSchemaWatch = !!process.env.WATCH;

// https://github.com/mayflower/postgraphile-audit-plugin/blob/v1.0.7/src/options.ts
const auditPlugin: Partial<AuditPluginOptions> = {
	auditFunctionSchema: 'app_hidden',
	auditEventConnection: false,
	firstLastAuditEvent: false,
	dateProps: true,
	nameProps: true,
	nameSource: 'session_info',
	nameSessionInfoJsonPath: '{origin}',
	nameFallback: 'System'
};

interface ExtendedIncomingMessage extends IncomingMessage {
	auth?: AuthResult;
	header: (key: string) => mixed;
}

function projectFromToken<RequestType extends ExtendedIncomingMessage = ExtendedIncomingMessage>(
	req: RequestType
): Record<string, string> {
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

function projectFromHeader<RequestType extends ExtendedIncomingMessage = ExtendedIncomingMessage>(
	req: RequestType
): { [key: string]: mixed } {
	return {
		'jwt.claims.projects': req.header('projects')
	};
}

export default function getPostgraphileConfig(isDevLocal: boolean): {
	connectionString?: string;
	schema: string | Array<string>;
	options: PostGraphileOptions<ExtendedIncomingMessage, ServerResponse>;
} {
	return {
		connectionString: `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=no-verify`,
		schema: (process.env.PGSCHEMA || 'sensor').split(','),
		options: {
			pgSettings: isDevLocal ? projectFromHeader : projectFromToken,
			graphileBuildOptions: {
				pgOmitListSuffix: true,
				auditPlugin,
				pgSkipInstallingWatchFixtures: !isSchemaWatch
			},
			enhanceGraphiql: true,
			watchPg: true,
			showErrorStack: isDebug,
			ownerConnectionString: !isSchemaWatch
				? undefined
				: `postgres://${process.env.PGOWNERUSER}:${process.env.PGOWNERPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=no-verify`,
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
			subscriptions: false,
			appendPlugins: [PgSimplifyInflectorPlugin, PgManyCreateUpdateDeletePlugin, OmitAuditIds],
			simpleCollections: 'only',
			graphiql: process.env.GRAPHIQL === 'true',
			graphiqlRoute: '/',
			graphqlRoute: '/graphql',
			ignoreRBAC: false,
			disableQueryLog: !isDebug
		}
	};
}
