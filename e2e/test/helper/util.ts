import { DATA_HUB_ADMIN_PASSWORD, DATA_HUB_ADMIN_USERNAME } from './keycloak';
import { MDB_FRONTEND } from './urls';

import { expect, Page } from 'playwright/test';

export function getRandomString(len: number): string {
	return String.fromCharCode(
		...Array(len)
			.fill(0)
			.map(() => 97 + Math.floor(Math.random() * 26))
	);
}

export async function login(page: Page, url: string, username: string, password: string) {
	await page.goto(url);
	await page.waitForLoadState();
	await page.getByLabel('Username or email').fill(username);
	await page.getByLabel('Password', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Sign In' }).click();
	await page.waitForLoadState();
}

export async function createTenant(page: Page, tenantName: string, url?: string) {
	if (url) {
		await page.goto(url);
	}
	await page.getByRole('button', { name: 'Neuen Tenant anlegen' }).click();
	await page.getByPlaceholder(' ').fill(tenantName);
	await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
	// TODO: this produces race conditions in keycloak otherwise
	await page.waitForTimeout(1000);
}

export async function createProject(page: Page, projectName: string, url?: string) {
	if (url) {
		await page.goto(url);
	}
	await page.getByRole('button', { name: 'Projekte' }).click();
	await page.getByRole('button', { name: 'Neues Projekt anlegen' }).click();
	await page.getByPlaceholder(' ').fill(projectName);
	await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
}

export async function createToken(
	page: Page,
	tokenName: string,
	url?: string
): Promise<{ username: string; password: string }> {
	if (url) {
		await page.goto(url);
	}

	await page.getByRole('button', { name: 'Neuen Token anlegen' }).click();
	await page.getByPlaceholder(' ').fill(tokenName);
	await page.getByRole('dialog').getByRole('button', { name: 'Token erzeugen' }).click();
	const tokenUsername = await page.getByLabel('Username').inputValue();
	const tokenPassword = await page.getByLabel('Passwort').inputValue();
	await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();
	return { username: tokenUsername, password: tokenPassword };
}

export async function createTenantProjectAndToken(
	page: Page,
	tenantName: string,
	projectName: string,
	tokenName: string,
	navigate = true
) {
	if (navigate) {
		await page.goto(`${MDB_FRONTEND}api/tenants`);
	}
	await createTenant(page, tenantName);

	await createProject(page, projectName);
	await page.waitForTimeout(1000);
	return await createToken(page, tokenName);
}

export async function loginCreateProjectAndToken(
	page: Page,
	tenantName: string,
	projectName: string,
	tokenName: string,
	username = DATA_HUB_ADMIN_USERNAME,
	password = DATA_HUB_ADMIN_PASSWORD
) {
	await login(page, `${MDB_FRONTEND}api/tenants`, username, password);
	return await createTenantProjectAndToken(page, tenantName, projectName, tokenName, false);
}

export async function checkAndDismissToast(
	text: string,
	page: Page,
	tryToClose = true,
	waitForClose = true,
	forceClick = true
): Promise<void> {
	const toastElement = page.locator('.toast').filter({ hasText: text });

	await expect(toastElement).toBeVisible();
	if (tryToClose) {
		await toastElement.getByRole('button', { name: 'Schließen' }).click({ force: forceClick });
	}
	if (tryToClose || waitForClose) {
		await expect(toastElement).not.toBeVisible();
	}
}

export async function checkAndDismissGrafanaAlert(
	text: string,
	page: Page,
	tryToClose = true,
	waitForClose = true,
	forceClick = true
): Promise<void> {
	const alertElement = page.getByRole('status', { name: text });

	await expect(alertElement).toBeVisible();
	if (tryToClose) {
		await alertElement.getByLabel('Close alert').click({
			force: forceClick
		});
	}
	if (tryToClose || waitForClose) {
		await expect(alertElement).not.toBeVisible();
	}
}
