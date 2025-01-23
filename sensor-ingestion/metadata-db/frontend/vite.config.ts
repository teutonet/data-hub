import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		svelteTesting(),
		Icons({
			compiler: 'svelte',
			autoInstall: true
		})
	],
	resolve: process.env.VITEST
		? {
				conditions: ['browser']
			}
		: undefined,
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: 'src/lib/tests/setup.ts',
		// https://github.com/vitest-dev/vitest/issues/2834#issuecomment-1573440985
		// alias: [{ find: /^svelte$/, replacement: "svelte/internal" }],
		coverage: {
			enabled: true,
			provider: 'istanbul',
			include: ['src/**']
		}
	},
	optimizeDeps: {
		include: ['oidc-client-ts', 'graphql-ws'],
		exclude: ['@urql/svelte', 'tailwindcss', 'tailwind-merge']
	}
});
