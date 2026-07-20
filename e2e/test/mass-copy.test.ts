import test, { expect, Page } from 'playwright/test';
import { checkAndDismissToast, getRandomString, login, RandomTenantManager } from './helper/util';
import { MdbApi } from './helper/mdb-api';
import { MDB_FRONTEND } from './helper/urls';
import {
	createResources,
	createResourceToken,
	DATA_HUB_ADMIN_PASSWORD,
	DATA_HUB_ADMIN_USERNAME
} from './helper/keycloak';

const TENANT_MGR = new RandomTenantManager();

async function traverseCopyDialog(
	page: Page,
	projectName: string,
	expectedCountSelect: number,
	expectedCountToast: number,
	copySensorType = false,
	overrideValues = false
) {
	await page.getByRole('button', { name: 'Filter' }).click();
	await page.getByRole('button', { name: 'In anderes Projekt kopieren' }).click();
	await expect(page.getByText('0 ausgewählt')).toBeVisible();
	if (copySensorType) {
		await page
			.locator('label')
			.filter({ hasText: 'Sensortyp in Zielprojekt' })
			.locator('span')
			.click();
	}
	if (overrideValues) {
		await page
			.getByRole('checkbox', {
				name: 'Bereits existierende Sensoren in Zielprojekt überschreiben'
			})
			.check({ force: true });
	}
	await page.getByRole('combobox', { name: 'Zielprojekt' }).selectOption(projectName);

	const submitButton = page.getByRole('button', {
		name: 'Ausgewählte Sensoren jetzt ins Zielprojekt kopieren'
	});
	await expect(submitButton).toBeDisabled();
	await page.getByRole('button', { name: 'Alle auswählen' }).click();
	await expect(page.getByText(`${expectedCountSelect} ausgewählt`)).toBeVisible();
	await expect(submitButton).not.toBeDisabled();
	await submitButton.click();
	await checkAndDismissToast(
		`Es wurden ${expectedCountToast} Sensoren erfolgreich ins Projekt ${projectName} kopiert.`,
		page
	);
}

test.describe('sensor mass copy', () => {
	let tenantNameA: string;
	let tenantNameB: string;
	let postfixA: string;
	let postfixB: string;
	let sensorTypeAName: string;
	let tenantAClient: MdbApi;

	test.beforeAll(async () => {
		postfixA = getRandomString(6);
		postfixB = getRandomString(6);
		tenantNameA = TENANT_MGR.with(postfixA);
		tenantNameB = TENANT_MGR.with(postfixB);

		await createResources([
			`tenants/${tenantNameA}/projects/busterminal`,
			`tenants/${tenantNameB}/projects/busterminal`
		]);

		const { username, password } = await createResourceToken(tenantNameA, 'busterminal', 'token1');
		const tenantAuserName = username;
		const tenantAPassword = password;

		await createResourceToken(tenantNameB, 'busterminal', 'token2');

		tenantAClient = new MdbApi(`${tenantNameA}.busterminal`, tenantAuserName, tenantAPassword);

		sensorTypeAName = `TestTyp-${postfixA}`;
		const sensorTypeA = await tenantAClient.createSensorTypeWithExistingProperties(
			sensorTypeAName,
			[
				{
					name: 'airPressure',
					alias: null
				},
				{
					name: 'windSpeed',
					alias: null
				}
			]
		);

		for (let i = 0; i < 5; i++) {
			await tenantAClient.createThing(sensorTypeA, `SensorA-${postfixA}-${i}`, 'activated');
		}
	});

	test('dependent', async ({ page }) => {
		await test.step('copy A to B', async () => {
			await page.goto(MDB_FRONTEND);
			await page.waitForLoadState();
			await login(page, MDB_FRONTEND, DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD);
			await page.getByRole('link', { name: `${tenantNameA}.busterminal` }).click();
			await page.getByRole('button', { name: 'Sensorverwaltung', exact: true }).click();
			await page.getByRole('link', { name: 'Sensoren', exact: true }).click();
			await traverseCopyDialog(page, `${tenantNameB}.busterminal`, 5, 5);
			await page.getByText(`Projekt: ${tenantNameA}.busterminal`).click();
			await page.getByRole('button', { name: `${tenantNameB}.busterminal` }).click();
			await page.getByRole('link', { name: 'Sensoren', exact: true }).click();
			await page.waitForLoadState();
			await expect(page.getByText('created')).toHaveCount(5);
			await expect(page.getByText(sensorTypeAName)).not.toBeVisible();
		});

		await test.step('attempt copy from A to B with sensors already there', async () => {
			await page.goto(MDB_FRONTEND);
			await page.waitForLoadState();
			await page.getByRole('link', { name: `${tenantNameA}.busterminal` }).click();
			await page.getByRole('button', { name: 'Sensorverwaltung', exact: true }).click();
			await page.getByRole('link', { name: 'Sensoren', exact: true }).click();
			await traverseCopyDialog(page, `${tenantNameB}.busterminal`, 5, 0);
		});

		await test.step('copy A to B with value override', async () => {
			await page.goto(MDB_FRONTEND);
			await page.waitForLoadState();
			await page.getByRole('link', { name: `${tenantNameA}.busterminal` }).click();
			await page.getByRole('button', { name: 'Sensorverwaltung', exact: true }).click();
			await page.getByRole('link', { name: 'Sensoren', exact: true }).click();
			await page.getByRole('row').nth(1).click();
			await page.getByRole('textbox', { name: 'Name', exact: true }).fill('MODIFIED');
			await page.getByRole('button', { name: 'Änderungen Speichern' }).click();
			await page.getByRole('link', { name: 'Sensoren', exact: true }).click();
			await traverseCopyDialog(page, `${tenantNameB}.busterminal`, 5, 5, false, true);
			await page.getByText(`Projekt: ${tenantNameA}.busterminal`).click();
			await page.getByRole('button', { name: `${tenantNameB}.busterminal` }).click();
			await page.getByRole('link', { name: 'Sensoren', exact: true }).click();
			await page.waitForLoadState();
			await expect(page.getByText('MODIFIED')).toBeVisible();
		});
	});

	test('copy A to B with sensortype', async ({ page }) => {
		const tenantName = TENANT_MGR.get();
		const projectName = `${tenantName}.busterminal`;
		await createResources([`tenants/${tenantName}/projects/busterminal`]);
		const { username, password } = await createResourceToken(tenantName, 'busterminal', 'test3');
		const client = new MdbApi(projectName, username, password);
		await client.createSensorType(sensorTypeAName);

		await page.goto(MDB_FRONTEND);
		await page.waitForLoadState();
		await login(page, MDB_FRONTEND, DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD);
		await page.getByRole('link', { name: `${tenantNameA}.busterminal` }).click();
		await page.getByRole('button', { name: 'Sensorverwaltung', exact: true }).click();

		await page.getByRole('link', { name: 'Sensoren', exact: true }).click();
		await traverseCopyDialog(page, projectName, 5, 5, true);
		await page.getByText(`Projekt: ${tenantNameA}.busterminal`).click();
		await page.getByRole('button', { name: projectName }).click();
		await page.getByRole('link', { name: 'Sensoren', exact: true }).click();
		await page.waitForLoadState();
		await expect(page.getByText('activated')).toHaveCount(5);
		await expect(page.getByText(sensorTypeAName).first()).toBeVisible();
	});
});
