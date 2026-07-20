import { checkedResourceApiGraphqlRequest, deleteTenant, graphql } from './graphql';
import { DATA_HUB_ADMIN_PASSWORD, DATA_HUB_ADMIN_USERNAME } from './keycloak';
import { MDB_FRONTEND } from './urls';

import test, { expect, Page } from 'playwright/test';

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

export async function loginCreateProjectAndToken(
	page: Page,
	tenantName: string,
	projectName: string,
	tokenName: string,
	username = DATA_HUB_ADMIN_USERNAME,
	password = DATA_HUB_ADMIN_PASSWORD
) {
	await login(page, `${MDB_FRONTEND}api/tenants`, username, password);
	const {
		data: {
			createTenant: {
				createProject: { createSensorCredential: result }
			}
		}
	} = await checkedResourceApiGraphqlRequest(
		graphql`
			mutation ($tenant: String!, $project: String!, $sensorCredential: String!) {
				createTenant(tenant: $tenant) {
					createProject(project: $project) {
						createSensorCredential(sensorCredential: $sensorCredential) {
							username
							password
						}
					}
				}
			}
		`,
		{
			tenant: tenantName,
			project: projectName,
			sensorCredential: tokenName
		}
	);
	return result as { username: string; password: string };
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

export async function selectProject(page: Page, project: string) {
	await page.locator('#activeProjectButton').click();
	await page.locator('.searchDropdown').getByRole('button', { name: project }).click();
	await expect(page.locator('#activeProjectButton')).toContainText(project);
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

export async function checkGrafanaMenuState(page: Page): Promise<void> {
	await expect(page.getByRole('button', { name: 'Search...' })).toBeVisible();

	const close = page.getByRole('button', { name: 'Close menu' });
	const open = page.getByRole('button', { name: 'Open menu' });

	if (!(await close.isVisible())) {
		await open.click();
	}
}

export class RandomTenantManager {
	tenants: string[] = [];

	constructor() {
		test.afterAll(async () => {
			await this.teardown();
		});
	}

	get(): string {
		return this.with(getRandomString(6));
	}

	with(postfix: string): string {
		const name = `knuffingen-${postfix}`;
		this.tenants.push(name);
		return name;
	}

	async teardown() {
		for (const tenant of this.tenants) {
			await deleteTenant(tenant);
		}
	}
}
