process.env.VERIFY_AUDIENCE = '';
import { createPostGraphileSchema } from 'postgraphile-core';
import { printSchema } from 'graphql';
import { writeFileSync } from 'fs';
import getPostgraphileConfig from './options.js';

const { schema, options } = getPostgraphileConfig(false);

createPostGraphileSchema(process.env.DATABASE_URL, schema, options)
	.then((schema) => {
		const printedSchema = printSchema(schema);
		writeFileSync(process.env.OUT_SCHEMA_PATH, printedSchema);
	})
	.catch((err) => {
		console.error(err);
	});
