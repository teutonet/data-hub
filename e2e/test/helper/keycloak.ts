import { Page } from 'playwright';
import { KEYCLOAK, RESOURCE_API } from './urls';
import { getRandomString } from './util';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { expect } from 'playwright/test';

export const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD;
export const DATA_HUB_ADMIN_USERNAME = `data-hub-admin`;
export const DATA_HUB_ADMIN_PASSWORD = process.env.DATA_HUB_ADMIN_PASSWORD;

export interface Tenant {
	name: string;
	groups: string[];
}

export async function createKeycloakUser(
	page: Page,
	username: string,
	password: string,
	joinTenants: Tenant[],
	realmAdmin: boolean
): Promise<void> {
	const currentRealm = await page.getByTestId('currentRealm').textContent();
	if (currentRealm != 'udh') {
		await page.getByRole('link', { name: 'Manage Realms' }).click();
		await page.getByRole('link', { name: 'udh' }).click();
		await expect(page.getByTestId('currentRealm')).toHaveText('udh');
	}
	await page.getByRole('link', { name: 'Users' }).click();
	await page.getByTestId('add-user').click();

	await page.getByTestId('username').fill(username);
	await page.getByTestId('email').fill(`${username}@example.com`);
	await page.getByTestId('firstName').fill('Test');
	await page.getByTestId('lastName').fill('User');
	// set email to be verified
	await page.locator('label').filter({ hasText: 'OnOff' }).locator('span').first().click();
	// set language to english
	await page.getByRole('button', { name: 'Select a locale' }).click();
	await page.getByRole('option', { name: 'English' }).click();

	if (joinTenants.length > 0) {
		await page.getByTestId('join-groups-button').click();
		for (const tenant of joinTenants) {
			await page.getByTestId(`${tenant.name}-check`).check();
			await page.getByText(tenant.name).click();
			for (const project of tenant.groups) {
				await page.getByTestId(`${project}-check`).check();
			}
			await page.getByRole('button', { name: 'Groups' }).click();
		}
		await page.getByTestId('join-button').click();
	}

	await page.getByTestId('user-creation-save').click();
	await page.getByTestId('global-alerts').getByRole('button').click();

	await page.getByTestId('credentials').click();
	await page.getByTestId('no-credentials-empty-action').click();
	await page.getByTestId('passwordField').fill(password);
	await page.getByTestId('passwordConfirmationField').fill(password);
	// set password to not be temporary
	await page.getByLabel(`Set password for ${username}`).getByText('On', { exact: true }).click();
	await page.getByTestId('confirm').click();
	await page.getByTestId('confirm').click();
	await page.getByTestId('global-alerts').getByRole('button').click();

	if (realmAdmin) {
		await page.getByTestId('role-mapping-tab').click();
		await page.getByTestId('assignRole').click();
		await page.getByRole('button', { name: 'Filter by realm roles' }).click();
		await page.getByTestId('roles').click();
		await page.getByPlaceholder('Search by role name').fill('manage-realm');
		await page.getByTestId('rolesinput').getByRole('button', { name: 'Search' }).click();
		// there should only be one search result
		await page.getByRole('checkbox', { name: 'Select row' }).check();
		await page.getByTestId('assign').click();
		await page.getByTestId('global-alerts').getByRole('button').click();
	}
}

export async function signInWith(page: Page, username: string, password: string): Promise<void> {
	await page.locator('#username').fill(username);
	await page.locator('#password').fill(password);
	await page.locator('#kc-login').click();
}

export async function signInAdminKeycloak(page: Page) {
	await page.goto(KEYCLOAK);
	await page.getByLabel('Username or email').fill('user');
	await page.getByLabel('Password', { exact: true }).fill(KEYCLOAK_ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Sign In' }).click();
}

export class KeycloakUser {
	constructor(
		public username: string,
		public email: string,
		public id: string | null = null
	) {}

	async token(): Promise<string> {
		const result = await axios.postForm<{ access_token: string }>(
			`${KEYCLOAK}realms/udh/protocol/openid-connect/token`,
			{
				grant_type: 'password',
				password: DATA_HUB_ADMIN_PASSWORD,
				username: this.username
			},
			{
				auth: {
					username: 'integration-test',
					password: DATA_HUB_ADMIN_PASSWORD
				}
			}
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return result?.data?.access_token;
	}
}

/** groups are in the form `tenant/group`
 * */
export async function createTestUserViaApi(groups: string[], username: string | null = null) {
	const adminHeader = { Authorization: `Bearer ${await ADMIN_USER.token()}` };
	const email = `${username ?? getRandomString(6)}@example.com`;
	const response = await axios.post(
		`${KEYCLOAK}admin/realms/udh/users`,
		{
			email: email,
			emailVerified: true,
			username: email,
			firstName: 'first',
			lastName: 'last',
			groups: groups,
			enabled: true
		},
		{
			maxRedirects: 0,
			headers: adminHeader
		}
	);
	const userId = (response.headers['location'] as string).split('/').at(-1);
	await axios.put(
		`${KEYCLOAK}admin/realms/udh/users/${userId}/reset-password`,
		{
			temporary: false,
			type: 'password',
			value: DATA_HUB_ADMIN_PASSWORD
		},
		{ headers: adminHeader }
	);
	return new KeycloakUser(email, email, userId);
}

export async function getUserAttributes(userId: string): Promise<Record<string, string>> {
	const adminHeader = {
		Authorization: `Bearer ${await ADMIN_USER.token()}`,
		Accepts: 'application/json'
	};
	const result = await axios.get<Record<string, string>>(
		`${KEYCLOAK}realms/udh/data-hub/_get_user_attributes/${userId}`,
		{ headers: adminHeader }
	);
	delete result.data.email;
	delete result.data.firstName;
	delete result.data.lastName;
	delete result.data.username;
	return result.data;
}

export async function updateUserAttributes(
	userId: string,
	attributes: Record<string, string | null>
): Promise<Record<string, string>> {
	const adminHeader = {
		Authorization: `Bearer ${await ADMIN_USER.token()}`,
		Accepts: 'application/json'
	};
	const result = await axios.put<Record<string, string>>(
		`${KEYCLOAK}realms/udh/data-hub/_update_user_attributes/${userId}`,
		attributes,
		{ headers: adminHeader }
	);
	return result.data;
}

export const ADMIN_USER = new KeycloakUser(DATA_HUB_ADMIN_USERNAME, 'data-hub-admin@example.com');

async function createRealmAdminClient(): Promise<AxiosInstance> {
	return axios.create({
		headers: { Authorization: `Bearer ${await ADMIN_USER.token()}` }
	});
}

let setupClient: AxiosInstance;

export async function withSetupClient<T>(f: (client: AxiosInstance) => Promise<T>) {
	if (!setupClient) {
		setupClient = await createRealmAdminClient();
		return await f(setupClient);
	}

	try {
		return await f(setupClient);
	} catch (e) {
		if (e instanceof AxiosError && e.status === 401) {
			setupClient = await createRealmAdminClient();
			return await f(setupClient);
		} else throw e;
	}
}

export async function createResources(paths: string[]) {
	const created = new Set();

	for (const path of paths) {
		const elements = path.split('/');
		let url = RESOURCE_API.replace(/\/$/, '');
		while (elements.length > 0) {
			url += `/${elements.shift()}/${elements.shift()}`;
			const create = async () => await setupClient.put(url);

			if (!created.has(url)) {
				await withSetupClient(create);
				created.add(url);
			}
		}
	}
}

export async function createResourceToken(
	tenantName: string,
	projectName: string,
	tokenName: string
) {
	const {
		data: { username, password }
	} = await withSetupClient((client) =>
		client.put<{ username: string; password: string }>(
			`${RESOURCE_API}tenants/${tenantName}/projects/${projectName}/sensor-credentials/${tokenName}`
		)
	);

	return { username, password };
}
