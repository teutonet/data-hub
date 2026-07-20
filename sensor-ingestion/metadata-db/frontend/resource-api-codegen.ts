import { CodegenConfig } from '@graphql-codegen/cli';

const GRAPHQL_URI = `https://login${process.env['TARGET_URL_SUFFIX'] ?? '.data-hub.local'}/realms/udh/data-hub/graphql`;

const config: CodegenConfig = {
	schema: GRAPHQL_URI,
	documents: 'src/lib/common/graphql/queries-resource-api.ts',
	generates: {
		'./src/lib/common/generated/types-resource-api.ts': {
			plugins: ['typescript-operations']
		}
	},
	hooks: {
		afterAllFileWrite: `prettier --write`
	}
};

export default config;
