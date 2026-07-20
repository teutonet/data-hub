import vitest from '@vitest/eslint-plugin';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import eslintConfigPrettier from 'eslint-config-prettier';

const ignores = [
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
];

export default [
	{ ignores },
	js.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs['flat/recommended'],
	eslintConfigPrettier,
	...svelte.configs['flat/prettier'],
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser
			},
			globals: {
				...globals.browser
			}
		},
		rules: {
			'@typescript-eslint/no-unused-expressions': 'off', // Often triggers for expressions that force svelte reactivity
			'svelte/prefer-writable-derived': 'off', // TODO: svelte reactivity in $derived is bugged
			'svelte/no-unused-svelte-ignore': 'off' // triggers even when the svelte-ignore is used
		}
	},
	{
		files: ['**/*.{spec,test}.ts', 'src/lib/tests/**/*.ts'],
		plugins: {
			vitest
		},
		languageOptions: {
			parser: tseslint.parser,
			globals: {
				...vitest.environments.env.globals
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			...vitest.configs.recommended.rules,
			'@typescript-eslint/unbound-method': 'off', // Frequently happening with jest mocks
			'@typescript-eslint/no-unsafe-call': 'off', // Methods on svelte components have no typing available
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			'svelte/no-navigation-without-resolve': [
				'error',
				{
					ignoreGoto: true,
					ignoreLinks: true
				}
			]
		}
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tseslint.parser
		}
	},
	{
		plugins: {
			'@typescript-eslint': tseslint.plugin
		},
		rules: {
			semi: 'warn',
			'no-mixed-spaces-and-tabs': 'off',
			'no-unexpected-multiline': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			camelcase: 'warn',
			'@typescript-eslint/no-extra-semi': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			//"no-constant-binary-expression": "off"
			'svelte/no-navigation-without-resolve': [
				'error',
				{
					ignoreGoto: true,
					ignoreLinks: true
				}
			]
		}
	}
];
