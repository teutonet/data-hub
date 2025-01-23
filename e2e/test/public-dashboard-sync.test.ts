import test, { Page, expect } from 'playwright/test';
import { GRAFANA, GRAFANA_PUBLIC, KEYCLOAK } from './helper/urls';
import axios from 'axios';
import { Agent } from 'https';
import { getRandomString } from './helper/util';
import { aquireTokenViaDeviceCode, MdbApi } from './helper/mdb-api';
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
	await page.getByLabel('New', { exact: true }).click();
	await page.getByRole('link', { name: 'New dashboard' }).click();
	await page.getByTestId('data-testid Add button').click();
	await page.getByTestId('data-testid Add new visualization menu item').click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.getByLabel('Save dashboard title field').fill('Test Private Dashboard 1');
	await page.getByTestId('data-testid Save dashboard drawer button').click();
	// t1/g2 creates a public dashboard
	await page.getByLabel('Change organization').click();
	await page.getByLabel('Select options menu').getByText(`${tenant}:secondary-group`).click();
	await page.getByLabel('New', { exact: true }).click();
	await page.getByRole('link', { name: 'New dashboard' }).click();
	await page.getByTestId('data-testid Add button').click();
	await page.getByTestId('data-testid Add new visualization menu item').click();
	await page.getByTestId('data-testid Back to dashboard button').click();
	await page.getByTestId('data-testid Dashboard settings').click();
	await page.getByPlaceholder('New tag (enter key to add)').click();
	await page.getByPlaceholder('New tag (enter key to add)').fill('public');
	await page.getByPlaceholder('New tag (enter key to add)').press('Enter');
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByLabel('Save dashboard title field').fill('Test Public Dashboard 1');
	await page.getByTestId('data-testid Save dashboard drawer button').click();

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
	await page.getByTestId('data-testid Toggle menu').click();
	await page.getByRole('link', { name: 'Dashboards' }).click();
	await page.locator('button').filter({ hasText: 'New' }).click();
	await page.getByRole('menuitem', { name: 'New folder' }).click();
	await page.getByLabel('Folder name').fill('Unterordner');
	await page.getByRole('button', { name: 'Create' }).click();
	await page.getByRole('link', { name: 'Create dashboard' }).click();
	await page.getByTestId('data-testid Dashboard settings').click();
	await page.getByPlaceholder('New tag (enter key to add)').click();
	await page.getByPlaceholder('New tag (enter key to add)').fill('public');
	await page.getByPlaceholder('New tag (enter key to add)').press('Enter');
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByLabel('Save dashboard title field').fill('Unterordner Dashboard');
	await page.getByTestId('data-testid Save dashboard drawer button').click();
	// observe that the change is reflected
	await refreshUntil(publicGrafanaPage, () =>
		publicGrafanaPage.getByText(`${tenant}:public-dashboards`).isVisible()
	);
	await publicGrafanaPage.getByText(`${tenant}:public-dashboards`).click();

	// move the dashboard to the base folder
	await page.getByLabel('Select folder').click();
	await page.getByLabel('Unterordner', { exact: true }).getByText('Unterordner').click();
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByTestId('data-testid Save dashboard drawer button').click();
	// observe that the change is reflected
	await refreshUntil(publicGrafanaPage, () =>
		publicGrafanaPage.getByRole('link', { name: 'Unterordner Dashboard' }).isVisible()
	);

	// make the dashboard private
	await page.getByLabel('Remove "public" tag').click();
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByTestId('data-testid Save dashboard drawer button').click();

	// observe that it's gone from public
	await refreshUntil(
		publicGrafanaPage,
		async () => (await publicGrafanaPage.getByText(`${tenant}:public-dashboards`).count()) == 0
	);
});

test('public-dashboard-sync syncs datasource changes', async ({ page, context }) => {
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
		`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}/project/trainstation`
	);

	await page.goto(GRAFANA);

	const publicGrafanaPage = await context.newPage();
	await publicGrafanaPage.goto(`${GRAFANA_PUBLIC}dashboards`);

	// create a dashboard without data
	await page.getByLabel('Change organization').click();
	await page.getByLabel('Select options menu').getByText(`${tenant}:admin`).click();
	await page.getByLabel('New', { exact: true }).click();
	await page.getByRole('link', { name: 'New dashboard' }).click();
	await page.getByTestId('data-testid Add button').click();
	await page.getByTestId('data-testid Add new visualization menu item').click();
	await page.getByTestId('data-testid Select a data source').click();
	await page.getByRole('button', { name: 'Prometheus' }).click();
	await page.getByTestId('data-testid metric select-input').fill('test_metric');
	await page.getByText('test_metric', { exact: true }).click();
	await page.getByRole('button', { name: 'Run queries' }).click();
	await page.getByTestId('data-testid Back to dashboard button').click();
	await page.getByTestId('data-testid Dashboard settings').click();
	await page.getByPlaceholder('New tag (enter key to add)').click();
	await page.getByPlaceholder('New tag (enter key to add)').fill('public');
	await page.getByPlaceholder('New tag (enter key to add)').press('Enter');
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByLabel('Save dashboard title field').fill('Test Dashboard');
	await page.getByTestId('data-testid Save dashboard drawer button').click();

	// navigate to published dashboard
	await refreshUntil(publicGrafanaPage, () =>
		publicGrafanaPage.getByText(`${tenant}:admin`).isVisible()
	);
	await publicGrafanaPage.getByText(`${tenant}:admin`).click();
	await expect(publicGrafanaPage.getByRole('link', { name: 'Test Dashboard' })).toBeVisible();
	await publicGrafanaPage.getByRole('link', { name: 'Test Dashboard' }).click();

	// there is no data yet
	await expect(publicGrafanaPage.getByText('No data')).toBeVisible();

	// create a new project and push data to it
	await realmAdminClient.put(`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}/project/busstation`);

	const sensorCredentials = await realmAdminClient.put<{ username: string; password: string }>(
		`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}/projects/busstation/sensor-credentials/token`
	);

	const apiClient = new MdbApi(
		`${tenant}.busstation`,
		sensorCredentials.data.username,
		sensorCredentials.data.password
	);

	const sensorTypeId = await apiClient.createSensorTypeWithProperties(`e2e-${tenant}`, [
		{
			alias: null,
			measure: null,
			metricName: 'test_metric',
			name: 'testMetric'
		}
	]);
	const deveui = await apiClient.createThing(sensorTypeId, `e2e-thing-${tenant}`, 'activated');

	await apiClient.remoteWriteVars(
		{
			deveui,
			appid: 'test',
			devid: 'test'
		},
		{
			testMetric: 50
		}
	);

	// there is data on the public dashboard now
	await refreshUntil(
		publicGrafanaPage,
		() => publicGrafanaPage.getByRole('button', { name: '{__name__="test_metric",' }).isVisible(),
		30
	);
});
