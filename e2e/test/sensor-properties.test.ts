import test, { expect } from 'playwright/test';
import { aquireTokenViaDeviceCode } from './helper/mdb-api';
import { DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD } from './helper/keycloak';
import { signInAdminKeycloak } from './helper/keycloak';
import { Agent } from 'https';
import axios from 'axios';
import { KEYCLOAK } from './helper/urls';
import { getRandomString } from './helper/util';
import { MDB_FRONTEND } from './helper/urls';
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
		await page.getByRole('link', { name: 'Projekt auswählen' }).click();
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
