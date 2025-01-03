import typescriptEslint from '@typescript-eslint/eslint-plugin';
import vitest from '@vitest/eslint-plugin';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import parser from 'svelte-eslint-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
});

export default [
	{
		ignores: [
			'**/*.cjs',
			'**/pnpm-lock.yaml',
			'**/package-lock.json',
			'**/yarn.lock',
			'**/.DS_Store',
			'**/node_modules',
			'build',
			'.svelte-kit',
			'package',
			'**/.env',
			'**/.env.*',
			'!**/.env.example',
			'src/lib/common/generated/'
		]
	},
	...compat.extends(
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'plugin:svelte/recommended',
		'prettier'
	),
	{
		plugins: {
			'@typescript-eslint': typescriptEslint,
			'@vitest': vitest
		},

		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			},

			parser: tsParser,
			ecmaVersion: 2019,
			sourceType: 'module',

			parserOptions: {
				tsconfigRootDir: __dirname,
				project: ['./tsconfig.json'],
				extraFileExtensions: ['.svelte']
			}
		},

		rules: {
			'no-mixed-spaces-and-tabs': 'off',
			'no-unexpected-multiline': 'off',
			'no-unused-vars': 'off',

			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			],

			camelcase: 'warn',
			'@typescript-eslint/no-extra-semi': 'off',
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},
	{
		files: ['**/*.{spec,test}.ts', 'src/lib/tests/**/*.ts'],

		rules: {
			'@typescript-eslint/unbound-method': 'off',
			'@typescript-eslint/no-unsafe-call': 'off'
		}
	},
	{
		files: ['**/*.svelte'],

		languageOptions: {
			parser: parser,
			ecmaVersion: 5,
			sourceType: 'script',

			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		},

		rules: {
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off'
		}
	}
];
