import test, { Page, expect } from 'playwright/test';
import { GRAFANA, GRAFANA_PUBLIC, RESOURCE_API } from './helper/urls';
import {
	checkAndDismissGrafanaAlert,
	checkGrafanaMenuState,
	RandomTenantManager
} from './helper/util';
import { MdbApi } from './helper/mdb-api';
import {
	createResources,
	createResourceToken,
	createTestUserViaApi,
	DATA_HUB_ADMIN_PASSWORD,
	signInWith,
	withSetupClient
} from './helper/keycloak';
import { docsScreenshot } from './helper/screenshot';

const TENANT_MGR = new RandomTenantManager();

async function refreshUntil(
	page: Page,
	check: () => Promise<boolean>,
	refreshCount: number = 15,
	refreshInterval: number = 1000
) {
	while (refreshCount >= 0) {
		refreshCount--;
		if (await check()) {
			return;
		}
		await page.reload();
		await page.waitForTimeout(refreshInterval);
	}
	throw Error('Check is still false');
}

test('public-dashboard-sync create', async ({ page, context }) => {
	const tenant = TENANT_MGR.get();

	await createResources([
		`tenants/${tenant}/viz-groups/primary-group`,
		`tenants/${tenant}/viz-groups/secondary-group`
	]);

	await page.goto(GRAFANA);
	await signInNewUser(page, [`${tenant}/admin`]);

	const publicGrafanaPage = await context.newPage();
	await publicGrafanaPage.goto(`${GRAFANA_PUBLIC}dashboards`);

	// t1/g1 creates a private dashboard
	await checkGrafanaMenuState(page);
	await page.getByRole('combobox', { name: 'Change organization' }).click();
	await page.getByLabel('Select options menu').getByText(`${tenant}:primary-group`).click();
	await expect(page.getByRole('button', { name: 'Search...' })).toBeVisible();
	let orgId = Number.parseInt(new URL(page.url()).searchParams.get('orgId'));
	await page.goto(`${GRAFANA}dashboard/new?orgId=${orgId}&from=now-6h&to=now&timezone=browser`);
	await page.getByTestId('data-testid Add button').click();
	await page.getByTestId('data-testid Add new visualization menu item').click();
	await page.getByRole('button', { name: 'Save' }).click();
	await page.getByLabel('Save dashboard title field').fill('Test Private Dashboard 1');
	await page.getByTestId('data-testid Save dashboard drawer button').click();
	await checkAndDismissGrafanaAlert('Dashboard saved', page, true, false, true);
	await page.goto(GRAFANA);
	await expect(page.getByRole('button', { name: 'Search...' })).toBeVisible();
	// t1/g2 creates a public dashboard
	await checkGrafanaMenuState(page);
	await page.getByRole('combobox', { name: 'Change organization' }).click();
	await page.getByLabel('Select options menu').getByText(`${tenant}:secondary-group`).click();
	await expect(page.getByRole('button', { name: 'Search...' })).toBeVisible();
	orgId = Number.parseInt(new URL(page.url()).searchParams.get('orgId'));
	await page.goto(`${GRAFANA}dashboard/new?orgId=${orgId}&from=now-6h&to=now&timezone=browser`);
	await page.getByTestId('data-testid Add button').click();
	await page.getByTestId('data-testid Add new visualization menu item').click();
	await page.getByTestId('data-testid Back to dashboard button').click();
	await page.getByTestId('data-testid Dashboard settings').click();
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByLabel('Save dashboard title field').fill('Test Public Dashboard 1');
	await page.getByTestId('data-testid Save dashboard drawer button').click();
	await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Test Public Dashboard 1');
	await page.getByRole('textbox', { name: 'Tags' }).click();
	await page.getByRole('textbox', { name: 'Tags' }).fill('public');
	await page.getByRole('button', { name: 'Add' }).click();
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByTestId('data-testid Save dashboard drawer button').click();

	// ensure, the public dashboard is visible
	await refreshUntil(publicGrafanaPage, () =>
		publicGrafanaPage.getByText(`${tenant}:secondary-group`).isVisible()
	);
	await publicGrafanaPage.getByText(`${tenant}:secondary-group`).click();
	await expect(
		publicGrafanaPage.getByRole('link', { name: 'Test Public Dashboard 1' })
	).toBeVisible();
	await expect(publicGrafanaPage.getByText(`${tenant}:primary-group`)).not.toBeVisible();
});

async function signInNewUser(page: Page, groups: string[]) {
	const user = await createTestUserViaApi(groups);
	await signInWith(page, user.username, DATA_HUB_ADMIN_PASSWORD);
}

test('public-dashboard-sync folder', async ({ page, context }) => {
	const tenant = TENANT_MGR.get();

	await createResources([`tenants/${tenant}/viz-groups/public-dashboards`]);

	await page.goto(GRAFANA);
	await signInNewUser(page, [`${tenant}/admin`]);

	const publicGrafanaPage = await context.newPage();
	await publicGrafanaPage.goto(`${GRAFANA_PUBLIC}dashboards`);

	// create a folder and puts a public dashboard there
	await checkGrafanaMenuState(page);
	await page.getByRole('combobox', { name: 'Change organization' }).click();
	await page
		.getByLabel('Select options menu')
		.getByText(`${tenant}:public-dashboards`)
		.click({ timeout: 5000 });
	await checkGrafanaMenuState(page);
	await page
		.getByTestId('data-testid navigation mega-menu')
		.getByRole('link', { name: 'Dashboards' })
		.click();
	await page.locator('button').filter({ hasText: 'New' }).click();
	await page.getByRole('menuitem', { name: 'New folder' }).click();
	await page.getByLabel('Folder name').fill('Unterordner');
	await page.getByRole('button', { name: 'Create' }).click();
	await page.getByRole('link', { name: 'Create dashboard' }).click();
	await page.getByTestId('data-testid Dashboard settings').click();
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByLabel('Save dashboard title field').fill('Unterordner Dashboard');
	await page.getByTestId('data-testid Save dashboard drawer button').click();
	await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Unterordner Dashboard');
	await page.getByRole('textbox', { name: 'Tags' }).click();
	await page.getByRole('textbox', { name: 'Tags' }).fill('public');
	await page.getByRole('button', { name: 'Add' }).click();
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByTestId('data-testid Save dashboard drawer button').click();
	await checkAndDismissGrafanaAlert('Dashboard saved', page, true, false, true);
	// observe that the change is reflected
	await refreshUntil(publicGrafanaPage, () =>
		publicGrafanaPage.getByText(`${tenant}:public-dashboards`).isVisible()
	);
	await publicGrafanaPage.getByText(`${tenant}:public-dashboards`).click();

	// TODO: Rename Folder

	// make the dashboard private
	await page.getByRole('button', { name: 'Remove tag: public' }).click();
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByTestId('data-testid Save dashboard drawer button').click();

	// observe that it's gone from public
	await refreshUntil(
		publicGrafanaPage,
		async () => (await publicGrafanaPage.getByText(`${tenant}:public-dashboards`).count()) == 0
	);
});

test('public-dashboard-sync syncs datasource changes', async ({ page, context, browser }) => {
	if (context.browser().browserType().name() !== 'firefox') {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	}
	const tenant = TENANT_MGR.get();

	await createResources([`tenants/${tenant}/project/trainstation`]);

	await page.goto(GRAFANA);
	await signInNewUser(page, [`${tenant}/admin`]);

	const publicGrafanaPage = await context.newPage();
	await publicGrafanaPage.goto(`${GRAFANA_PUBLIC}dashboards`);

	// create a dashboard without data
	await page.getByLabel('New', { exact: true }).click();
	await page.getByRole('menuitem', { name: 'New dashboard' }).click();
	await page.getByTestId('data-testid Add button').click();
	await page.getByTestId('data-testid Add new visualization menu item').click();
	await page.getByTestId('data-testid Select a data source').click();
	await page.getByRole('button', { name: 'Prometheus' }).click();
	await page.getByTestId('data-testid metric select').fill('test_metric');
	await page.getByText('test_metric', { exact: true }).click();
	await page.getByRole('button', { name: 'Run queries' }).click();
	await page.getByTestId('data-testid Back to dashboard button').click();
	await page.getByTestId('data-testid Dashboard settings').click();
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByLabel('Save dashboard title field').fill('Test Dashboard');
	await page.getByTestId('data-testid Save dashboard drawer button').click();
	await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Test Dashboard');
	await page.getByRole('textbox', { name: 'Tags' }).click();
	await page.getByRole('textbox', { name: 'Tags' }).fill('public');
	await page.getByRole('button', { name: 'Add' }).click();
	await page.getByTestId('data-testid Save dashboard button').click();
	await page.getByTestId('data-testid Save dashboard drawer button').click();
	await page.getByTestId('data-testid Back to dashboard button').click();
	await page.getByTestId('data-testid Exit edit mode button').click();
	// sometimes, there are still unsaved changes, sometimes there are not
	const discardBtn = page.getByTestId('data-testid Confirm Modal Danger Button');
	const shareArrowMenu = page.getByTestId('data-testid new share button arrow menu');
	if ((await discardBtn.or(shareArrowMenu).textContent()).includes('Discard')) {
		await discardBtn.click();
	}
	// shared dashboard publicly
	await shareArrowMenu.click();
	const shareMenuOption = page.getByTestId('data-testid new share button share externally');
	await expect(page.getByTestId('data-testid Alert success')).not.toBeVisible();
	await docsScreenshot('grafana-share-dashboard', shareMenuOption, {
		cropZoom: 1.5
	});
	await shareMenuOption.click();
	await page.getByText('I understand that this entire dashboard will be public.').click();
	const shareCreateBtn = page.getByTestId('data-testid public share dashboard create button');
	await docsScreenshot('grafana-share-create', shareCreateBtn, {
		cropZoom: 2.5
	});
	await shareCreateBtn.click();
	await expect(page.getByTestId('data-testid Alert success')).not.toBeVisible();
	const copyUrlBtn = page.getByTestId('data-testid share externally copy url button');
	await docsScreenshot('grafana-share-copy-url', copyUrlBtn, {
		cropZoom: 2
	});
	await copyUrlBtn.click();
	const publicSharedUrl = await page.evaluate(() => navigator.clipboard.readText());

	const publicSharedGrafanaPage = await browser.newPage();
	await publicSharedGrafanaPage.goto(publicSharedUrl);

	// navigate to published dashboard
	await refreshUntil(publicGrafanaPage, () =>
		publicGrafanaPage.getByText(`${tenant}:admin`).isVisible()
	);
	await publicGrafanaPage.getByText(`${tenant}:admin`).click();
	await expect(publicGrafanaPage.getByRole('link', { name: 'Test Dashboard' })).toBeVisible();
	await publicGrafanaPage.getByRole('link', { name: 'Test Dashboard' }).click();

	// there is no data yet
	await expect(publicGrafanaPage.getByText('No data')).toBeVisible();
	await expect(publicSharedGrafanaPage.getByText('No data')).toBeVisible();

	// create a new project and push data to it

	await withSetupClient(async (client) => {
		await client.put(`${RESOURCE_API}tenants/${tenant}/project/busstation`);
	});
	const { username: tokenUsername, password: tokenPassword } = await createResourceToken(
		tenant,
		'busstation',
		'token'
	);

	const apiClient = new MdbApi(`${tenant}.busstation`, tokenUsername, tokenPassword);

	const sensorTypeId = await apiClient.createSensorTypeWithProperties(`e2e-${tenant}`, [
		{
			alias: null,
			measure: null,
			metricName: 'test_metric',
			name: 'testMetric'
		}
	]);
	const deveui = await apiClient.createThing(sensorTypeId, `e2e-thing-${tenant}`, 'activated');

	await apiClient.remoteWriteVars(
		{
			deveui,
			appid: 'test',
			devid: 'test'
		},
		{
			testMetric: 50
		}
	);

	// there is data on the public dashboard now
	await refreshUntil(
		publicGrafanaPage,
		() => publicGrafanaPage.getByRole('button', { name: '{__name__="test_metric",' }).isVisible(),
		30
	);

	await refreshUntil(
		publicSharedGrafanaPage,
		() =>
			publicSharedGrafanaPage.getByRole('button', { name: '{__name__="test_metric",' }).isVisible(),
		30
	);
});
