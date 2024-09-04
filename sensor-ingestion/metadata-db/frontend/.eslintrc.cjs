module.exports = {
	root: true,
	parser: '@typescript-eslint/parser', // add the TypeScript parser
	parserOptions: {
		// add these parser options
		tsconfigRootDir: __dirname,
		sourceType: 'module',
		ecmaVersion: 2019,
		project: ['./tsconfig.json'],
		extraFileExtensions: ['.svelte']
	},
	extends: [
		// then, enable whichever type-aware rules you want to use
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'plugin:vitest/recommended',
		'plugin:svelte/recommended',
		'prettier'
	],
	plugins: [
		'@typescript-eslint', // add the TypeScript plugin
		'vitest'
	],
	ignorePatterns: ['*.cjs'],
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	rules: {
		'no-mixed-spaces-and-tabs': 'off',
		'no-unexpected-multiline': 'off',
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
		],
		camelcase: 'warn',
		'@typescript-eslint/no-extra-semi': 'off',
		'@typescript-eslint/no-explicit-any': 'off'
	},
	overrides: [
		{
			files: ['**/*.{spec,test}.ts', 'src/lib/tests/**/*.ts'],
			rules: {
				'@typescript-eslint/unbound-method': 'off', // Frequently happening with jest mocks
				'@typescript-eslint/no-unsafe-call': 'off' // Methods on svelte components have no typing available
			}
		},
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			},
			rules: {
				// These rules have known incompatabilites with svelte stores and reactive assignments
				// https://github.com/sveltejs/eslint-plugin-svelte3/issues/89
				'@typescript-eslint/no-unsafe-call': 'off',
				'@typescript-eslint/no-unsafe-member-access': 'off',
				'@typescript-eslint/no-unsafe-assignment': 'off',
				'@typescript-eslint/no-unsafe-argument': 'off'
			}
		}
	]
};
