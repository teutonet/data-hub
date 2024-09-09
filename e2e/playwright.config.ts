import { defineConfig } from '@playwright/test';
export default defineConfig({
	use: {
		trace: 'on',
		locale: 'en-US',
		ignoreHTTPSErrors: true,
		launchOptions: {
			firefoxUserPrefs: {
				'security.enterprise_roots.enabled': true
			}
		}
	},
	workers: 1,
	timeout: 180 * 1000,
	reporter: 'html'
});
