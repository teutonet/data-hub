import { test, expect } from '@playwright/test';
import { getRandomString, RandomTenantManager } from './helper/util';
import { MDB_FRONTEND } from './helper/urls';
import {
	createResources,
	createResourceToken,
	DATA_HUB_ADMIN_PASSWORD,
	DATA_HUB_ADMIN_USERNAME,
	signInWith
} from './helper/keycloak';
import { MdbApi } from './helper/mdb-api';

const TENANT_MGR = new RandomTenantManager();

test('User can export sensortypes', async ({ page, context }) => {
	if (context.browser().browserType().name() !== 'firefox') {
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	}

	type sensorJSON = {
		sensordata: {
			name: string;
			public: boolean;
			appeui: string;
			description: string;
			datasheet: string;
		};
		sensorprops: {
			global: boolean;
			name: string;
			alias: string;
			metricName: string;
			measure: string;
			delta: boolean;
			description: string;
		}[];
	};

	const testPostfix = getRandomString(6);
	const tenantName = TENANT_MGR.with(testPostfix);
	await createResources([`tenants/${tenantName}/projects/testproject-${testPostfix}`]);

	const { username: tokenUsername, password: tokenPassword } = await createResourceToken(
		tenantName,
		`testproject-${testPostfix}`,
		'token'
	);

	const mdbApi = new MdbApi(
		`${tenantName}.testproject-${testPostfix}`,
		tokenUsername,
		tokenPassword
	);
	await mdbApi.createSensorTypeWithProperties(`test_sensor-${testPostfix}`, [
		{
			name: `test_prop_name-${testPostfix}`,
			alias: `test_prop_alias-${testPostfix}`,
			measure: `test_prop_measure-${testPostfix}`,
			metricName: `test_prop_metric-${testPostfix}`
		},
		{
			name: `test_prop_name_2-${testPostfix}`,
			alias: `test_prop_alias_2-${testPostfix}`,
			measure: `test_prop_measure_2-${testPostfix}`,
			metricName: `test_prop_metric_2-${testPostfix}`
		}
	]);

	await page.goto(`${MDB_FRONTEND}`);
	await signInWith(page, DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Alle Projekte' }).click();
	await page
		.getByRole('tooltip')
		.getByRole('button', { name: `${tenantName}.testproject-${testPostfix}` })
		.click();
	await page.getByRole('button', { name: 'Sensorverwaltung', exact: true }).click();
	await page.getByRole('link', { name: 'Sensortypen', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Sensortypen' })).toBeVisible();
	await page.getByRole('cell', { name: `test_sensor-${testPostfix}` }).click();

	await expect(
		page.getByRole('heading', { name: `Sensortyp test_sensor-${testPostfix} bearbeiten` })
	).toBeVisible();
	await page.getByRole('button', { name: 'Exportieren' }).click();
	await expect(page.getByRole('heading', { name: 'Exportiere Sensortyp als JSON' })).toBeVisible();

	await page.getByRole('button', { name: 'Kopieren' }).click();
	const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
	const exportJson: sensorJSON = JSON.parse(clipboardContent) as sensorJSON;
	expect(exportJson).toMatchObject({
		sensordata: {
			name: `test_sensor-${testPostfix}`,
			public: true,
			appeui: null,
			description: null,
			datasheet: null,
			outOfOrderSeconds: 0
		},
		sensorprops: expect.arrayContaining([
			{
				name: `test_prop_name_2-${testPostfix}`,
				alias: `test_prop_alias_2-${testPostfix}`,
				metricName: `test_prop_metric_2-${testPostfix}`,
				measure: `test_prop_measure_2-${testPostfix}`,
				delta: false,
				description: null
			},
			{
				name: `test_prop_name-${testPostfix}`,
				alias: `test_prop_alias-${testPostfix}`,
				metricName: `test_prop_metric-${testPostfix}`,
				measure: `test_prop_measure-${testPostfix}`,
				delta: false,
				description: null
			}
		])
	});
	expect(exportJson.sensorprops).toHaveLength(2);
});

test('User can import sensortypes', async ({ page }) => {
	const testPostfix = getRandomString(6);
	const tenantName = TENANT_MGR.with(testPostfix);
	await createResources([`tenants/${tenantName}/projects/testproject2-${testPostfix}`]);

	const jsonImport = `{
        "sensordata": {
            "name": "test_sensor-${testPostfix}",
            "public": true,
            "appeui": "test_appeui-${testPostfix}",
            "description": "test_description-${testPostfix}",
            "datasheet": "test_datasheet-${testPostfix}",
			"outOfOrderSeconds": 20
        },
        "sensorprops": [
            {
                "name": "test_prop_name-${testPostfix}",
                "alias": "test_prop_alias-${testPostfix}",
                "metricName": "test_prop_metric-${testPostfix}",
                "measure": "test_prop_measure-${testPostfix}",
                "delta": true,
                "description": "test_prop_description-${testPostfix}"
            },
            {
                "name": "speed",
                "alias": "test_prop_alias-${testPostfix}",
                "metricName": "speed_kilometers_per_hour",
                "measure": "km/h",
                "delta": false,
                "description": "Geschwindigkeit"
            }
        ]
    }`;

	await page.goto(`${MDB_FRONTEND}`);
	await signInWith(page, DATA_HUB_ADMIN_USERNAME, DATA_HUB_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Alle Projekte' }).click();
	await page
		.getByRole('tooltip')
		.getByRole('button', { name: `${tenantName}.testproject2-${testPostfix}` })
		.click();
	await page.getByRole('button', { name: 'Sensorverwaltung', exact: true }).click();
	await page.getByRole('link', { name: 'Sensortypen', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Sensortypen' })).toBeVisible();
	await page.getByRole('button', { name: 'Sensortyp Importieren' }).click();
	await expect(page.getByRole('heading', { name: 'Importiere Sensortyp als JSON' })).toBeVisible();
	await page.getByPlaceholder('JSON-Daten eingeben').fill(jsonImport);
	await page.getByRole('dialog').getByRole('button', { name: 'Importieren' }).click();
	await expect(page.getByText('Erfolgreich Importiert')).toBeVisible();
	await expect(
		page.getByRole('heading', { name: `Sensortyp test_sensor-${testPostfix}` })
	).toBeVisible();
	await page.locator('a').filter({ hasText: 'Eigenschaften' }).click();
	await expect(page.getByRole('cell', { name: `test_prop_measure-${testPostfix}` })).toBeVisible();
});
