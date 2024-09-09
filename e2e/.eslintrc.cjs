module.exports = {
	parser: '@typescript-eslint/parser', // add the TypeScript parser
	parserOptions: {
		// add these parser options
		tsconfigRootDir: __dirname,
		project: ['./tsconfig.json']
	},
	extends: [
		// then, enable whichever type-aware rules you want to use
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking'
	],
	ignorePatterns: ['*.cjs'],
	plugins: [
		'@typescript-eslint' // add the TypeScript plugin
	],
	rules: {
		'no-mixed-spaces-and-tabs': 'off',
		'no-unexpected-multiline': 'off',
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
		]
	}
};
