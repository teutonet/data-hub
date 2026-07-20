import test, { expect } from '@playwright/test';
import { getRandomString, login, RandomTenantManager } from './helper/util';
import { MDB_FRONTEND } from './helper/urls';
import { DATA_HUB_ADMIN_PASSWORD, DATA_HUB_ADMIN_USERNAME } from './helper/keycloak';
import { docsScreenshot, fixupTenantName, fixupText } from './helper/screenshot';

const TENANT_MGR = new RandomTenantManager();

test('display names', async ({ page }) => {
	const TENANT = TENANT_MGR.with(`${getRandomString(6)}-1abc2`);

	await login(page, MDB_FRONTEND, DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('link', { name: 'Berechtigungsverwaltung' }).click();

	await test.step('test tenant display name', async () => {
		const DISPLAY_NAME = `${TENANT.split('-1abc2')[0]}!- -1$%)!ABC2`;
		const NEW_DISPLAY_NAME = `${TENANT}-123`;

		await page.getByRole('button', { name: 'Neuen Tenant anlegen' }).click();
		await page.getByRole('textbox', { name: 'Tenantname' }).fill(DISPLAY_NAME);
		expect(await page.getByRole('textbox', { name: 'URL der Ressource:' }).inputValue()).toBe(
			TENANT
		);
		await page.getByRole('button', { name: 'Erstellen' }).click();
		await expect(
			page.getByRole('heading', { name: `Tenantübersicht: ${DISPLAY_NAME}` })
		).toBeVisible();

		// rename resource
		await page.getByRole('tab', { name: 'Übersicht' }).click();
		await page.getByRole('button', { name: 'Name ändern' }).click();
		await page.getByRole('textbox', { name: 'Neuer Anzeigename' }).fill(NEW_DISPLAY_NAME);
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('heading', { name: NEW_DISPLAY_NAME })).toBeVisible(); // Page title
		await expect(page.getByText(`Tenant ${NEW_DISPLAY_NAME}`)).toBeVisible(); // Breadcrumbs
	});

	await test.step('test group display name', async () => {
		const SUFFIX = getRandomString(6);
		const DISPLAY_NAME = `Knuffingen ${SUFFIX}!!!`;
		const NEW_DISPLAY_NAME = `Knuffingen ${SUFFIX} 2`;
		const RESOURCE_NAME = `knuffingen-${SUFFIX}`;

		// create
		await page.getByRole('link', { name: 'Gruppen', exact: true }).click();
		await page.getByRole('button', { name: 'Neue Gruppe anlegen' }).click();

		// screenshot of groups create modal filled
		await page.getByText('Gruppenname').fill('Viewer MusterGruppe! 3');
		expect(await page.getByRole('textbox', { name: 'URL der Ressource:' }).inputValue()).toBe(
			'viewer-mustergruppe-3'
		);
		await fixupTenantName(page, TENANT);
		await docsScreenshot(
			'display-names-groups-create-modal-filled',
			page.locator('html').getByRole('document'),
			{
				highlight: false,
				zoom: 3
			}
		);

		// screenshot of groups create modal filled with special characters
		await page.getByText('Gruppenname').fill('ABC|abc_!§$?(  dEF  )...123');
		expect(await page.getByRole('textbox', { name: 'URL der Ressource:' }).inputValue()).toBe(
			'abcabc-def-123'
		);
		await docsScreenshot(
			'display-names-groups-create-modal-filled-special-chars',
			page.locator('html').getByRole('document'),
			{
				highlight: false,
				zoom: 3
			}
		);

		// screenshot of groups create modal with different resource url
		await page.getByText('Gruppenname').fill('nicht so eine url!');
		await page.getByRole('textbox', { name: 'URL der Ressource:' }).fill('so-eine-url-wollte-ich');
		await docsScreenshot(
			'display-names-groups-create-modal-filled-custom-url',
			page.locator('html').getByRole('document'),
			{
				highlight: false,
				zoom: 3
			}
		);

		await page.getByText('Gruppenname').fill(DISPLAY_NAME);
		expect(await page.getByRole('textbox', { name: 'URL der Ressource:' }).inputValue()).toBe(
			RESOURCE_NAME
		);

		await page.getByRole('button', { name: 'Erstellen' }).click();
		await expect(
			page.getByRole('heading', { name: `Gruppenübersicht: ${DISPLAY_NAME}` })
		).toBeVisible();

		// rename
		await page.getByRole('tab', { name: 'Übersicht' }).click();

		// screenshot of display name edit button
		await fixupTenantName(page, TENANT);
		await fixupText(page, DISPLAY_NAME, 'viewer');
		await page.getByLabel('Anzeigename').evaluate((el) => {
			(el as HTMLInputElement).value = 'viewer';
		});
		await page.getByLabel('Ressourcenname').evaluate((el) => {
			(el as HTMLInputElement).value = 'viewer';
		});
		await page.getByRole('button', { name: 'Anzeigename ändern' }).focus();
		await docsScreenshot(
			'display-names-edit-button',
			page.getByRole('button', { name: 'Anzeigename ändern' }),
			{
				highlight: false,
				cropZoom: 1.5
			}
		);

		await page.getByRole('button', { name: 'Name ändern' }).click();
		await page.getByRole('textbox', { name: 'Neuer Anzeigename' }).fill(NEW_DISPLAY_NAME);
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('heading', { name: NEW_DISPLAY_NAME })).toBeVisible(); // Page title
		await expect(page.getByText(`Gruppe ${NEW_DISPLAY_NAME}`)).toBeVisible(); // Breadcrumbs
	});

	await test.step('test viz-group display name', async () => {
		const SUFFIX = getRandomString(6);
		const DISPLAY_NAME = `TRAINSTATION ${SUFFIX}!!!`;
		const NEW_DISPLAY_NAME = `TRAINSTATION ${SUFFIX} 2`;
		const RESOURCE_NAME = `trainstation-${SUFFIX}`;

		await page.getByRole('link', { name: 'Visualisierungsgruppen', exact: true }).click();
		await page.getByRole('button', { name: 'Neue Visualisierungsgruppe anlegen' }).click();
		await page.getByText('Visualisierungsgruppenname').fill(DISPLAY_NAME);
		expect(await page.getByRole('textbox', { name: 'URL der Ressource:' }).inputValue()).toBe(
			RESOURCE_NAME
		);
		await page.getByRole('button', { name: 'Erstellen' }).click();
		await expect(
			page.getByRole('heading', { name: `Visualisierungsgruppenübersicht: ${DISPLAY_NAME}` })
		).toBeVisible();

		// rename
		await page.getByRole('tab', { name: 'Übersicht' }).click();
		await page.getByRole('button', { name: 'Name ändern' }).click();
		await page.getByRole('textbox', { name: 'Neuer Anzeigename' }).fill(NEW_DISPLAY_NAME);
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('heading', { name: NEW_DISPLAY_NAME })).toBeVisible(); // Page title
		await expect(page.getByText(`Visualisierungsgruppe ${NEW_DISPLAY_NAME}`)).toBeVisible(); // Breadcrumbs
	});

	await test.step('test project display name', async () => {
		const SUFFIX = getRandomString(6);
		const DISPLAY_NAME = `busStation- -${SUFFIX}...?`;
		const NEW_DISPLAY_NAME = `busStation ${SUFFIX} 2`;
		const RESOURCE_NAME = `busstation-${SUFFIX}`;

		await page.getByRole('link', { name: 'Projekte', exact: true }).click();
		await page.getByRole('button', { name: 'Neues Projekt anlegen' }).click();
		await page.getByText('Projektname').fill(DISPLAY_NAME);
		expect(await page.getByRole('textbox', { name: 'URL der Ressource:' }).inputValue()).toBe(
			RESOURCE_NAME
		);
		await page.getByRole('button', { name: 'Erstellen' }).click();
		await expect(
			page.getByRole('heading', { name: `Projektübersicht: ${DISPLAY_NAME}` })
		).toBeVisible();

		// rename
		await page.getByRole('tab', { name: 'Übersicht' }).click();
		await page.getByRole('button', { name: 'Name ändern' }).click();
		await page.getByRole('textbox', { name: 'Neuer Anzeigename' }).fill(NEW_DISPLAY_NAME);
		await page.getByRole('button', { name: 'Speichern' }).click();
		await expect(page.getByRole('heading', { name: NEW_DISPLAY_NAME })).toBeVisible(); // Page title
		await expect(page.getByText(`Projekt ${NEW_DISPLAY_NAME}`)).toBeVisible(); // Breadcrumbs
	});
});
