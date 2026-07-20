import { test, expect, Page } from 'playwright/test';
import { DATA_HUB_ADMIN_PASSWORD, createTestUserViaApi } from './helper/keycloak';
import { login, loginCreateProjectAndToken, RandomTenantManager } from './helper/util';
import { JUPYTERHUB } from './helper/urls';
import * as path from 'path';
import { MdbApi, Thing } from './helper/mdb-api';
import { randomUUID } from 'crypto';

const TENANT_MGR = new RandomTenantManager();

export async function waitForStartingJupyterServer(page: Page) {
	await expect(page.getByText('Your server is starting up.')).toBeVisible();
	await expect(page.getByText('Your server is starting up.')).toBeHidden({ timeout: 30000 });
}

export async function uploadJupyterNotebook(page: Page, filename: string) {
	const fileChooserPromise = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Upload Files' }).click();
	const fileChooser = await fileChooserPromise;
	await fileChooser.setFiles(path.join(__dirname, `jupyterhub-example-notebooks/${filename}`));

	await expect(page.getByLabel('Main Content').getByText(filename)).toBeVisible();
}

export async function stopJupyterServer(page: Page) {
	await page.getByRole('menuitem', { name: 'File' }).click();
	const page2Promise = page.waitForEvent('popup');
	await page.getByRole('menuitem', { name: 'Hub Control Panel' }).click();
	const page2 = await page2Promise;

	await expect(page2.getByRole('button', { name: 'Stop My Server' })).toBeVisible();
	await page2.getByRole('button', { name: 'Stop My Server' }).click();
}

test('login-logout', async ({ page }) => {
	const user = await createTestUserViaApi([]);
	await login(page, JUPYTERHUB, user.username, DATA_HUB_ADMIN_PASSWORD);

	await waitForStartingJupyterServer(page);
	await expect(
		page.getByRole('button', { name: 'Python 3 (ipykernel) Python 3' }).first()
	).toBeVisible();

	await stopJupyterServer(page);
});

test('run a minimal notebook', async ({ page }) => {
	const user = await createTestUserViaApi([]);
	await login(page, JUPYTERHUB, user.username, DATA_HUB_ADMIN_PASSWORD);

	await waitForStartingJupyterServer(page);
	await expect(
		page.getByRole('button', { name: 'Python 3 (ipykernel) Python 3' }).first()
	).toBeVisible();

	await uploadJupyterNotebook(page, 'hello-world.ipynb');

	await expect(page.getByText('print("hello world")')).toBeVisible();

	await expect(page.getByText('Python 3 (ipykernel) | Idle')).toBeVisible();

	await page.getByRole('menuitem', { name: 'Run' }).click();
	await page.getByRole('menuitem', { name: 'Run All Cells', exact: true }).click();
	await expect(page.getByText('hello world', { exact: true })).toBeVisible();

	await page.getByRole('menuitem', { name: 'File' }).click();
	await page.getByRole('menuitem', { name: 'Save Notebook Ctrl+S' }).click();
	await expect(page.getByText('Saving completed')).toBeVisible();

	await stopJupyterServer(page);
});

test('datahub library', async ({ page, context }) => {
	const tenantName = TENANT_MGR.get();

	const { username, password } = await loginCreateProjectAndToken(
		page,
		tenantName,
		'trainstation',
		'test'
	);

	const tokenUsername = username;
	const tokenPassword = password;

	// workaround, the token should get refreshed automatically to contain the new project
	await page.reload();

	await test.step('setup timeseries data', async () => {
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

		// send some initial data to create the sensor
		// this will get auto assigned because there is only 1 possible sensor type
		const testTypThing: Thing = { deveui: randomUUID(), appid: 'test', devid: 'test' };

		await mdbApi.remoteWriteVarsLorawan(testTypThing, {
			airPressure: 100,
			windSpeed: 20
		});

		await page.getByRole('link', { name: 'Datahub' }).click();
		await page.getByRole('link', { name: `${tenantName}.trainstation` }).click();

		await page.getByRole('button', { name: 'Sensorverwaltung' }).click();
		await page.getByRole('link', { name: 'Neue Sensoren', exact: true }).click();
		await page.getByText(`auto-${testTypThing.deveui}`).click();
		await expect(page.getByLabel('Sensortyp')).toContainText('Test Typ');
		await page.getByRole('button', { name: 'Speichern & Sensor Aktivieren' }).click();

		// write vars again
		await mdbApi.remoteWriteVarsLorawan(testTypThing, {
			airPressure: 105,
			windSpeed: 18
		});
	});

	await context.clearCookies();

	await test.step('verify in jupyterhub', async () => {
		const user = await createTestUserViaApi([`${tenantName}/admin`]);
		await login(page, JUPYTERHUB, user.username, DATA_HUB_ADMIN_PASSWORD);

		await waitForStartingJupyterServer(page);
		await expect(
			page.getByRole('button', { name: 'Python 3 (ipykernel) Python 3' }).first()
		).toBeVisible();

		await uploadJupyterNotebook(page, 'library.ipynb');

		await expect(page.getByText('Python 3 (ipykernel) | Idle')).toBeVisible();

		await expect(page.getByText('from _ import')).toBeVisible();

		await page.getByRole('menuitem', { name: 'Run' }).click();
		await page.getByRole('menuitem', { name: 'Run Selected Cell and All' }).click();
		await expect(page.getByText('Log in at https://login.')).toBeVisible();
		const page2Promise = page.waitForEvent('popup');
		await page.getByRole('link', { name: 'https://login.' }).click();
		const page2 = await page2Promise;
		await page2.getByText('Prometheus API (read)').click();
		await expect(page2.getByText('Prometheus API (read)')).toBeVisible();
		await page2.getByRole('button', { name: 'Yes' }).click();
		await expect(page.getByText('Log in at https://login.')).toBeVisible();

		await expect(page.getByText('Timeseries test succeeded')).toBeVisible();
		await expect(page.getByText('Bucket test succeeded')).toBeVisible();

		await stopJupyterServer(page);
	});
});
