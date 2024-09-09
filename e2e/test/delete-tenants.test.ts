import test from 'playwright/test';
import {
	DATA_HUB_ADMIN_PASSWORD,
	DATA_HUB_ADMIN_USERNAME,
	signInAdminKeycloak
} from './helper/keycloak';
import { aquireTokenViaDeviceCode } from './helper/mdb-api';
import axios from 'axios';
import { Agent } from 'https';
import { KEYCLOAK } from './helper/urls';

test(
	'delete test tenants',
	{
		tag: '@delete-tenants'
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

		// delete all test tenants
		const tenants = await realmAdminClient.get<string[]>(`${KEYCLOAK}realms/udh/data-hub/tenants`);
		for (const tenant of tenants.data) {
			if (tenant.startsWith('knuffingen-')) {
				await realmAdminClient.delete(`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}`);
			}
		}
	}
);
