import test from 'playwright/test';
import { ADMIN_USER } from './helper/keycloak';
import axios from 'axios';
import { Agent } from 'https';
import { KEYCLOAK } from './helper/urls';

test(
	'delete test tenants',
	{
		tag: '@delete-tenants'
	},
	async () => {
		const realmAdminClient = axios.create({
			httpsAgent: new Agent({ rejectUnauthorized: false }),
			headers: { Authorization: `Bearer ${await ADMIN_USER.token()}` }
		});

		// delete all test tenants
		const tenants = await realmAdminClient.get<string[]>(`${KEYCLOAK}realms/udh/data-hub/tenants`);
		for (const tenant of tenants.data) {
			if (tenant.startsWith('knuffingen-') || tenant.startsWith('schrecklicheim-')) {
				await realmAdminClient.delete(`${KEYCLOAK}realms/udh/data-hub/tenants/${tenant}`);
			}
		}
	}
);
