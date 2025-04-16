import test, { expect } from 'playwright/test';
import {
	createRealmAdminClient,
	createTestUserViaApi,
	DATA_HUB_ADMIN_PASSWORD
} from './helper/keycloak';
import { getRandomString } from './helper/util';
import { MdbApi, Thing } from './helper/mdb-api';
import { KEYCLOAK, MDB_FRONTEND } from './helper/urls';

test('test-for-thing-error', { tag: '@thing-error' }, async ({ page }) => {
	const testPostfix = getRandomString(6);
	console.log(`testPostfix: ${testPostfix}`);

	const tenantName = `knuffingen-${testPostfix}`;

	const realmAdminClient = await createRealmAdminClient();
	await realmAdminClient.put(`${KEYCLOAK}realms/udh/data-hub/tenants/${tenantName}/`);
	await realmAdminClient.put(
		`${KEYCLOAK}realms/udh/data-hub/tenants/${tenantName}/projects/trainstation/`
	);
	const response = await realmAdminClient.put<{ username: string; password: string }>(
		`${KEYCLOAK}realms/udh/data-hub/tenants/${tenantName}/projects/trainstation/sensor-credentials/test`
	);
	const { username: tokenUsername, password: tokenPassword } = response.data;

	await createTestUserViaApi([`knuffingen-${testPostfix}/admin`], `admin-${testPostfix}`);

	const mdbApi = new MdbApi(`${tenantName}.trainstation`, tokenUsername, tokenPassword);
	const thingName = 'sauce_meter';

	const sensortypeId = await mdbApi.createSensorTypeWithExistingProperties('sauce_type', [
		{
			name: 'airPressure',
			alias: null
		}
	]);

	const deveui = await mdbApi.createThing(sensortypeId, thingName, 'activated');
	const testSensorThing: Thing = { deveui: deveui, appid: 'test', devid: 'test' };

	await mdbApi.remoteWriteVarsLorawan(testSensorThing, {
		airPressure: 100
	});

	// post invalid string instead of number (returns 400) and check if error appears
	try {
		await mdbApi.remoteWriteVarsLorawan(testSensorThing, {
			airPressure: 'error'
		});
	} catch (e) {
		expect((e as Error).message).toContain('400');
	}

	await page.goto(MDB_FRONTEND + 'overview');
	await page.getByLabel('Username or email').fill(`admin-${testPostfix}@example.com`);
	await page.getByLabel('Password', { exact: true }).fill(DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign In' }).click();

	await expect(page.getByRole('heading', { name: 'Willkommen im MetaData_DB Hub' })).toBeVisible();
	await expect(page.getByText('Fehler aufgetreten')).toBeVisible();
	await page.getByText('MetaData_DB Open main menu').click();
	await page.getByRole('link', { name: 'Sensorfehler' }).first().click();
	//wait and click again, produces race conditions in firefox otherwise
	await page.waitForTimeout(500);
	await page.getByRole('link', { name: 'Sensorfehler' }).first().click();
	await expect(page.getByRole('heading', { name: 'Aufgetretene Sensorfehler' })).toBeVisible();
	await expect(
		page.getByRole('link', { name: `${tenantName}.trainstation | ${thingName}` })
	).toBeVisible();
	await page.getByRole('link', { name: `${tenantName}.trainstation | ${thingName}` }).click();
	await expect(page.getByText('Es ist ein Fehler aufgetreten')).toBeVisible();

	// post valid value and check if the error message is gone
	await mdbApi.remoteWriteVarsLorawan(testSensorThing, {
		airPressure: 100
	});
	await page.goto(MDB_FRONTEND + 'overview');
	await expect(page.getByRole('heading', { name: 'Willkommen im MetaData_DB Hub' })).toBeVisible();
	await expect(page.getByText('Fehler aufgetreten')).toHaveCount(0);
});
