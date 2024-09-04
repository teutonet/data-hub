import PgSimplifyInflectorPlugin from '@graphile-contrib/pg-simplify-inflector';
import PgManyCreateUpdateDeletePlugin from 'postgraphile-plugin-many-create-update-delete';

const isDebug = process.env.LOGLEVEL === 'DEBUG';
const isSchemaWatch = !!process.env.WATCH;

const projectFromToken = (req) => {
	const settings = {};
	if (req.auth) {
		settings['jwt.claims.projects'] = JSON.stringify(req.auth.payload.projects);
	}
	return settings;
};

const projectFromHeader = (req) => ({
	'jwt.claims.projects': req.header('projects')
});

export default function getPostgraphileConfig(isDevLocal) {
	return {
		poolConfig: `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=no-verify`,
		schema: (process.env.PGSCHEMA || 'sensor').split(','),
		options: {
			pgSettings: isDevLocal ? projectFromHeader : projectFromToken,
			graphileBuildOptions: {
				pgOmitListSuffix: true,
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
			appendPlugins: [PgSimplifyInflectorPlugin, PgManyCreateUpdateDeletePlugin.default],
			simpleCollections: 'only',
			graphiql: process.env.GRAPHIQL === 'true',
			graphiqlRoute: '/',
			graphqlRoute: '/graphql',
			ignoreRBAC: false,
			disableQueryLog: !isDebug
		}
	};
}
