import test, { BrowserContext, Page, expect } from 'playwright/test';
import { GRAFANA, KEYCLOAK, MDB_FRONTEND, PROMETHEUS } from './helper/urls';
import axios from 'axios';
import { Agent } from 'https';
import { getRandomString } from './helper/util';
import { MdbApi, Thing, aquireTokenViaDeviceCode } from './helper/mdb-api';
import {
	DATA_HUB_ADMIN_PASSWORD,
	DATA_HUB_ADMIN_USERNAME,
	createTestUserViaApi
} from './helper/keycloak';
import { pushMetrics } from 'prometheus-remote-write';

async function expectGrafanaWorking(page: Page): Promise<void> {
	await page.getByTestId('data-testid Toggle menu').click();
	await page.getByRole('link', { name: 'Explore' }).click();
	await page.getByLabel('Select a data source').click();
	await page.getByRole('button', { name: 'Prometheus Prometheus' }).click();
	await page.getByLabel('Metric').click();
	await expect(page.getByText('battery_level', { exact: true })).toBeVisible();
	await page.getByText('air_pressure', { exact: true }).click();
	await page.getByTestId('data-testid Select label-input').click();
	await page.getByText('measureQuality', { exact: true }).click();
	await page.getByTestId('data-testid Select value-input').click();
	await expect(page.getByText('bad', { exact: true })).toBeVisible();
	await page.getByText('good', { exact: true }).click();
	await page.getByTestId('data-testid RefreshPicker run button').click();
}

async function freshLoginFrontend(
	page: Page,
	context: BrowserContext,
	username: string,
	password: string
): Promise<void> {
	await context.clearCookies();
	await page.goto(`${MDB_FRONTEND}overview`);
	await page.getByLabel('Username or email').fill(username);
	await page.getByLabel('Password', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page.getByRole('heading', { name: 'Willkommen im MetaData_DB Hub' })).toBeVisible();
}

async function expectFrontendWorking(page: Page, testPostfix: string): Promise<void> {
	await page.getByRole('link', { name: 'MetaData_DB' }).click();
	await page.getByRole('link', { name: `knuffingen-${testPostfix}.trainstation` }).click();
	await page
		.locator('a')
		.filter({ hasText: /^Eigenschaften$/ })
		.click();
	await expect(page.getByRole('cell', { name: 'batteryLevel' })).toBeVisible();
	await page.locator('a').filter({ hasText: 'Sensortypen' }).click();
	await expect(page.getByRole('cell', { name: `e2e-${testPostfix}` })).toBeVisible();
	await page
		.locator('a')
		.filter({ hasText: /^Sensoren$/ })
		.click();
	await expect(page.getByText(`e2e-thing-${testPostfix}-2`)).toBeVisible();
	await page.getByRole('cell', { name: `e2e-thing-${testPostfix}-0` }).click();
	await expect(page.getByRole('heading', { name: 'Allgemeine Informationen' })).toBeVisible();
}

test('keycloak', async ({ page, context }) => {
	test.slow();

	const testPostfix = getRandomString(6);
	console.log(`testPostfix: ${testPostfix}`);

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

	await realmAdminClient.put(`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}`);

	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/groups/data-analyst`
	);
	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/groups/limited-group`
	);
	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/groups/view-group`
	);

	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/permissions/data-viewer`,
		{
			scopes: ['project:prometheus-read', 'project:view', 'group:view', 'group:dashboard-read'],
			principals: [{ type: 'group', tenant: `knuffingen-${testPostfix}`, group: 'view-group' }]
		}
	);

	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/permissions/data-analyst`,
		{
			scopes: ['project:prometheus-read', 'project:view'],
			principals: [{ type: 'group', tenant: `knuffingen-${testPostfix}`, group: 'data-analyst' }]
		}
	);
	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/groups/data-analyst/permissions/data-analyst`,
		{
			scopes: ['group:dashboard-edit'],
			principals: [{ type: 'group', tenant: `knuffingen-${testPostfix}`, group: 'data-analyst' }]
		}
	);

	const analyzerUser = await createTestUserViaApi(
		[`knuffingen-${testPostfix}/data-analyst`],
		`analyzer-${testPostfix}`
	);
	const tenantAdminUser = await createTestUserViaApi(
		[`knuffingen-${testPostfix}/admin`],
		`tenant-admin-${testPostfix}`
	);
	const limitedUser = await createTestUserViaApi(
		[`knuffingen-${testPostfix}/limited-group`],
		`limited-${testPostfix}`
	);
	const viewerUser = await createTestUserViaApi(
		[`knuffingen-${testPostfix}/view-group`],
		`viewer-${testPostfix}`
	);

	await context.clearCookies();

	const tenantAdminToken = await tenantAdminUser.token();

	const tenantAdminClient = axios.create({
		httpsAgent: new Agent({ rejectUnauthorized: false }),
		headers: { Authorization: `Bearer ${tenantAdminToken}` }
	});

	await tenantAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/projects/trainstation`
	);
	await tenantAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/projects/trainstation/permissions/limited-group`,
		{
			scopes: ['project:sensor-metadata-write', 'project:view'],
			principals: [{ type: 'group', tenant: `knuffingen-${testPostfix}`, group: 'limited-group' }]
		}
	);

	const sensorCredentials = await tenantAdminClient.put<{ username: string; password: string }>(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/projects/trainstation/sensor-credentials/${getRandomString(4)}`
	);

	const apiClient = new MdbApi(
		`knuffingen-${testPostfix}.trainstation`,
		sensorCredentials.data.username,
		sensorCredentials.data.password
	);

	const sensorTypeId = await apiClient.createSensorTypeWithProperties(`e2e-${testPostfix}`, [
		{
			alias: null,
			measure: 'db',
			metricName: 'air_pressure',
			name: 'airPressure'
		},
		{
			alias: null,
			measure: '%',
			metricName: 'battery_level',
			name: 'batteryLevel'
		},
		{
			alias: null,
			measure: null,
			metricName: null,
			name: 'measureQuality'
		}
	]);
	const devices: Thing[] = [];
	for (let i = 0; i < 3; i++) {
		// TODO: test that only activated sensors are forwarded
		const deveui = await apiClient.createThing(
			sensorTypeId,
			`e2e-thing-${testPostfix}-${i}`,
			'activated'
		);
		devices.push({
			deveui,
			devid: sensorTypeId,
			appid: sensorTypeId
		});
	}

	let previousValue = Math.random() * 50 + 50;
	for (const device of devices) {
		for (let i = 0; i < 10; i++) {
			previousValue = Math.min(100, Math.max(50, previousValue + Math.random() * 20 - 10));
			await apiClient.remoteWriteVars(device, {
				airPressure: previousValue,
				batteryLevel: 50,
				measureQuality: Math.random() > 0.5 ? 'good' : 'bad'
			});
		}
	}

	// // checking if the users have access to mdb-frontend and/or grafana

	// // tenant-admin should have access to both
	await freshLoginFrontend(page, context, tenantAdminUser.username, DATA_HUB_ADMIN_PASSWORD);
	await expectFrontendWorking(page, testPostfix);
	await page.goto(GRAFANA);
	await page.getByLabel('Change organization').click();
	await expect(
		page
			.getByLabel('Select options menu')
			.getByText(`knuffingen-${testPostfix}:admin`, { exact: true })
	).toBeVisible();
	await expect(
		page
			.getByLabel('Select options menu')
			.getByText(`knuffingen-${testPostfix}:limited-group`, { exact: true })
	).toBeVisible();
	await expect(
		page
			.getByLabel('Select options menu')
			.getByText(`knuffingen-${testPostfix}:view-group`, { exact: true })
	).toBeVisible();
	await page
		.getByLabel('Select options menu')
		.getByText(`knuffingen-${testPostfix}:data-analyst`, { exact: true })
		.click();
	await expectGrafanaWorking(page);

	// analyzer only has access to one org in grafana but not mdb-frontend

	await freshLoginFrontend(page, context, analyzerUser.username, DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('link', { name: 'MetaData_DB' }).click();
	await page.getByRole('link', { name: 'Projekt auswählen' }).click();
	await expect(
		page.getByRole('link', { name: `knuffingen-${testPostfix}.trainstation` })
	).not.toBeVisible();
	await expect(page.getByRole('link', { name: 'Alle Projekte', exact: true })).toBeVisible();
	await page.goto(GRAFANA);
	await expect(page.getByLabel('Change organization')).not.toBeVisible();
	await expectGrafanaWorking(page);

	// limited only has mdb access to a project, nothing in grafana

	await freshLoginFrontend(page, context, limitedUser.username, DATA_HUB_ADMIN_PASSWORD);
	await expectFrontendWorking(page, testPostfix);
	await page.goto(GRAFANA);
	await page.waitForLoadState('networkidle');
	await expect(page.getByLabel('Change organization')).not.toBeVisible();

	// viewer can look at grafana dashboards

	await freshLoginFrontend(page, context, viewerUser.username, DATA_HUB_ADMIN_PASSWORD);
	await page.goto(GRAFANA);
	await page.getByLabel('Change organization').click();
	await expect(page.getByText('Viewer').first()).toBeVisible();
	await expect(page.getByText('Editor')).not.toBeVisible();
});

test('resource-api-cross-tenant', async ({ page }) => {
	const testPostfix1 = getRandomString(6);
	const testPostfix2 = getRandomString(6);

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

	await realmAdminClient.put(`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix1}`);
	await realmAdminClient.put(`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix2}`);
	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix1}/projects/test`
	);

	const sensorCredentials = await realmAdminClient.put<{ username: string; password: string }>(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix1}/projects/test/sensor-credentials/${getRandomString(4)}`
	);

	const apiClient = new MdbApi(
		`knuffingen-${testPostfix1}.test`,
		sensorCredentials.data.username,
		sensorCredentials.data.password
	);

	await pushMetrics(
		{ testmetric: 1 },
		{
			url: `${PROMETHEUS}/api/v1/write`,
			headers: {
				Authorization: `Bearer ${await apiClient.getOrFetchToken()}`,
				'X-Scope-OrgID': `knuffingen-${testPostfix1}.test`
			},
			fetch
		}
	);
	await page.goto(GRAFANA);
	await page.getByLabel('Change organization').click();
	await page
		.getByLabel('Select options menu')
		.getByText(`knuffingen-${testPostfix2}:admin`, { exact: true })
		.click();
	await page.getByTestId('data-testid Toggle menu').click();
	await page.getByRole('link', { name: 'Explore' }).click();
	await page.getByLabel('Select a data source').click();
	await page.getByRole('button', { name: 'Prometheus Prometheus' }).click();
	await expect(page.getByLabel('Metric')).toBeVisible();

	await expect(async () => {
		await page.reload();
		await page.getByLabel('Metric').click();
		await expect(page.getByText('no org id')).toBeVisible({ timeout: 5000 });
		await page.keyboard.press('Escape');
		await page.getByLabel('Close alert').click();
	}).toPass({ intervals: [0] });

	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix1}/projects/test/permissions/cross`,
		{
			scopes: ['project:prometheus-read'],
			principals: [
				{
					type: 'group',
					tenant: `knuffingen-${testPostfix2}`,
					group: 'admin'
				}
			]
		}
	);

	await expect(async () => {
		await page.reload();
		await page.getByLabel('Metric').click();
		await page.getByText('testmetric', { exact: true }).click({ timeout: 5000 });
	}).toPass({ intervals: [0] });

	await realmAdminClient.delete(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix1}/projects/test/permissions/cross`
	);

	await expect(async () => {
		await page.reload();
		await page.getByLabel('Metric').click();
		await expect(page.getByText('no org id')).toBeVisible({ timeout: 5000 });
	}).toPass({ intervals: [0] });
});
