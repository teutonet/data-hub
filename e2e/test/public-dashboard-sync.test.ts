import test, { Page, expect } from 'playwright/test';
import { GRAFANA, GRAFANA_PUBLIC, KEYCLOAK } from './helper/urls';
import axios from 'axios';
import { Agent } from 'https';
import { getRandomString } from './helper/util';
import { aquireTokenViaDeviceCode } from './helper/mdb-api';
import {
	DATA_HUB_ADMIN_PASSWORD,
	DATA_HUB_ADMIN_USERNAME,
	signInAdminKeycloak
} from './helper/keycloak';

async function refreshUntil(
	page: Page,
	check: () => Promise<boolean>,
	refreshCount: number = 15,
	refreshInterval: number = 1000
) {
	while (refreshCount >= 0) {
		refreshCount--;
		if (await check()) {
			return;
		}
		await page.reload();
		await page.waitForTimeout(refreshInterval);
	}
	throw Error('Check is still false');
}

test('public-dashboard-sync create', async ({ page, context }) => {
	await signInAdminKeycloak(page);

	const tenant = `knuffingen-${getRandomString(6)}`;
	console.log(`tenant sync create: ${tenant}`);

	const realmAdminToken = await aquireTokenViaDeviceCode(
		page,
		DATA_HUB_ADMIN_USERNAME,
		DATA_HUB_ADMIN_PASSWORD,
		['data-hub']
	);

	const realmAdminClient = axios.create({
		httpsAgent: new Agent({ rejectUnauthorized: false }),
		headers: { Authorization: `Bearer ${realmAdminToken}` }
	});

	await realmAdminClient.put(`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}`);

	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}/groups/primary-group`
	);
	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}/groups/secondary-group`
	);

	await page.goto(GRAFANA);

	const publicGrafanaPage = await context.newPage();
	await publicGrafanaPage.goto(`${GRAFANA_PUBLIC}dashboards`);

	// t1/g1 creates a private dashboard
	await page.getByLabel('Change organization').click();
	await page.getByLabel('Select options menu').getByText(`${tenant}:primary-group`).click();
	await page.getByTestId('data-testid Add panel button').click();
	await page.getByTestId('data-testid Add new visualization menu item').click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.getByLabel('Save dashboard title field').fill('Test Private Dashboard 1');
	await page.getByLabel('Save dashboard button').click();
	// t1/g2 creates a public dashboard
	await page.getByLabel('Change organization').click();
	await page.getByLabel('Select options menu').getByText(`${tenant}:secondary-group`).click();
	await page.getByTestId('data-testid Add panel button').click();
	await page.getByTestId('data-testid Add new visualization menu item').click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.getByLabel('Save dashboard title field').fill('Test Public Dashboard 1');
	await page.getByLabel('Save dashboard button').click();
	// due to a bug in grafana it's not possible to create the dashboard with a tag
	await page.getByLabel('Dashboard settings', { exact: true }).click();
	await page.getByPlaceholder('New tag (enter key to add)').fill('public');
	await page.getByPlaceholder('New tag (enter key to add)').press('Enter');
	await page.getByLabel('Dashboard settings aside actions Save button').click();
	await page.getByLabel('Dashboard settings Save').click();

	// ensure, the public dashboard is visible
	await refreshUntil(publicGrafanaPage, () =>
		publicGrafanaPage.getByText(`${tenant}:secondary-group`).isVisible()
	);
	await publicGrafanaPage.getByText(`${tenant}:secondary-group`).click();
	await expect(
		publicGrafanaPage.getByRole('link', { name: 'Test Public Dashboard 1' })
	).toBeVisible();
	await expect(publicGrafanaPage.getByText(`${tenant}:primary-group`)).not.toBeVisible();
});

test('public-dashboard-sync folder', async ({ page, context }) => {
	await signInAdminKeycloak(page);

	const tenant = `knuffingen-${getRandomString(6)}`;
	console.log(`tenant folder sync: ${tenant}`);

	const realmAdminToken = await aquireTokenViaDeviceCode(
		page,
		DATA_HUB_ADMIN_USERNAME,
		DATA_HUB_ADMIN_PASSWORD,
		['data-hub']
	);

	const realmAdminClient = axios.create({
		httpsAgent: new Agent({ rejectUnauthorized: false }),
		headers: { Authorization: `Bearer ${realmAdminToken}` }
	});

	await realmAdminClient.put(`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}`);

	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}/groups/public-dashboards`
	);

	await page.goto(GRAFANA);

	const publicGrafanaPage = await context.newPage();
	await publicGrafanaPage.goto(`${GRAFANA_PUBLIC}dashboards`);

	// create a folder and puts a public dashboard there
	await page.getByLabel('Change organization').click();
	await page.getByLabel('Select options menu').getByText(`${tenant}:public-dashboards`).click();
	await page.getByLabel('Toggle menu').click();
	await page.getByRole('link', { name: 'Dashboards' }).click();
	await page.locator('button').filter({ hasText: 'New' }).click();
	await page.getByRole('link', { name: 'New Folder' }).click();
	await page.getByLabel('Folder name').fill('Unterordner');
	await page.getByRole('button', { name: 'Create' }).click();
	await page.getByTestId('data-testid Call to action button Create Dashboard').click();
	await page.getByLabel('Save dashboard').click();
	await page.getByLabel('Save dashboard title field').fill('Unterordner Dashboard');
	await page.getByLabel('Save dashboard button').click();
	// due to a bug in grafana it's not possible to create the dashboard with a tag
	await page.getByLabel('Dashboard settings', { exact: true }).click();
	await page.getByPlaceholder('New tag (enter key to add)').fill('public');
	await page.getByPlaceholder('New tag (enter key to add)').press('Enter');
	await page.getByLabel('Dashboard settings aside actions Save button').click();
	await page.getByLabel('Dashboard settings Save').click();
	// observe that the change is reflected
	await refreshUntil(publicGrafanaPage, () =>
		publicGrafanaPage.getByText(`${tenant}:public-dashboards`).isVisible()
	);
	await publicGrafanaPage.getByText(`${tenant}:public-dashboards`).click();

	// move the dashboard to the base folder
	await page.getByLabel('Select a folder').click();
	await page.getByLabel('Select option').getByText('General').click();
	// grafana doesn't let you save with only the folder changed...
	await page.getByLabel('Name').fill('Unterordner Dashboard b');
	await page.getByLabel('Dashboard settings aside actions Save button').click();
	await page.getByLabel('Dashboard settings Save').click();
	// observe that the change is reflected
	await refreshUntil(publicGrafanaPage, () =>
		publicGrafanaPage.getByRole('link', { name: 'Unterordner Dashboard b' }).isVisible()
	);

	// make the dashboard private
	await page.getByLabel('Dashboard settings', { exact: true }).click();
	await page.getByLabel('Remove "public" tag').click();
	await page.getByLabel('Dashboard settings aside actions Save button').click();
	await page.getByLabel('Dashboard settings Save').click();

	// observe that it's gone from public
	await refreshUntil(
		publicGrafanaPage,
		async () => (await publicGrafanaPage.getByText(`${tenant}:public-dashboards`).count()) == 0
	);
});
