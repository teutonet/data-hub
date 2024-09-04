import test, { expect, Page } from 'playwright/test';
import { DATA_HUB_ADMIN_PASSWORD, DATA_HUB_ADMIN_USERNAME } from './helper/keycloak';
import { getRandomString } from './helper/util';
import { MdbApi, Thing } from './helper/mdb-api';
import { randomUUID } from 'crypto';
import { EXPORT, GRAFANA, MDB_FRONTEND } from './helper/urls';
import axios from 'axios';
import { Agent } from 'https';

async function checkSensorTypeSelectOptions(
	page: Page,
	expectedOptions: string[] = ['Ohne Sensortypen', 'Test Typ', 'Super Test Typ']
) {
	for (const text of expectedOptions) {
		await expect(
			page.getByLabel('Sensortyp').getByRole('option', { name: text, exact: true })
		).toBeHidden();
	}
}

test('auto-create', async ({ page, context }) => {
	const testPostfix = getRandomString(6);
	console.log(`testPostfix: ${testPostfix}`);

	const tenantName = `knuffingen-${testPostfix}`;

	await page.goto(`${MDB_FRONTEND}api/tenants`);
	await page.getByLabel('Username or email').fill(DATA_HUB_ADMIN_USERNAME);
	await page.getByLabel('Password').fill(DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign In' }).click();
	await page.getByRole('button', { name: 'Neuen Tenant anlegen' }).click();
	await page.getByPlaceholder(' ').fill(tenantName);
	await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
	// TODO: this produces race conditions in keycloak otherwise
	await page.waitForTimeout(1000);
	await page.getByRole('button', { name: 'Projekte' }).click();
	await page.getByRole('button', { name: 'Neues Projekt anlegen' }).click();
	await page.getByPlaceholder(' ').fill('trainstation');
	await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
	await page.waitForTimeout(1000);
	await page.getByRole('button', { name: 'Neuen Token anlegen' }).click();
	await page.getByPlaceholder(' ').fill('test');
	await page.getByRole('dialog').getByRole('button', { name: 'Token erzeugen' }).click();
	const tokenUsername = await page.getByLabel('Username').inputValue();
	const tokenPassword = await page.getByLabel('Passwort').inputValue();
	await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();

	// workaround, the token should get refreshed automatically to contain the new project
	await page.reload();

	const mdbApi = new MdbApi(`${tenantName}.trainstation`, tokenUsername, tokenPassword);
	await mdbApi.createSensorTypeWithExistingProperties('Test Typ', [
		{
			name: 'airPressure',
			alias: null
		},
		{
			name: 'windSpeed',
			alias: null
		}
	]);
	await mdbApi.createSensorTypeWithExistingProperties('Super Test Typ', [
		{
			name: 'airPressure',
			alias: null
		},
		{
			name: 'windSpeed',
			alias: null
		},
		{
			name: 'healthStatus',
			alias: null
		}
	]);

	// send some initial data to create the sensors
	// these will get auto assigned because there is only 1 possible sensor type
	const testTypThing: Thing = { deveui: randomUUID(), appid: 'test', devid: 'test' };
	const testTypThingExtra: Thing = {
		deveui: randomUUID(),
		appid: 'test',
		devid: 'test',
		location: [52.022246162285, 8.532277249677]
	};
	// these won't get auto assigned because both sensor types are possible
	const superTestTypThing: Thing = { deveui: randomUUID(), appid: 'test', devid: 'test' };
	const superTestTypThingExtra: Thing = { deveui: randomUUID(), appid: 'test', devid: 'test' };

	await mdbApi.remoteWriteVarsLorawan(testTypThing, {
		airPressure: 100,
		windSpeed: 20
	});
	await mdbApi.remoteWriteVarsLorawan(testTypThingExtra, {
		airPressure: 101,
		windSpeed: 19,
		birds: 5
	});
	await mdbApi.remoteWriteVarsLorawan(superTestTypThing, {
		airPressure: 102,
		windSpeed: 18,
		healthStatus: 'good'
	});
	await mdbApi.remoteWriteVarsLorawan(superTestTypThingExtra, {
		airPressure: 103,
		windSpeed: 17,
		healthStatus: 'good',
		rainbow: '🌈'
	});

	await page.getByRole('link', { name: 'MetaData_DB' }).click();
	await page.getByRole('link', { name: `knuffingen-${testPostfix}.trainstation` }).click();

	await page
		.locator('a')
		.filter({ hasText: /^Neue Sensoren$/ })
		.click();
	await page.getByText(`auto-${testTypThing.deveui}`).click();
	await expect(page.getByLabel('Sensortyp')).toContainText('Test Typ');
	await page.getByRole('button', { name: 'Speichern & Sensor Aktivieren' }).click();

	await page
		.locator('a')
		.filter({ hasText: /^Neue Sensoren$/ })
		.click();
	await page.getByText(`auto-${testTypThingExtra.deveui}`).click();
	await expect(page.getByLabel('Sensortyp')).toContainText('Test Typ');
	await expect(page.getByLabel('Breitengrad (latitude)')).toHaveValue('52.022246162285');
	await expect(page.getByLabel('Längengrad (longitude)')).toHaveValue('8.532277249677');
	await page.getByRole('button', { name: 'Speichern & Sensor Aktivieren' }).click();

	await page
		.locator('a')
		.filter({ hasText: /^Neue Sensoren$/ })
		.click();
	await page.getByText(`auto-${superTestTypThing.deveui}`).click();
	await checkSensorTypeSelectOptions(page);
	await expect(page.getByLabel('Sensortyp')).toHaveValue('');

	await expect(page.getByRole('button', { name: 'Speichern & Sensor Aktivieren' })).toBeDisabled();
	await page.getByRole('button', { name: 'Sensortyp finden' }).click();
	await expect(page.getByText('healthStatus: good')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Super Test Typ Auswählen' })).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Test Typ Auswählen', exact: true })
	).toBeVisible();
	await page.getByRole('heading', { name: 'Super Test Typ Auswählen' }).getByRole('button').click();
	await page.getByRole('button', { name: 'Speichern & Sensor Aktivieren' }).click();

	await page
		.locator('a')
		.filter({ hasText: /^Neue Sensoren$/ })
		.click();
	await page.getByText(`auto-${superTestTypThingExtra.deveui}`).click();

	await checkSensorTypeSelectOptions(page);
	await expect(page.getByLabel('Sensortyp')).toHaveValue('');

	await expect(page.getByRole('button', { name: 'Speichern & Sensor Aktivieren' })).toBeDisabled();
	await page.getByRole('button', { name: 'Sensortyp finden' }).click();
	await expect(page.getByText('healthStatus: good')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Super Test Typ Auswählen' })).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Test Typ Auswählen', exact: true })
	).toBeVisible();
	await page.getByRole('heading', { name: 'Super Test Typ Auswählen' }).getByRole('button').click();
	await page.getByRole('button', { name: 'Speichern & Sensor Aktivieren' }).click();

	// write vars again
	await mdbApi.remoteWriteVarsLorawan(testTypThing, {
		airPressure: 100,
		windSpeed: 20
	});
	await mdbApi.remoteWriteVarsLorawan(testTypThingExtra, {
		airPressure: 100,
		windSpeed: 20,
		birds: 5
	});
	await mdbApi.remoteWriteVarsLorawan(superTestTypThing, {
		airPressure: 100,
		windSpeed: 20,
		healthStatus: 'good'
	});
	await mdbApi.remoteWriteVarsLorawan(superTestTypThingExtra, {
		airPressure: 100,
		windSpeed: 20,
		healthStatus: 'good',
		rainbow: '🌈'
	});

	// now they should show up in grafana
	await context.clearCookies();

	await page.goto(GRAFANA);
	await page.getByLabel('Username or email').fill(DATA_HUB_ADMIN_USERNAME);
	await page.getByLabel('Password').fill(DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign In' }).click();
	await page.getByLabel('Change organization').click();
	await page.getByLabel('Select options menu').getByText(`${tenantName}:admin`).click();
	await page.getByLabel('Toggle menu').click();
	await page.getByTestId('navbarmenu').getByRole('link', { name: 'Explore' }).click();

	await page.getByLabel('Select a data source').click();
	await page.getByText('Prometheus', { exact: true }).click();
	await page.getByLabel('Metric').click();
	await page.getByText('air_pressure_mbar', { exact: true }).click();

	await page.getByLabel('Select label').click();
	await page.getByText('healthStatus', { exact: true }).click();
	await page.getByLabel('Select value').click();
	await page.getByText('good', { exact: true }).click();
	await page.getByTestId('query-editor-row').getByLabel('Add').click();
	await page.getByLabel('Select label').nth(1).click();
	await page.getByText('deveui', { exact: true }).click();
	await page.getByLabel('Select value').nth(1).click();

	// only "Super Test Typ" is present
	for (const thing of [superTestTypThing, superTestTypThingExtra]) {
		await expect(page.getByText(thing.deveui, { exact: true })).toBeVisible();
	}
	for (const thing of [testTypThing, testTypThingExtra]) {
		await expect(page.getByText(thing.deveui, { exact: true })).not.toBeVisible();
	}
	await page.getByText(superTestTypThing.deveui, { exact: true }).click();

	await page.getByLabel('remove').nth(2).click();

	await page.getByLabel('Select label').click();
	await page.getByText('deveui', { exact: true }).click();
	await page.getByLabel('Select value').click();

	// check that all things are present
	for (const thing of [
		testTypThing,
		testTypThingExtra,
		superTestTypThing,
		superTestTypThingExtra
	]) {
		await expect(page.getByText(thing.deveui, { exact: true })).toBeVisible();
	}

	// check geojson export

	const httpClient = axios.create({
		httpsAgent: new Agent({ rejectUnauthorized: false })
	});

	const response = await httpClient.get(
		`${EXPORT}geojson?project=${tenantName}.trainstation&query=air_pressure_mbar`
	);
	// there is only one sensortype with a location
	expect(response.data).toEqual({
		type: 'FeatureCollection',
		features: [
			{
				geometry: { coordinates: [8.5322773642838, 52.022246243432164], type: 'Point' },
				properties: {
					__name__: 'air_pressure_mbar',
					appid: 'test',
					deveui: testTypThingExtra.deveui,
					devid: testTypThingExtra.devid,
					geohash: 'u1npfnm583x4',
					name: `auto-${testTypThingExtra.deveui}`,
					sensortype_id: expect.any(String),
					timestamp: expect.any(String),
					value: 100
				},
				type: 'Feature'
			}
		]
	});
});
