import test, { BrowserContext, Page, expect } from 'playwright/test';
import { GRAFANA, KEYCLOAK, MDB_FRONTEND } from './helper/urls';
import axios from 'axios';
import { Agent } from 'https';
import { getRandomString } from './helper/util';
import { MdbApi, Thing, aquireTokenViaDeviceCode } from './helper/mdb-api';
import {
	DATA_HUB_ADMIN_PASSWORD,
	DATA_HUB_ADMIN_USERNAME,
	createKeycloakUser,
	signInAdminKeycloak
} from './helper/keycloak';

async function expectGrafanaWorking(page: Page): Promise<void> {
	await page.getByLabel('Toggle menu').click();
	await page.getByTestId('navbarmenu').getByRole('link', { name: 'Explore', exact: true }).click();
	await page.getByLabel('Select a data source').click();
	await page.getByLabel('Select options menu').getByText('Prometheus', { exact: true }).click();
	await page.getByLabel('Metric').click();
	await expect(page.getByText('battery_level', { exact: true })).toBeVisible();
	await page.getByText('air_pressure', { exact: true }).click();
	await page.getByLabel('Select label').click();
	await page.getByText('measureQuality', { exact: true }).click();
	await page.getByLabel('Select value').click();
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
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign In' }).click();
	await page.goto(`${MDB_FRONTEND}overview`);
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
	await signInAdminKeycloak(page);

	const testPostfix = getRandomString(6);
	console.log(`testPostfix: ${testPostfix}`);

	const userPassword = 'asdf';

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
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/permissions/data-analyst`,
		{ scopes: ['project:prometheus-read', 'project:view'], groups: ['data-analyst'] }
	);
	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/groups/data-analyst/permissions/data-analyst`,
		{ scopes: ['group:dashboard-edit'], groups: ['data-analyst'] }
	);

	await page.goto(`${KEYCLOAK}admin/master/console/`);

	await createKeycloakUser(
		page,
		`analyzer-${testPostfix}`,
		userPassword,
		[
			{
				name: `knuffingen-${testPostfix}`,
				groups: ['data-analyst']
			}
		],
		false
	);

	await createKeycloakUser(
		page,
		`tenant-admin-${testPostfix}`,
		userPassword,
		[
			{
				name: `knuffingen-${testPostfix}`,
				groups: ['admin']
			}
		],
		false
	);

	await createKeycloakUser(
		page,
		`limited-${testPostfix}`,
		userPassword,
		[
			{
				name: `knuffingen-${testPostfix}`,
				groups: ['limited-group']
			}
		],
		false
	);

	await context.clearCookies();

	const tenantAdminToken = await aquireTokenViaDeviceCode(
		page,
		`tenant-admin-${testPostfix}`,
		userPassword,
		['data-hub']
	);

	const tenantAdminClient = axios.create({
		httpsAgent: new Agent({ rejectUnauthorized: false }),
		headers: { Authorization: `Bearer ${tenantAdminToken}` }
	});

	await tenantAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/projects/trainstation`
	);
	await tenantAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/projects/trainstation/permissions/limited-group`,
		{ scopes: ['project:sensor-metadata-write', 'project:view'], groups: ['limited-group'] }
	);

	// const creds = await tenantAdminClient.get(`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/projects/trainstation/sensor-credentials`);
	// console.log(creds);

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
	await freshLoginFrontend(page, context, `tenant-admin-${testPostfix}`, userPassword);
	await expectFrontendWorking(page, testPostfix);
	await page.goto(GRAFANA);
	await page.getByLabel('Change organization').click();
	await expect(page.getByText(`knuffingen-${testPostfix}:admin`).first()).toBeVisible();
	await expect(page.getByText(`knuffingen-${testPostfix}:limited-group`).first()).toBeVisible();
	await page.getByText(`knuffingen-${testPostfix}:data-analyst`, { exact: true }).first().click();
	await expectGrafanaWorking(page);

	// analyzer only has access to one org in grafana but not mdb-frontend

	await freshLoginFrontend(page, context, `analyzer-${testPostfix}`, userPassword);
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

	await freshLoginFrontend(page, context, `limited-${testPostfix}`, userPassword);
	await expectFrontendWorking(page, testPostfix);
	await page.goto(GRAFANA);
	await expect(page.getByLabel('Change organization')).not.toBeVisible();
});
