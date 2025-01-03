import { test, expect } from '@playwright/test';
import {
	DATA_HUB_ADMIN_PASSWORD,
	DATA_HUB_ADMIN_USERNAME,
	Tenant,
	createKeycloakUser
} from './helper/keycloak';
import { getRandomString } from './helper/util';
import { MDB_FRONTEND } from './helper/urls';

test('user-self-management', async ({ page }) => {
	const testPostfix = getRandomString(6);

	const tenantName = `knuffingen-${testPostfix}`;
	console.log(`tenantName: ${tenantName}`);
	const tenant: Tenant = { name: tenantName, groups: ['admin'] };

	const testUsername = `test-${testPostfix}`;
	console.log(`test username: ${testUsername}`);
	const userPassword = 'asdf';

	const test2Username = `test2-${testPostfix}`;
	console.log(`test2 username: ${test2Username}`);

	await page.goto(`${MDB_FRONTEND}`);
	await expect(page.getByRole('heading', { name: 'Willkommen im Data HUB' })).toBeVisible();
	const page1Promise = page.waitForEvent('popup');
	await page.getByRole('button', { name: 'Auth API' }).click();

	const page1 = await page1Promise;
	await expect(page1.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
	await page1.getByLabel('Username or email').fill(DATA_HUB_ADMIN_USERNAME);
	await page1.getByLabel('Password').fill(DATA_HUB_ADMIN_PASSWORD);
	await page1.getByRole('button', { name: 'Sign In' }).click();

	await page1.getByRole('heading', { name: 'Tenants' }).click();
	await page1.getByRole('button', { name: 'Neuen Tenant anlegen' }).click();
	await page1.getByPlaceholder(' ').fill(tenantName);
	await page1.getByRole('button', { name: 'Erstellen' }).click();
	await expect(page1.getByText('Erfolgreich gespeichert')).toBeVisible({ timeout: 15000 });

	const page2Promise = page.waitForEvent('popup');
	await page.getByRole('button', { name: 'Keycloak' }).click();
	const page2 = await page2Promise;
	await expect(page2.getByRole('heading', { name: 'Welcome to' })).toBeVisible();

	await createKeycloakUser(page2, testUsername, userPassword, [tenant], false);
	await page2.getByRole('button', { name: 'Data hub Admin' }).click();
	await page2.getByRole('menuitem', { name: 'Sign out' }).click();

	const page3Promise = page.waitForEvent('popup');
	await page.getByRole('button', { name: 'Keycloak' }).click();
	const page3 = await page3Promise;
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
