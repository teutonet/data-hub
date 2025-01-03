import { defineConfig, devices } from '@playwright/test';

const fullTests = {
	dependencies: process.env.CI ? ['setup'] : [],
	grepInvert: /@delete-tenants/
};

export default defineConfig({
	projects: [
		// start list with default project for playwright-vscode
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], channel: 'chromium' },
			...fullTests
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
			...fullTests
		},
		{
			name: 'setup',
			grep: /@delete-tenants/
		}
	],
	use: {
		trace: 'retain-on-failure',
		actionTimeout: 20 * 1000,
		locale: 'en-US',
		ignoreHTTPSErrors: true,
		launchOptions: {
			firefoxUserPrefs: {
				'security.enterprise_roots.enabled': true,
				'dom.events.asyncClipboard.readText': true
			}
		}
	},
	workers: 3,
	timeout: 180 * 1000,
	expect: {
		timeout: 20 * 1000
	},
	reporter: [['html'], ['junit', { includeProjectInTestName: true }]]
});
