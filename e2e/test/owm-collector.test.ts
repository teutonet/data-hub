import { test, expect } from '@playwright/test';
import {
	createResources,
	DATA_HUB_ADMIN_PASSWORD,
	DATA_HUB_ADMIN_USERNAME
} from './helper/keycloak';
import { GRAFANA, MDB_FRONTEND } from './helper/urls';
import { checkGrafanaMenuState, login } from './helper/util';
import { RandomTenantManager } from './helper/util';
import { docsScreenshot } from './helper/screenshot';

const TENANT_MGR = new RandomTenantManager();

test('Create a OWMCollector, view data in grafana and delete the Collector', async ({ page }) => {
	const tenantName = TENANT_MGR.get();

	const projectName = `${tenantName}-owm-project`;
	const collectorName = `${tenantName}-owm-collector`;

	await createResources([`tenants/${tenantName}/projects/${projectName}`]);
	await login(page, MDB_FRONTEND, DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('link', { name: 'Berechtigungsverwaltung' }).click();

	await page.getByRole('button', { name: tenantName, exact: true }).click();
	await page.getByRole('link', { name: 'Projekte' }).click();
	await page.getByRole('link', { name: projectName }).click();

	// create a Collector
	await page.getByRole('tab', { name: 'OpenWeatherMap-Kollektoren' }).click();

	await docsScreenshot(
		'owm-collector-tab',
		page.getByRole('tab', { name: 'OpenWeatherMap-Kollektoren' }),
		{
			crop: false,
			highlight: true
		}
	);

	await page.getByRole('button', { name: '+ Kollektor' }).click();
	await docsScreenshot(
		'owm-collector-create-form',
		page.getByText('Neuen OpenWeatherMap-Kollektor anlegen Close modal'),
		{
			highlight: false
		}
	);

	await page.getByLabel('Kollektorname').fill(collectorName);
	await page.getByLabel('Token').fill('exampleToken');
	await page.getByLabel('Breitengrad').fill('123');
	await page.getByLabel('Längengrad').fill('123.123');
	await page.getByLabel('Abfrage Interval (in Sekunden)').fill('10');
	await page
		.getByRole('button', { name: 'OpenWeatherMap-Kollektor erstellen', exact: true })
		.click();
	await expect(page.getByRole('cell', { name: collectorName })).toBeVisible();
	await page.waitForTimeout(11000);

	await page.goto(GRAFANA);

	await checkGrafanaMenuState(page);
	await page.reload();
	await page.getByRole('combobox', { name: 'Change organization' }).click();
	await page.getByLabel('Select options menu').getByText(`${tenantName}:admin`).click();
	await checkGrafanaMenuState(page);
	await page
		.getByTestId('data-testid navigation mega-menu')
		.getByRole('link', { name: 'Drilldown' })
		.click();
	await page.locator('#pageContent').getByRole('link', { name: 'Metrics' }).click();

	await page.locator('#ds').click();
	await page.getByTestId('data-testid Select option').getByText('Prometheus').click();

	// check if there are metrics with the collector_name label
	await page.reload();
	await page.getByRole('combobox', { name: 'Filters' }).click();
	await docsScreenshot(
		'owm-collector-grafana-filter-by-name',
		page.getByRole('option', { name: 'collector_name' })
	);
	await page.getByRole('option', { name: 'collector_name' }).click();
	await page.getByRole('option', { name: '= Equals' }).click();
	await page.getByRole('option', { name: collectorName, exact: true }).click();

	await expect(page.getByText('air_temperature_degrees_celsius')).toBeVisible();
	await expect
		.poll(
			async () => {
				await page.getByTestId('data-testid RefreshPicker run button').click();
				return await page.locator('div', { hasText: /^No data$/ }).count();
			},
			{
				timeout: 10000,
				intervals: [500, 1000, 1500]
			}
		)
		.toBe(0);
	await expect(page.getByText('air_temperature_degrees_celsius')).toBeVisible();

	await page.goto(MDB_FRONTEND);
	await page.getByRole('link', { name: 'Berechtigungsverwaltung' }).click();
	await page.getByRole('button', { name: tenantName, exact: true }).click();
	await page.getByRole('link', { name: 'Projekte' }).click();
	await page.getByRole('link', { name: projectName, exact: true }).click();

	await page.getByRole('tab', { name: 'OpenWeatherMap-Kollektoren' }).click();
	await docsScreenshot('owm-collector-delete', page.getByRole('button', { name: 'Löschen' }));
	await page.getByRole('button', { name: 'Löschen' }).click();
});
