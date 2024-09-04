import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		Icons({
			compiler: 'svelte',
			autoInstall: true
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: 'src/lib/tests/setup.ts'
	},
	optimizeDeps: {
		include: ['oidc-client-ts', 'graphql-ws'],
		exclude: ['@urql/svelte', 'tailwindcss', 'tailwind-merge']
	}
});
