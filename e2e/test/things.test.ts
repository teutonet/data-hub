import test, { expect } from 'playwright/test';
import {
	createResources,
	createResourceToken,
	createTestUserViaApi,
	DATA_HUB_ADMIN_PASSWORD
} from './helper/keycloak';
import { getRandomString, login, RandomTenantManager } from './helper/util';
import { MdbApi, Thing } from './helper/mdb-api';
import { MDB_FRONTEND } from './helper/urls';

const TENANT_MGR = new RandomTenantManager();

test('test-for-thing-error', { tag: '@thing-error' }, async ({ page }) => {
	const testPostfix = getRandomString(6);

	const tenantName = TENANT_MGR.with(testPostfix);

	// create two projects because of the way the automatic project selection in frontend works
	await createResources([
		`tenants/${tenantName}/projects/trainstation`,
		`tenants/${tenantName}/projects/trainstation2`
	]);
	const { username: tokenUsername, password: tokenPassword } = await createResourceToken(
		tenantName,
		'trainstation',
		'test'
	);

	await createTestUserViaApi([`${tenantName}/admin`], `admin-${testPostfix}`);

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

	await page.goto(MDB_FRONTEND);
	await page.getByLabel('Username or email').fill(`admin-${testPostfix}@example.com`);
	await page.getByLabel('Password', { exact: true }).fill(DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign In' }).click();

	await expect(page.getByRole('heading', { name: 'Willkommen im  DataHub' })).toBeVisible();
	await expect(page.getByText('Fehler aufgetreten')).toBeVisible();
	await page.getByText('DataHub Open main menu').click();
	await page.getByRole('button', { name: 'Sensorverwaltung', exact: true }).click();
	const subMenuButton = page.getByRole('link', { name: 'Sensorfehler' }).first();
	// prevent playwright from clicking on the not yet working link
	await expect(subMenuButton).toHaveAttribute('href', '/p/all/sensorerrors');
	await subMenuButton.click();
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
	await page.goto(MDB_FRONTEND);
	await expect(page.getByRole('heading', { name: 'Willkommen im DataHub' })).toBeVisible();
	await expect(page.getByText('Fehler aufgetreten')).toHaveCount(0);
});

test('custom labels', async ({ page }) => {
	const tenant = TENANT_MGR.get();
	await createResources([`tenants/${tenant}/projects/trainstation`]);
	const user = await createTestUserViaApi([`${tenant}/admin`]);
	await login(page, MDB_FRONTEND, user.username, DATA_HUB_ADMIN_PASSWORD);
	await page.locator('#activeProjectButton').click();
	await page
		.getByRole('tooltip')
		.getByRole('button', { name: `${tenant}.trainstation` })
		.click();
	await test.step('create thing', async () => {
		await page.getByRole('link', { name: 'Sensorverwaltung' }).click();
		await page.getByRole('link', { name: 'Sensor erstellen' }).click();
		await page.getByRole('textbox', { name: 'Name' }).fill('test');
		await page.getByRole('textbox', { name: 'DevEUI' }).fill('1234');
		await page.getByLabel('Sensortyp').selectOption({ label: 'Ohne Sensortypen' });
		await page.getByRole('button', { name: 'Neues benutzerdefiniertes Label erstellen' }).click();
		await page.getByRole('textbox', { name: 'Schlüssel' }).fill('custom_label');
		await page.getByRole('textbox', { name: 'Wert' }).fill('123');
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('cell', { name: 'custom_label' })).toBeVisible();
		await page.getByRole('button', { name: 'Label bearbeiten' }).click();
		await page.getByRole('textbox', { name: 'Schlüssel' }).fill('testkey');
		await page.getByRole('textbox', { name: 'Wert' }).fill('1235');
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('cell', { name: 'testkey' })).toBeVisible();
		await page.getByRole('button', { name: 'Sensor anlegen', exact: true }).click();
	});
	await test.step('update thing', async () => {
		await expect(page.getByRole('heading', { name: 'Sensor-test' })).toBeVisible();
		await page.getByRole('button', { name: 'Neues benutzerdefiniertes Label erstellen' }).click();
		await page.getByRole('textbox', { name: 'Schlüssel' }).fill('key2');
		await page.getByRole('textbox', { name: 'Wert' }).fill('asdfg');
		await page.getByRole('button', { name: 'Speichern', exact: true }).click();
		await expect(page.getByRole('cell', { name: 'key2' })).toBeVisible();
	});
});
