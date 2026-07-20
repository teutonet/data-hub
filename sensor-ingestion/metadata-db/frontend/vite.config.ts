import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig as defineViteConfig, mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import Icons from 'unplugin-icons/vite';
import tailwindcss from '@tailwindcss/vite';

const viteConfig = defineViteConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		svelteTesting(),
		Icons({
			compiler: 'svelte',
			autoInstall: true
		})
	],
	server: {
		allowedHosts: true
	},
	resolve: process.env.VITEST
		? {
				conditions: ['browser']
			}
		: undefined,
	optimizeDeps: {
		include: ['oidc-client-ts', 'graphql-ws'],
		exclude: ['@urql/svelte', 'tailwindcss', 'tailwind-merge']
	}
});

const vitestConfig = defineVitestConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: 'src/lib/tests/setup.ts',
		// snapshotFormat: {
		// 	printShadowRoot: false
		// },
		// https://github.com/vitest-dev/vitest/issues/2834#issuecomment-1573440985
		// alias: [{ find: /^svelte$/, replacement: "svelte/internal" }],
		coverage: {
			enabled: true,
			provider: 'istanbul',
			include: ['src/**/*.test.ts']
		}
	}
});

export default mergeConfig(viteConfig, vitestConfig);
