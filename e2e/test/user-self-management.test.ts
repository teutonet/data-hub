import { test, expect } from '@playwright/test';
import {
	DATA_HUB_ADMIN_PASSWORD,
	Tenant,
	createKeycloakUser,
	createResources,
	createTestUserViaApi,
	signInWith
} from './helper/keycloak';
import { getRandomString, RandomTenantManager } from './helper/util';
import { MDB_FRONTEND } from './helper/urls';

const TENANT_MGR = new RandomTenantManager();

test('user-self-management', async ({ page }) => {
	const testPostfix = getRandomString(6);

	const tenantName = TENANT_MGR.with(testPostfix);
	const tenant: Tenant = { name: tenantName, groups: ['admin'] };

	const testUsername = `test-${testPostfix}`;
	const userPassword = 'asdf';

	const test2Username = `test2-${testPostfix}`;

	await createResources([`tenant/${tenantName}`]);

	const adminUser = await createTestUserViaApi([`${tenantName}/admin`], `admin-${testPostfix}`);

	await page.goto(`${MDB_FRONTEND}`);

	await signInWith(page, adminUser.username, DATA_HUB_ADMIN_PASSWORD);

	const [page2] = await Promise.all([
		page.waitForEvent('popup'),
		page.getByRole('link', { name: 'Nutzerverwaltung' }).click()
	]);

	await expect(page2.getByRole('heading', { name: 'Welcome to' })).toBeVisible();

	await createKeycloakUser(page2, testUsername, userPassword, [tenant], false);
	await page2.getByTestId('options-toggle').click();
	await page2.getByRole('menuitem', { name: 'Sign out' }).click();

	const [page3] = await Promise.all([
		page.waitForEvent('popup'),
		page.getByRole('link', { name: 'Nutzerverwaltung' }).click()
	]);
	await page3.getByLabel('Username or email').click();
	await page3.getByLabel('Username or email').fill(testUsername);
	await page3.getByLabel('Password').click();
	await page3.getByLabel('Password').fill(userPassword);
	await page3.getByRole('button', { name: 'Sign In' }).click();

	await expect(page3.getByRole('heading', { name: 'Welcome to' })).toBeVisible();
	await page3.getByRole('link', { name: 'Users' }).click();
	await expect(page3.getByRole('link', { name: testUsername })).toBeVisible();
	await page3.getByTestId('add-user').click();
	await page3.getByLabel('Username *').click();
	await page3.getByLabel('Username *').fill(test2Username);
	await page3.getByTestId('user-creation-save').click();
	await expect(page3.getByText('Could not create user:')).toBeVisible();
	await page3.getByTestId('join-groups-button').click();
	await page3.getByPlaceholder('Search group').fill(tenantName);
	await page3.getByRole('button', { name: 'Search' }).click();
	await page3.getByTestId(`${tenantName}-check`).check();
	await page3.getByTestId('join-button').click();
	await page3.getByTestId('user-creation-save').click();
	await expect(page3.getByText('The user has been created')).toBeVisible();
});
