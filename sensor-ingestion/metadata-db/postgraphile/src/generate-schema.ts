process.env.VERIFY_AUDIENCE = '';
import { makeSchema } from 'postgraphile';
import { GraphQLSchema, printSchema } from 'graphql';
import { writeFileSync } from 'fs';
import preset from './options';

makeSchema(preset)
	.then(({ schema }: { schema: GraphQLSchema }) => {
		const printedSchema = printSchema(schema);
		writeFileSync(process.env.OUT_SCHEMA_PATH!, printedSchema);
	})
	.catch((err: any) => {
		console.error(err);
	});
