import { Page } from 'playwright';
import { KEYCLOAK } from './urls';

export const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD;
export const DATA_HUB_ADMIN_USERNAME = `data-hub-admin`;
export const DATA_HUB_ADMIN_PASSWORD = process.env.DATA_HUB_ADMIN_PASSWORD;

export interface Tenant {
	name: string;
	groups: string[];
}

export async function createKeycloakUser(
	page: Page,
	username: string,
	password: string,
	joinTenants: Tenant[],
	realmAdmin: boolean
): Promise<void> {
	await page.getByTestId('realmSelectorToggle').click();
	await page.getByRole('menuitem', { name: 'udh' }).click();
	await page.getByRole('link', { name: 'Users' }).click();
	await page.getByTestId('add-user').click();

	await page.getByLabel('Username *').click();
	await page.getByLabel('Username *').fill(username);
	await page.getByTestId('email-input').click();
	await page.getByTestId('email-input').fill(`${username}@example.com`);
	// set email to be verified
	await page.locator('label').filter({ hasText: 'YesNo' }).locator('span').first().click();

	if (joinTenants.length > 0) {
		await page.getByTestId('join-groups-button').click();
		for (const tenant of joinTenants) {
			await page.getByPlaceholder('Search group').fill(tenant.name);
			await page.getByRole('button', { name: 'Search' }).click();
			await page.getByTestId(`${tenant.name}-check`).check();
			await page.getByTestId(tenant.name).getByLabel('Select').click();
			for (const project of tenant.groups) {
				await page.getByTestId(`${project}-check`).check();
			}
			await page.getByRole('button', { name: 'Groups' }).click();
		}
		await page.getByTestId('join-button').click();
	}

	await page.getByTestId('create-user').click();
	await page.getByTestId('global-alerts').getByRole('button').click();

	await page.getByTestId('credentials').click();
	await page.getByTestId('no-credentials-empty-action').click();
	await page.getByTestId('passwordField').fill(password);
	await page.getByTestId('passwordConfirmationField').fill(password);
	// set password to not be temporary
	await page.getByLabel(`Set password for ${username}`).getByText('On', { exact: true }).click();
	await page.getByTestId('confirm').click();
	await page.getByTestId('confirm').click();
	await page.getByTestId('global-alerts').getByRole('button').click();

	if (realmAdmin) {
		await page.getByTestId('role-mapping-tab').click();
		await page.getByTestId('assignRole').click();
		await page.getByRole('button', { name: 'Filter by realm roles' }).click();
		await page.getByTestId('roles').click();
		await page.getByPlaceholder('Search by role name').fill('manage-realm');
		await page.getByTestId('rolesinput').getByRole('button', { name: 'Search' }).click();
		// there should only be one search result
		await page.getByRole('checkbox', { name: 'Select row' }).check();
		await page.getByTestId('assign').click();
		await page.getByTestId('global-alerts').getByRole('button').click();
	}
}

export async function signInAdminKeycloak(page: Page) {
	await page.goto(KEYCLOAK);
	await page.getByRole('link', { name: 'Administration Console' }).click();
	await page.getByLabel('Username or email').fill('user');
	await page.getByLabel('Password', { exact: true }).fill(KEYCLOAK_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign In' }).click();
}
