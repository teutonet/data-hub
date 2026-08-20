import test, { expect } from 'playwright/test';
import { MdbApi } from './helper/mdb-api';
import {
	createResources,
	createResourceToken,
	DATA_HUB_ADMIN_USERNAME,
	DATA_HUB_ADMIN_PASSWORD
} from './helper/keycloak';
import { GRAFANA, MDB_FRONTEND } from './helper/urls';
import { checkGrafanaMenuState, login, RandomTenantManager } from './helper/util';

const TENANT_MGR = new RandomTenantManager();

test(
	'technical_ prefix cant be used',
	{
		tag: '@technicalPrefixPrevent'
	},
	async ({ page }) => {
		const tenant = TENANT_MGR.get();

		await createResources([`tenants/${tenant}/projects/testproject`]);

		await login(page, MDB_FRONTEND, DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD);
		await page.getByRole('button', { name: 'Alle Projekte' }).click();
		await page
			.getByRole('tooltip')
			.getByRole('button', { name: `${tenant}.testproject` })
			.first()
			.click();

		await page.getByRole('button', { name: 'Sensorverwaltung', exact: true }).click();
		await page.getByRole('link', { name: 'Sensoreigenschaften', exact: true }).click();
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
	const tenant = TENANT_MGR.get();

	await createResources([`tenants/${tenant}/projects/trainstation`]);

	const sensorCredentials = await createResourceToken(tenant, 'trainstation', 'test');

	const mdbClient = new MdbApi(
		`${tenant}.trainstation`,
		sensorCredentials.username,
		sensorCredentials.password
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
	await login(page, GRAFANA, DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD);
	await checkGrafanaMenuState(page);
	await page.getByRole('combobox', { name: 'Change organization' }).click();
	await page.getByLabel('Select options menu').getByText(`${tenant}:admin`).click();
	await checkGrafanaMenuState(page);
	await page
		.getByTestId('data-testid navigation mega-menu')
		.getByRole('link', { name: 'Drilldown' })
		.click();
	await page.locator('#pageContent').getByRole('link', { name: 'Metrics' }).click();

	await page.locator('#ds').click();
	await page.getByTestId('data-testid Select option').getByText('Prometheus').click();

	await page.getByRole('combobox', { name: 'Filters' }).click();
	await page.getByRole('option', { name: '__name__' }).click();
	await page.getByRole('option', { name: '= Equals' }).click();
	await page.getByRole('option', { name: 'testmetric', exact: true }).click();

	await page.getByRole('combobox', { name: 'Filters' }).click();
	await expect(page.getByRole('option', { name: 'test_label' })).toBeVisible();
	await expect(page.getByRole('option', { name: 't_st456' })).toBeVisible();
	await expect(page.getByRole('option', { name: 'notpresent' })).not.toBeVisible();
});
