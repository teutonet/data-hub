import { test, expect } from '@playwright/test';
import { login, RandomTenantManager } from './helper/util';
import { createResources, createTestUserViaApi, DATA_HUB_ADMIN_PASSWORD } from './helper/keycloak';
import { MDB_FRONTEND } from './helper/urls';

const TENANT_MGR = new RandomTenantManager();

test('edit sensorproperties', async ({ page }) => {
	const tenant = TENANT_MGR.get();
	await createResources([`tenants/${tenant}/projects/trainstation`]);
	const user = await createTestUserViaApi([`${tenant}/admin`]);
	await login(page, MDB_FRONTEND, user.username, DATA_HUB_ADMIN_PASSWORD);
	await page.locator('#activeProjectButton').click();
	await page
		.getByRole('tooltip')
		.getByRole('button', { name: `${tenant}.trainstation` })
		.click();
	await page.getByRole('link', { name: 'Sensorverwaltung' }).click();
	await page.getByRole('link', { name: 'Sensortypen' }).click();
	await test.step('create sensortype', async () => {
		await page.getByRole('button', { name: 'Neuen Sensortyp erstellen' }).click();
		await page.getByRole('textbox', { name: 'Sensorname' }).fill('test');
		await page.getByRole('button', { name: 'Neue Sensoreigenschaft' }).click();
		await page.getByLabel('Eigenschaft').selectOption({
			label: 'airTemperature (Einheit: °C, Metrikname: air_temperature_degrees_celsius)'
		});
		await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('cell', { name: 'air_temperature_degrees_celsius' })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'airTemperature' })).toBeVisible();
		await page.getByRole('button', { name: 'Neue Sensoreigenschaft' }).click();
		await page
			.getByLabel('Eigenschaft')
			.selectOption({ label: 'batteryLevel (Einheit: %, Metrikname: battery_level_percents)' });
		await page.getByRole('textbox', { name: 'Alias' }).fill('BAT');
		await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('cell', { name: 'battery_level_percents' })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'batteryLevel (Alias: BAT)' })).toBeVisible();
		await page
			.getByRole('row', { name: 'batteryLevel' })
			.getByRole('button', { name: 'Bearbeiten' })
			.click();
		await page.getByRole('textbox', { name: 'Alias' }).fill('BAT2');
		await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('cell', { name: 'batteryLevel (Alias: BAT2)' })).toBeVisible();
		await page.getByRole('button', { name: 'Speichern' }).click();
	});
	await test.step('edit sensortype', async () => {
		await expect(page.getByRole('heading', { name: 'Sensortyp test bearbeiten' })).toBeVisible();
		await page
			.getByRole('row', { name: 'batteryLevel' })
			.getByRole('button', { name: 'Bearbeiten' })
			.click();
		await page.getByRole('textbox', { name: 'Alias' }).fill('');
		await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('cell', { name: 'batteryLevel', exact: true })).toBeVisible();
		await page
			.getByRole('row', { name: 'airTemperature' })
			.getByRole('button', { name: 'Bearbeiten' })
			.click();
		await page.getByRole('textbox', { name: 'Alias' }).fill('ALI');
		await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('cell', { name: 'airTemperature (Alias: ALI)' })).toBeVisible();
		// changes are saved immediately
		await page.reload();
		await expect(page.getByRole('cell', { name: 'airTemperature (Alias: ALI)' })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'batteryLevel', exact: true })).toBeVisible();
	});
});
