import test, { expect } from 'playwright/test';
import { aquireTokenViaDeviceCode, MdbApi } from './helper/mdb-api';
import {
	DATA_HUB_ADMIN_USERNAME,
	DATA_HUB_ADMIN_PASSWORD,
	signInAdminKeycloak
} from './helper/keycloak';
import { Agent } from 'https';
import axios from 'axios';
import { GRAFANA, KEYCLOAK, MDB_FRONTEND } from './helper/urls';
import { getRandomString } from './helper/util';
test(
	'technical_ prefix cant be used',
	{
		tag: '@technicalPrefixPrevent'
	},
	async ({ page }) => {
		await signInAdminKeycloak(page);

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
		const testPostfix = getRandomString(6);
		await realmAdminClient.put<string[]>(
			`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/`
		);
		await realmAdminClient.put<string[]>(
			`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/projects/testproject-${testPostfix}/`
		);

		await page.goto(MDB_FRONTEND + 'overview');
		await page.getByText('Projekt auswählen').click();
		await page
			.getByRole('tooltip')
			.getByRole('link', { name: `knuffingen-${testPostfix}.testproject-${testPostfix}` })
			.first()
			.click();
		await page
			.locator('a')
			.filter({ hasText: /^Eigenschaften$/ })
			.click();
		await page.getByRole('button', { name: 'Neue Eigenschaft anlegen' }).click();
		await page.getByLabel('Name', { exact: true }).fill('test_metric');
		await page.getByLabel('Messeinheit').fill('litres of test');
		await page.getByLabel('Beschreibung').fill('test-based metric');
		await page.getByLabel('Metrikname').fill('technical_test');
		await expect(
			page.getByText('Der Technische Prefix "technical_" ist nicht erlaubt bei Metriknamen.')
		).toBeVisible();
		await page.getByRole('button', { name: 'Speichern' }).click();
	}
);

test('label names are escaped', async ({ page }) => {
	const realmAdminToken = await aquireTokenViaDeviceCode(
		page,
		DATA_HUB_ADMIN_USERNAME,
		DATA_HUB_ADMIN_PASSWORD,
		['data-hub', 'prometheus_read', 'prometheus_write']
	);
	const realmAdminClient = axios.create({
		httpsAgent: new Agent({ rejectUnauthorized: false }),
		headers: { Authorization: `Bearer ${realmAdminToken}` }
	});
	const testPostfix = getRandomString(6);
	await realmAdminClient.put<string[]>(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/`
	);
	await realmAdminClient.put<string[]>(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/projects/trainstation/`
	);

	const sensorCredentials = await realmAdminClient.put<{ username: string; password: string }>(
		`${KEYCLOAK}realms/udh/data-hub/tenants/knuffingen-${testPostfix}/projects/trainstation/sensor-credentials/${getRandomString(4)}`
	);

	const mdbClient = new MdbApi(
		`knuffingen-${testPostfix}.trainstation`,
		sensorCredentials.data.username,
		sensorCredentials.data.password
	);

	const sensorTypeId = await mdbClient.createSensorTypeWithProperties('Weird Naming', [
		{
			name: 'test.label',
			metricName: null,
			measure: null,
			alias: null
		},
		{
			name: '123tést456',
			metricName: null,
			measure: null,
			alias: null
		},
		{
			name: 'notpresent',
			metricName: null,
			measure: null,
			alias: null
		},
		{
			name: 'doesntmatter',
			metricName: 'testmetric',
			measure: '',
			alias: 'test.metric'
		}
	]);

	const deveui = await mdbClient.createThing(sensorTypeId, 'test', 'activated');

	await mdbClient.remoteWriteVarsLorawan(
		{
			deveui,
			appid: 'some',
			devid: 'thing'
		},
		{
			test: {
				label: 'hi',
				metric: 42
			},
			'123tést456': 'test'
		}
	);
	await page.goto(GRAFANA);
	await page.getByLabel('Change organization').click();
	await page.getByLabel('Select options menu').getByText(`knuffingen-${testPostfix}:admin`).click();
	await page.getByTestId('data-testid Toggle menu').click();
	await page
		.getByTestId('data-testid navigation mega-menu')
		.getByRole('link', { name: 'Explore' })
		.click();

	await page.getByLabel('Select a data source').click();
	await page.getByRole('button', { name: 'Prometheus Prometheus' }).click();
	await page.getByLabel('Metric').click();
	await page.getByText('testmetric', { exact: true }).click();
	await page.getByTestId('data-testid Select label-input').click();
	await expect(page.getByText('test_label')).toBeVisible();
	await expect(page.getByText('t_st456')).toBeVisible();
	await expect(page.getByText('notpresent')).not.toBeVisible();
});
