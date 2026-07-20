import test, { expect } from 'playwright/test';
import { checkAndDismissToast, login, RandomTenantManager } from './helper/util';
import { MDB_FRONTEND } from './helper/urls';
import { createResources, createTestUserViaApi, DATA_HUB_ADMIN_PASSWORD } from './helper/keycloak';
import { checkedResourceApiGraphqlRequest, graphql } from './helper/graphql';
import { docsScreenshot, fixupTenantName, fixupText } from './helper/screenshot';

const TENANT_MGR = new RandomTenantManager();

test('manage resources', async ({ page }) => {
	const tenant = TENANT_MGR.get();
	const tenantNameReplace = 'teutonet';
	const groupNameReplace = 'testgroup';

	await test.step('create tenant', async () => {
		await createResources([`tenants/${tenant}`]);
	});

	const user = await createTestUserViaApi([`${tenant}/admin`]);

	await login(page, MDB_FRONTEND, user.username, DATA_HUB_ADMIN_PASSWORD);

	await test.step('screenshot tenant overview', async () => {
		await page.getByRole('link', { name: 'Berechtigungsverwaltung' }).click();
		await page.getByRole('button').nth(3).click();
		await page.getByRole('button', { name: tenant }).click();

		// screenshot of tentant overview
		await expect(page.getByRole('button', { name: tenant })).toBeVisible();
		await fixupText(page, `${tenant}`, tenantNameReplace);
		await page.getByLabel('Anzeigename').evaluate((el) => {
			(el as HTMLInputElement).value = 'teutonet';
		});
		await page.getByLabel('Ressourcenname').evaluate((el) => {
			(el as HTMLInputElement).value = 'teutonet';
		});
		await docsScreenshot(
			'permission-ui-tenants-overview',
			page.getByRole('button', { name: tenantNameReplace }),
			{
				highlight: false
			}
		);
	});

	await test.step('create group viewer', async () => {
		await page.getByRole('link', { name: 'Gruppen', exact: true }).click();

		// screenshot of groups overview
		await fixupText(page, `${tenant}`, tenantNameReplace);

		await page.getByLabel('Anzeigename').evaluate((el) => {
			(el as HTMLInputElement).value = 'teutonet';
		});
		await page.getByLabel('Ressourcenname').evaluate((el) => {
			(el as HTMLInputElement).value = 'teutonet';
		});
		await docsScreenshot(
			'permission-ui-groups-overview',
			page.getByRole('button', { name: 'Neue Gruppe anlegen' }),
			{
				highlight: true,
				cropZoom: 2
			}
		);

		await page.getByRole('button', { name: 'Neue Gruppe anlegen' }).click();

		// screenshot of groups create modal empty
		await fixupTenantName(page, tenant);
		await docsScreenshot(
			'permission-ui-groups-create-modal-empty',
			page.locator('html').getByRole('document'),
			{
				highlight: false,
				zoom: 1.8
			}
		);

		await page.getByRole('textbox', { name: 'Gruppenname' }).fill('viewer');
		await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
		await checkAndDismissToast('Erfolgreich gespeichert', page);
	});

	await test.step('create and screenshot tenant permission', async () => {
		await page.getByLabel('Breadcrumb').getByRole('link', { name: 'Gruppen' }).click();
		await page.getByRole('tab', { name: 'Tenant-Berechtigungen' }).click();
		await page.getByRole('button', { name: 'Neue Berechtigung anlegen' }).click();
		await expect(page.getByText('Name Gruppe/n')).toBeVisible();
		await page.getByRole('textbox', { name: 'Name' }).fill('testpermission');
		await page.getByRole('listbox').first().click();
		await page
			.locator('div')
			.filter({ hasText: /^viewer$/ })
			.click();

		// screenshot of permission group dropdown
		await fixupTenantName(page, tenant);
		await fixupText(page, `${tenant}`, tenantNameReplace);
		await fixupText(page, `viewer`, groupNameReplace);
		await docsScreenshot(
			'permission-ui-tenant-permission-group-dropdown',
			page.getByText('testgroup Close Close'),
			{
				highlight: false,
				zoom: 1.2
			}
		);

		await page.getByText('testgroup Close Close').click();
		await page.getByRole('listbox').nth(2).click();
		await page
			.locator('div')
			.filter({ hasText: /^project:sensor-metadata-write$/ })
			.click();
		await page
			.locator('div')
			.filter({ hasText: /^project:admin$/ })
			.click();

		// screenshot of permission scopes dropdown
		await docsScreenshot(
			'permission-ui-tenant-permission-scopes-dropdown',
			page.getByText('project:admin Close'),
			{
				highlight: false,
				zoom: 1.2
			}
		);

		await page.getByText('project:admin Close').click();
		await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
		await checkAndDismissToast('Erfolgreich gespeichert', page);
	});

	await test.step('create viz-group public', async () => {
		await page.getByRole('link', { name: 'Visualisierungsgruppen' }).click();
		await page.getByRole('button', { name: 'Neue Visualisierungsgruppe' }).click();
		await page.getByRole('textbox', { name: 'Visualisierungsgruppenname' }).fill('public');
		await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
		await checkAndDismissToast('Erfolgreich gespeichert', page);

		// screenshot of viz-group grafana-org name
		await fixupTenantName(page, tenant);
		await page.getByLabel('Anzeigename').evaluate((el) => {
			(el as HTMLInputElement).value = 'public';
		});
		await page.getByLabel('Ressourcenname').evaluate((el) => {
			(el as HTMLInputElement).value = 'public';
		});
		await page.getByLabel('Grafana-Org-Id').evaluate((el) => {
			(el as HTMLInputElement).value = 'teutonet:public';
		});
		await docsScreenshot('display-names-grafana-org-name', page.getByText('Grafana-Org-Id'), {
			highlight: false,
			cropZoom: 2.5
		});
	});

	await test.step('create project trainstation', async () => {
		await page.getByRole('link', { name: 'Projekte' }).click();
		await page.getByRole('button', { name: 'Neues Projekt anlegen' }).click();
		await page.getByRole('textbox', { name: 'Projektname' }).fill('trainstation');
		await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
		await checkAndDismissToast('Erfolgreich gespeichert', page);
	});

	await test.step('screenshot project trainstation and create permission', async () => {
		await expect(
			page.getByRole('heading', { name: 'Projektübersicht: trainstation' })
		).toBeVisible();

		// screenshot of project overview
		await fixupTenantName(page, tenant);
		await fixupText(page, 'trainstation', 'testproject');
		await page.getByLabel('Anzeigename').evaluate((el) => {
			(el as HTMLInputElement).value = 'testproject';
		});
		await page.getByLabel('Ressourcenname').evaluate((el) => {
			(el as HTMLInputElement).value = 'testproject';
		});
		await page.getByLabel('S3-Bucket-Name').evaluate((el) => {
			(el as HTMLInputElement).value = 'teutonet.testproject';
		});
		await docsScreenshot(
			'permission-ui-project-overview',
			page.getByRole('heading', { name: 'Projektübersicht: testproject' }),
			{
				highlight: false,
				zoom: 1.3
			}
		);

		// screenshot of project overview bucket name
		await fixupTenantName(page, tenant);
		await page.getByLabel('Anzeigename').evaluate((el) => {
			(el as HTMLInputElement).value = 'testproject';
		});
		await page.getByLabel('Ressourcenname').evaluate((el) => {
			(el as HTMLInputElement).value = 'testproject';
		});
		await page.getByLabel('S3-Bucket-Name').evaluate((el) => {
			(el as HTMLInputElement).value = 'teutonet.testproject';
		});
		await docsScreenshot('display-names-bucket-name', page.getByText('S3-Bucket-Name'), {
			highlight: false,
			cropZoom: 2.5
		});

		await page.getByRole('tab', { name: 'Projekt Berechtigungen' }).click();
		await page.getByRole('button', { name: 'Neue Berechtigung anlegen' }).click();
		await page.getByRole('listbox').first().click();
		await page
			.locator('div')
			.filter({ hasText: /^admin$/ })
			.click();
		await page.getByText('admin Close Close').click();
		await page.getByRole('listbox').nth(2).click();
		await page
			.locator('div')
			.filter({ hasText: /^project:admin$/ })
			.click();
		await page
			.locator('div')
			.filter({ hasText: /^project:sensor-metadata-write$/ })
			.click();
		await page.getByText('project:admin Close').click();

		// screenshot of project permission create modal
		await fixupTenantName(page, tenant);
		await fixupText(page, `trainstation`, 'testproject');
		await fixupText(page, `admin`, groupNameReplace);
		await docsScreenshot(
			'permission-ui-project-permission-create',
			page.getByText('Gruppe/n', { exact: true }),
			{
				highlight: false,
				zoom: 1.2
			}
		);
		await page.getByRole('button').nth(3).click();
		await page.getByRole('link', { name: 'testproject', exact: true }).click();
	});

	const tokenUsername = await test.step('create sensor credential', async () => {
		await expect(async () => {
			// TODO: necessary, because the token update refreshes the entire UI, which causes
			// the page to reset away from the Tokens tab
			await page.getByRole('tab', { name: 'Tokens' }).click();
			await page.getByRole('button', { name: 'Neuen Token anlegen' }).click({ timeout: 5_000 });
		}).toPass({ timeout: 20_000, intervals: [0] });
		await page.getByRole('textbox', { name: 'Token-Name' }).fill('token');
		await page.getByRole('button', { name: 'Token erzeugen' }).click();
		await checkAndDismissToast('Erfolgreich gespeichert', page);
		await expect(page.getByRole('textbox', { name: 'Username' })).toHaveValue(
			/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}/
		);
		await expect(page.getByRole('textbox', { name: 'Passwort' })).toHaveValue(/[a-zA-Z0-9]{32}/);
		const tokenUsername = await page.getByRole('textbox', { name: 'Username' }).inputValue();
		await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();
		return tokenUsername;
	});

	// check all created resources
	await expect(
		checkedResourceApiGraphqlRequest(
			graphql`
				query ($tenant: String!) {
					tenant(tenant: $tenant) {
						projects {
							project
							sensorCredentials {
								sensorCredential
								username
							}
						}
						groups {
							group
						}
						vizGroups {
							vizGroup
						}
					}
				}
			`,
			{ tenant }
		)
	).resolves.toEqual({
		errors: [],
		data: {
			tenant: {
				projects: [
					{
						project: 'trainstation',
						sensorCredentials: [
							{
								sensorCredential: 'token',
								username: tokenUsername
							}
						]
					}
				],
				groups: [
					{
						group: 'admin'
					},
					{
						group: 'viewer'
					}
				],
				vizGroups: [
					{
						vizGroup: 'admin'
					},
					{
						vizGroup: 'public'
					}
				]
			}
		},
		dataPresent: true
	});

	await test.step('delete sensor credential', async () => {
		await page.getByRole('button', { name: 'Löschen' }).click();
		await expect(page.getByText('Wollen sie diesen Token wirklich löschen?')).toBeVisible();
		await page.getByRole('button', { name: 'Fortfahren' }).click();
	});

	await test.step('create project busstation', async () => {
		await page.getByRole('button', { name: 'Neues Projekt anlegen' }).click();
		await page.getByRole('textbox', { name: 'Projektname' }).fill('busstation');
		await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
		await checkAndDismissToast('Erfolgreich gespeichert', page);
	});

	await test.step('create permission', async () => {
		await page.getByRole('tab', { name: 'Projekt Berechtigungen' }).click();
		await page.getByRole('button', { name: 'Neue Berechtigung anlegen' }).click();
		await page.getByRole('textbox', { name: 'Name' }).fill('new-permission');
		await page.getByRole('listbox').first().click();
		await page
			.locator('div')
			.filter({ hasText: /^viewer$/ })
			.click();
		await page.getByText('viewer Close Close').click();
		await page.getByRole('listbox').nth(1).click();
		await page
			.locator('div')
			.filter({ hasText: /^public$/ })
			.first()
			.click();
		await page.getByText('public Close Close').click();
		await page.getByRole('listbox').nth(2).click();
		await page
			.locator('div')
			.filter({ hasText: /^sensor-credential:view$/ })
			.click();
		await page
			.locator('div')
			.filter({ hasText: /^project:view$/ })
			.click();
		await page
			.locator('div')
			.filter({ hasText: /^project:bucket-read$/ })
			.click();
		await page.getByText('sensor-credential:view Close Close').click();
		await page.getByRole('button', { name: 'Erstellen', exact: true }).click();
		await page.getByRole('tab', { name: 'Projekt Berechtigungen' }).click();
		await expect(page.getByRole('heading', { name: 'new-permission' })).toBeVisible();
	});

	// check resources again
	await expect(
		checkedResourceApiGraphqlRequest(
			graphql`
				query ($tenant: String!) {
					tenant(tenant: $tenant) {
						projects {
							project
							permissions {
								name
								scopes
								groupPrincipals {
									group
									tenant
								}
								vizGroupPrincipals {
									vizGroup
									tenant
								}
							}
						}
						groups {
							group
						}
						vizGroups {
							vizGroup
						}
					}
				}
			`,
			{ tenant }
		)
	).resolves.toEqual({
		errors: [],
		data: {
			tenant: {
				projects: [
					{
						project: 'busstation',
						permissions: [
							{
								name: 'new-permission',
								scopes: expect.arrayContaining([
									'sensor-credential:view',
									'project:view',
									'project:bucket-read'
								]),
								groupPrincipals: [
									{
										group: 'viewer',
										tenant: tenant
									}
								],
								vizGroupPrincipals: [
									{
										vizGroup: 'public',
										tenant: tenant
									}
								]
							}
						]
					},
					{
						project: 'trainstation',
						permissions: []
					}
				],
				groups: [
					{
						group: 'admin'
					},
					{
						group: 'viewer'
					}
				],
				vizGroups: [
					{
						vizGroup: 'admin'
					},
					{
						vizGroup: 'public'
					}
				]
			}
		},
		dataPresent: true
	});

	await test.step('delete current project', async () => {
		await page.getByRole('tab', { name: 'Danger Zone' }).click();
		await page.getByRole('button', { name: 'Löschen' }).click();
		await page.getByRole('button', { name: 'Fortfahren' }).click();
		await checkAndDismissToast('Erfolgreich gelöscht', page);
	});
	await test.step('delete project trainstation', async () => {
		await page.getByRole('link', { name: 'trainstation' }).click();
		await expect(
			page.getByRole('heading', { name: 'Projektübersicht: trainstation' })
		).toBeVisible();
		// TODO: workaround, the page refreshed when the token is updated, which can happen
		// after switching tabs, but before clicking delete
		await page.reload();
		await page.getByRole('tab', { name: 'Danger Zone' }).click();
		await page.getByRole('button', { name: 'Löschen' }).click();
		await page.getByRole('button', { name: 'Fortfahren' }).click();
		await checkAndDismissToast('Erfolgreich gelöscht', page);
	});
	await test.step('delete viz-group public', async () => {
		await page.getByRole('link', { name: 'Visualisierungsgruppen' }).click();
		await page.getByRole('link', { name: 'public' }).click();
		await expect(
			page.getByRole('heading', { name: 'Visualisierungsgruppenübersicht: public' })
		).toBeVisible();
		await page.getByRole('tab', { name: 'Danger Zone' }).click();
		await page.getByRole('button', { name: 'Löschen' }).click();
		await page.getByRole('button', { name: 'Fortfahren' }).click();
		await checkAndDismissToast('Erfolgreich gelöscht', page);
	});

	await page.waitForTimeout(2000);
	await expect(page.getByRole('heading', { name: 'Tenantübersicht: ' })).toBeVisible();

	// check resources again
	await expect(
		checkedResourceApiGraphqlRequest(
			graphql`
				query ($tenant: String!) {
					tenant(tenant: $tenant) {
						projects {
							project
							permissions {
								name
								scopes
								groupPrincipals {
									group
									tenant
								}
								vizGroupPrincipals {
									vizGroup
									tenant
								}
							}
						}
						groups {
							group
						}
						vizGroups {
							vizGroup
						}
					}
				}
			`,
			{ tenant }
		)
	).resolves.toEqual({
		errors: [],
		data: {
			tenant: {
				projects: [],
				groups: [
					{
						group: 'admin'
					},
					{
						group: 'viewer'
					}
				],
				vizGroups: [
					{
						vizGroup: 'admin'
					}
				]
			}
		},
		dataPresent: true
	});
});
