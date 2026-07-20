import test, { Browser, Page, expect } from 'playwright/test';
import { GRAFANA, KEYCLOAK, MDB_FRONTEND, PROMETHEUS } from './helper/urls';
import { checkGrafanaMenuState, getRandomString, login, RandomTenantManager } from './helper/util';
import { MdbApi, Thing } from './helper/mdb-api';
import {
	DATA_HUB_ADMIN_PASSWORD,
	DATA_HUB_ADMIN_USERNAME,
	createResourceToken,
	createResources,
	createTestUserViaApi,
	withSetupClient
} from './helper/keycloak';
import { pushMetrics } from 'prometheus-remote-write';
import { checkedResourceApiGraphqlRequest, graphql } from './helper/graphql';
import { docsScreenshot, fixupText } from './helper/screenshot';

const TENANT_MGR = new RandomTenantManager();

async function expectGrafanaWorking(page: Page): Promise<void> {
	await checkGrafanaMenuState(page);
	await page
		.getByTestId('data-testid navigation mega-menu')
		.getByRole('link', { name: 'Drilldown' })
		.click();
	await page.getByRole('heading', { name: 'Metrics' }).getByRole('link').click();
	await page.locator('#ds').click();
	await page.getByTestId('data-testid Select option').getByText('Prometheus').click();

	await page.getByRole('combobox', { name: 'Filters' }).click();
	await page.getByRole('option', { name: '__name__' }).click();
	await page.getByRole('option', { name: '= Equals' }).click();
	await expect(page.getByRole('option', { name: 'battery_level' })).toBeVisible();
	await page.getByRole('option', { name: 'air_pressure', exact: true }).click();

	await page.getByRole('combobox', { name: 'Filters' }).click();
	await page.getByRole('option', { name: 'measureQuality' }).click();
	await page.getByText('=Equals').click();
	await expect(page.getByRole('option', { name: 'bad' })).toBeVisible();
	await page.getByRole('option', { name: 'good' }).click();

	await page.getByTestId('data-testid RefreshPicker run button').click();
}

async function freshLoginFrontend(
	browser: Browser,
	username: string,
	password: string
): Promise<Page> {
	const page = await browser.newPage();
	await page.goto(`${MDB_FRONTEND}`);
	await page.getByLabel('Username or email').fill(username);
	await page.getByLabel('Password', { exact: true }).fill(password);
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page.getByRole('heading', { name: 'Willkommen im DataHub' })).toBeVisible();
	return page;
}

async function expectFrontendWorking(page: Page, testPostfix: string): Promise<void> {
	await page.getByRole('link', { name: 'Datahub' }).click();
	await page.getByRole('link', { name: `knuffingen-${testPostfix}.trainstation` }).click();
	await page.getByRole('button', { name: 'Sensorverwaltung' }).click();

	const subMenuButton = page.getByRole('link', { name: 'Sensoreigenschaften', exact: true });
	await expect(subMenuButton).toHaveAttribute('href', /.*properties/);
	await subMenuButton.click();
	await expect(page.getByRole('cell', { name: 'batteryLevel' })).toBeVisible();
	await page.locator('a').filter({ hasText: 'Sensortypen' }).click();
	await expect(page.getByRole('cell', { name: `e2e-${testPostfix}` })).toBeVisible();
	await page.getByRole('link', { name: 'Sensoren', exact: true }).click();

	await expect(page.getByText(`e2e-thing-${testPostfix}-2`)).toBeVisible();
	await page.getByRole('cell', { name: `e2e-thing-${testPostfix}-0` }).click();
	await expect(page.getByRole('heading', { name: 'Allgemeine Informationen' })).toBeVisible();
}

test('only-keycloak', async ({ browser }) => {
	test.slow();

	const testPostfix = getRandomString(6);
	const tenant = TENANT_MGR.with(testPostfix);

	// group data-analyst: read access to all data (prometheus-read), dashboard analytics
	// group view-group: read access to all data (prometheus-read), all dashboards (dashboard-read)
	// group limited-group: only access to limited viz-group and trainstation data
	// viz-group analytics: access to all
	// viz-group limited: access to trainstation

	await checkedResourceApiGraphqlRequest(
		graphql`
			mutation ($tenant: String!) {
				createTenant(tenant: $tenant) {
					da: createGroup(group: "data-analyst") {
						group
					}
					lg: createGroup(group: "limited-group") {
						group
					}
					vg: createGroup(group: "view-group") {
						group
					}
					a: createVizGroup(vizGroup: "analytics") {
						createPermission(
							permission: {
								name: "analytics"
								scopes: ["viz-group:admin"]
								groupPrincipals: [{ tenant: $tenant, group: "data-analyst" }]
							}
						)
					}
					l: createVizGroup(vizGroup: "limited") {
						createPermission(
							permission: {
								name: "limited"
								scopes: ["viz-group:admin"]
								groupPrincipals: [{ tenant: $tenant, group: "limited-group" }]
							}
						)
					}
					p1: createPermission(
						permission: {
							name: "view-group"
							scopes: ["tenant:read"]
							groupPrincipals: [{ tenant: $tenant, group: "view-group" }]
						}
					)
					p2: createPermission(
						permission: {
							name: "analytics"
							scopes: ["project:view", "project:prometheus-read"]
							vizGroupPrincipals: [{ tenant: $tenant, vizGroup: "analytics" }]
						}
					)
				}
			}
		`,
		{ tenant }
	);

	const analyzerUser = await createTestUserViaApi(
		[`${tenant}/data-analyst`],
		`analyzer-${testPostfix}`
	);
	const tenantAdminUser = await createTestUserViaApi(
		[`${tenant}/admin`],
		`tenant-admin-${testPostfix}`
	);
	const limitedUser = await createTestUserViaApi(
		[`${tenant}/limited-group`],
		`limited-${testPostfix}`
	);
	const viewerUser = await createTestUserViaApi([`${tenant}/view-group`], `viewer-${testPostfix}`);

	const {
		data: {
			t: {
				p: { c: sensorCredential }
			}
		}
	} = await checkedResourceApiGraphqlRequest(
		graphql`
			mutation ($tenant: String!) {
				t: tenant(tenant: $tenant) {
					p: createProject(project: "trainstation") {
						p1: createPermission(
							permission: {
								name: "limited-group"
								scopes: ["project:sensor-metadata-write", "project:view"]
								groupPrincipals: [{ tenant: $tenant, group: "limited-group" }]
							}
						)
						p2: createPermission(
							permission: {
								name: "reading"
								scopes: ["project:prometheus-read", "project:view"]
								vizGroupPrincipals: [
									{ tenant: $tenant, vizGroup: "limited" }
									{ tenant: $tenant, vizGroup: "analytics" }
								]
							}
						)
						c: createSensorCredential(sensorCredential: "cred") {
							username
							password
						}
					}
				}
			}
		`,
		{ tenant },
		tenantAdminUser
	);

	const apiClient = new MdbApi(
		`${tenant}.trainstation`,
		sensorCredential.username as string,
		sensorCredential.password as string
	);

	const sensorTypeId = await apiClient.createSensorTypeWithProperties(`e2e-${testPostfix}`, [
		{
			alias: null,
			measure: 'db',
			metricName: 'air_pressure',
			name: 'airPressure'
		},
		{
			alias: null,
			measure: '%',
			metricName: 'battery_level',
			name: 'batteryLevel'
		},
		{
			alias: null,
			measure: null,
			metricName: null,
			name: 'measureQuality'
		}
	]);
	const devices: Thing[] = [];
	for (let i = 0; i < 3; i++) {
		// TODO: test that only activated sensors are forwarded
		const deveui = await apiClient.createThing(
			sensorTypeId,
			`e2e-thing-${testPostfix}-${i}`,
			'activated'
		);
		devices.push({
			deveui,
			devid: sensorTypeId,
			appid: sensorTypeId
		});
	}

	let previousValue = Math.random() * 50 + 50;
	for (const device of devices) {
		for (let i = 0; i < 10; i++) {
			previousValue = Math.min(100, Math.max(50, previousValue + Math.random() * 20 - 10));
			await apiClient.remoteWriteVars(device, {
				airPressure: previousValue,
				batteryLevel: 50,
				measureQuality: Math.random() > 0.5 ? 'good' : 'bad'
			});
		}
	}

	// checking if the users have access to mdb-frontend and/or grafana

	// tenant-admin should have access to both
	await test.step('admin', async () => {
		const page = await freshLoginFrontend(
			browser,
			tenantAdminUser.username,
			DATA_HUB_ADMIN_PASSWORD
		);
		await expectFrontendWorking(page, testPostfix);
		await page.goto(GRAFANA);
		await checkGrafanaMenuState(page);
		await page.getByRole('combobox', { name: 'Change organization' }).click();
		await expect(
			page.getByLabel('Select options menu').getByText(`${tenant}:admin`, { exact: true })
		).toBeVisible();
		await expect(
			page.getByLabel('Select options menu').getByText(`${tenant}:limited`, { exact: true })
		).toBeVisible();
		await page
			.getByLabel('Select options menu')
			.getByText(`${tenant}:analytics`, { exact: true })
			.click();
		await expectGrafanaWorking(page);
		await page.close();
	});

	// analyzer only has access to one org in grafana but not mdb-frontend
	await test.step('analyzer', async () => {
		const page = await freshLoginFrontend(browser, analyzerUser.username, DATA_HUB_ADMIN_PASSWORD);
		await page.getByRole('link', { name: 'Datahub' }).click();
		await page.getByRole('button', { name: 'Alle Projekte' }).click();
		await expect(page.getByRole('button', { name: `${tenant}.trainstation` })).not.toBeVisible();
		await expect(
			page.getByRole('tooltip', { name: 'Alle Projekte' }).getByRole('button')
		).toBeVisible();
		await page.goto(GRAFANA);
		await checkGrafanaMenuState(page);
		await expect(page.getByRole('combobox', { name: 'Change organization' })).not.toBeVisible();
		await expectGrafanaWorking(page);
		await page.close();
	});

	// limited only has mdb access to a project, nothing in grafana
	await test.step('limited', async () => {
		const page = await freshLoginFrontend(browser, limitedUser.username, DATA_HUB_ADMIN_PASSWORD);
		await expectFrontendWorking(page, testPostfix);
		await page.goto(GRAFANA);
		await page.waitForLoadState('networkidle');
		await checkGrafanaMenuState(page);
		await expect(page.getByRole('combobox', { name: 'Change organization' })).not.toBeVisible();
		await page.close();
	});

	// viewer can look at grafana dashboards
	await test.step('viewer', async () => {
		const page = await freshLoginFrontend(browser, viewerUser.username, DATA_HUB_ADMIN_PASSWORD);
		await page.goto(GRAFANA);
		await checkGrafanaMenuState(page);
		await page.getByRole('combobox', { name: 'Change organization' }).click();
		await expect(
			page.getByTestId('data-testid Select menu').getByText(`Viewer`).first()
		).toBeVisible();
		await expect(page.getByTestId('data-testid Select menu').getByText('Editor')).not.toBeVisible();
		await page.close();
	});
});

test('resource-api-cross-tenant', async ({ page }) => {
	const testTenant1 = TENANT_MGR.get();
	const testTenant2 = TENANT_MGR.get();

	await createResources([`tenants/${testTenant1}/projects/test`, `tenants/${testTenant2}`]);
	const sensorCredentials = await createResourceToken(testTenant1, 'test', 'test');

	const apiClient = new MdbApi(
		`${testTenant1}.test`,
		sensorCredentials.username,
		sensorCredentials.password
	);

	const res = await pushMetrics(
		{ testmetric: 1 },
		{
			url: `${PROMETHEUS}api/v1/write`,
			headers: {
				Authorization: `Bearer ${await apiClient.getOrFetchToken()}`
			},
			fetch
		}
	);

	expect(res.status).toBe(200);

	await withSetupClient(async (realmAdminClient) => {
		await realmAdminClient.put(
			`${KEYCLOAK}realms/udh/data-hub/tenants/${testTenant1}/projects/test/permissions/cross`,
			{
				scopes: ['project:prometheus-read'],
				principals: [
					{
						type: 'vizGroup',
						tenant: `${testTenant2}`,
						vizGroup: 'admin'
					}
				]
			}
		);
	});

	await login(page, GRAFANA, DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD);
	await checkGrafanaMenuState(page);
	await page.getByRole('combobox', { name: 'Change organization' }).click();
	await page
		.getByLabel('Select options menu')
		.getByText(`${testTenant2}:admin`, { exact: true })
		.click();
	await checkGrafanaMenuState(page);
	await page
		.getByTestId('data-testid navigation mega-menu')
		.getByRole('link', { name: 'Drilldown' })
		.click();
	await page.getByRole('heading', { name: 'Metrics' }).getByRole('link').click();
	// we need to make sure the page loaded before doing a reload
	await expect(page.locator('#ds')).toBeVisible();

	await expect(async () => {
		await page.reload();
		await page.locator('#ds').click();
		await page.getByTestId('data-testid Select option').getByText('Prometheus').click();
		await page.getByRole('combobox', { name: 'Filters' }).click();
		await page.getByRole('option', { name: '__name__' }).click();
		await page.getByRole('option', { name: '= Equals' }).click();
		await page.getByRole('option', { name: 'testmetric', exact: true }).click({ timeout: 5000 });
		await page.getByLabel('Remove filter with key __name__').click();
	}).toPass({ intervals: [0] });

	await withSetupClient(async (realmAdminClient) => {
		await realmAdminClient.delete(
			`${KEYCLOAK}realms/udh/data-hub/tenants/${testTenant1}/projects/test/permissions/cross`
		);
	});

	await expect(async () => {
		await page.reload();
		await page.getByRole('combobox', { name: 'Filters' }).click();
		await expect(page.getByRole('option', { name: 'No options found' })).toBeVisible({
			timeout: 5000
		});
	}).toPass({ intervals: [0] });
});

test.fail('tenant-principals match whole tenant', async () => {
	// and not only the prefix
	const suffix = getRandomString(5);
	const tenant1 = TENANT_MGR.with(suffix);
	const tenant2 = TENANT_MGR.with(`${suffix}-test`);
	await checkedResourceApiGraphqlRequest(
		graphql`
			mutation ($tenant1: String!, $tenant2: String!) {
				t1: createTenant(tenant: $tenant1) {
					tenant
				}
				t2: createTenant(tenant: $tenant2) {
					tenant
				}
			}
		`,
		{
			tenant1,
			tenant2
		}
	);
	const tenant1User = await createTestUserViaApi([tenant1]);
	const tenant2User = await createTestUserViaApi([tenant2]);
	await expect(
		checkedResourceApiGraphqlRequest(
			graphql`
				query {
					tenants {
						tenant
					}
				}
			`,
			{},
			tenant1User
		)
	).resolves.toEqual({
		errors: [],
		data: {
			tenants: [
				{
					tenant: tenant1
				}
			]
		},
		dataPresent: true
	});
	await expect(
		checkedResourceApiGraphqlRequest(
			graphql`
				query {
					tenants {
						tenant
					}
				}
			`,
			{},
			tenant2User
		)
	).resolves.toEqual({
		errors: [],
		data: {
			tenants: [
				{
					tenant: tenant2
				}
			]
		},
		dataPresent: true
	});
});

test('groups principals match whole group', async () => {
	// and not only the prefix
	const tenant = TENANT_MGR.get();
	await checkedResourceApiGraphqlRequest(
		graphql`
			mutation ($tenant: String!) {
				createTenant(tenant: $tenant) {
					g1: createGroup(group: "test") {
						group
					}
					g2: createGroup(group: "test-with-postfix") {
						group
					}
					createProject(project: "trainstation") {
						createPermission(
							permission: {
								name: "perm"
								scopes: ["project:admin"]
								groupPrincipals: [{ tenant: $tenant, group: "test" }]
							}
						)
					}
				}
			}
		`,
		{ tenant }
	);

	const user = await createTestUserViaApi([`${tenant}/test-with-postfix`]);

	await expect(
		checkedResourceApiGraphqlRequest(
			graphql`
				query ($tenant: String!) {
					tenant(tenant: $tenant) {
						projects {
							project
						}
					}
				}
			`,
			{ tenant },
			user
		)
	).resolves.toEqual({
		data: {
			tenant: {
				projects: []
			}
		},
		dataPresent: true,
		errors: []
	});
});

test('screenshot-keycloak', async ({ page }) => {
	const testTenant = TENANT_MGR.get();
	const suffix = testTenant.split('-')[1];
	await createResources([
		`tenants/${testTenant}/projects/testproject`,
		`tenants/${testTenant}/groups/testgroup`,
		`tenants/${testTenant}`
	]);

	const user = await createTestUserViaApi([`${testTenant}/admin`]);

	await page.goto(`${KEYCLOAK}admin/udh/console`);
	await page.getByLabel('Username or email').fill(user.username);
	await page.getByLabel('Password', { exact: true }).fill(DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page.getByRole('img', { name: 'Keycloak icon' })).toBeVisible();

	// screenshot of keycloak side bar
	await page.getByRole('link', { name: 'Users' }).focus();
	await docsScreenshot(
		'keycloak-sidebar-users-btn-highlight',
		page.getByRole('link', { name: 'Users' }),
		{
			highlight: true
		}
	);

	await page.getByRole('link', { name: 'Users' }).click();
	await expect(page.getByTestId('view-header')).toBeVisible();

	// screenshot of add user button
	await page.getByTestId('add-user').focus();
	await docsScreenshot('keycloak-user-add-user-btn-highlight', page.getByTestId('add-user'), {
		highlight: true
	});

	await page.getByTestId('add-user').click();
	await expect(page.getByTestId('view-header')).toBeVisible();

	await page.locator('.pf-v5-c-switch__toggle').click();
	await page.getByTestId('username').fill(`testuser-${suffix}`);
	await page.getByTestId('email').fill(`test${suffix}@example.com`);

	await page.getByTestId('join-groups-button').click();
	await expect(page.getByText(testTenant)).toBeVisible();

	// screenshot of group assignation pt1
	await fixupText(page, testTenant, 'teutonet');
	await docsScreenshot('keycloak-users-join-group-highlight', page.getByText('teutonet'), {
		highlight: true,
		highlightRadius: 10,
		cropZoom: 3
	});

	await page.getByText('teutonet').click();
	await expect(page.getByTestId('admin').getByText('admin')).toBeVisible();
	await page.getByTestId('admin-check').check();

	// screenshot of group assignation pt2
	await fixupText(page, 'testgroup', 'viewer');
	await fixupText(page, testTenant, 'testgroup');
	await docsScreenshot('keycloak-users-check-group-highlight', page.getByTestId('join-button'), {
		highlight: true,
		highlightRadius: 20,
		cropZoom: 3
	});

	await page.getByTestId('join-button').click();
	await expect(page.getByText(`/${testTenant}/admin`)).toBeVisible();
	await page.getByTestId('user-creation-save').click();
	await expect(page.getByText('The user has been created')).toBeVisible();
	await page.getByRole('button', { name: 'Close alert: The user has' }).click();

	await page.getByTestId('credentials').click();

	// screenshot of credentials tab button
	await fixupText(page, `testuser-${suffix}`, 'teutonet');
	await docsScreenshot(
		'keycloak-users-credentials-tab-highlight',
		page.getByTestId('credentials'),
		{
			highlight: true,
			highlightRadius: 20,
			cropZoom: 1
		}
	);

	//screenshot of credential reset password button
	await page.getByTestId('credential-reset-empty-action').focus();
	await docsScreenshot(
		'keycloak-users-credentials-reset-highlight',
		page.getByTestId('credential-reset-empty-action'),
		{
			highlight: true,
			highlightRadius: 20,
			cropZoom: 1
		}
	);

	await page.getByTestId('credential-reset-empty-action').click();
	await expect(page.getByText('Credentials Reset')).toBeVisible();
	await page.getByRole('combobox', { name: 'Type to filter' }).click();
	await page.getByRole('option', { name: 'Verify Email' }).click();
	await page.getByRole('option', { name: 'Update Password' }).click();

	//screenshot of credential reset modal button
	await docsScreenshot(
		'keycloak-users-credentials-reset-modal',
		page.getByTestId('credential-reset-modal'),
		{
			highlight: false,
			zoom: 1.5
		}
	);
});
