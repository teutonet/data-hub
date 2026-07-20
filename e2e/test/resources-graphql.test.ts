import test, { expect } from 'playwright/test';
import { RandomTenantManager } from './helper/util';
import { checkedResourceApiGraphqlRequest, graphql } from './helper/graphql';
import { MdbApi } from './helper/mdb-api';

const TENANT_MGR = new RandomTenantManager();

test('sensor-credential lastUsedAt', async () => {
	const tenant = TENANT_MGR.get();
	const response = await checkedResourceApiGraphqlRequest(
		graphql`
			mutation ($tenant: String!) {
				createTenant(tenant: $tenant) {
					createProject(project: "trainstation") {
						createSensorCredential(sensorCredential: "cred") {
							username
							password
						}
					}
				}
			}
		`,
		{ tenant }
	);
	const { username, password }: { username: string; password: string } =
		response.data.createTenant.createProject.createSensorCredential;

	await expect(
		checkedResourceApiGraphqlRequest(
			graphql`
				query ($tenant: String!) {
					sensorCredential(tenant: $tenant, project: "trainstation", sensorCredential: "cred") {
						lastUsedAt
					}
				}
			`,
			{ tenant }
		)
	).resolves.toEqual({
		data: {
			sensorCredential: {}
		},
		dataPresent: true,
		errors: []
	});

	const mdbApi = new MdbApi(`${tenant}.trainstation`, username, password);
	await mdbApi.remoteWriteVarsLorawan(
		{
			deveui: '123',
			appid: '321',
			devid: '213'
		},
		{
			airPressure: 100,
			windSpeed: 20
		}
	);

	const {
		data: {
			sensorCredential: { lastUsedAt: oldTime }
		}
	} = await checkedResourceApiGraphqlRequest(
		graphql`
			query ($tenant: String!) {
				sensorCredential(tenant: $tenant, project: "trainstation", sensorCredential: "cred") {
					lastUsedAt
				}
			}
		`,
		{ tenant }
	);
	expect(oldTime as string).not.toBeUndefined();

	await mdbApi.remoteWriteVarsLorawan(
		{
			deveui: '123',
			appid: '321',
			devid: '213'
		},
		{
			airPressure: 100,
			windSpeed: 20
		}
	);

	const {
		data: {
			sensorCredential: { lastUsedAt: newTime }
		}
	} = await checkedResourceApiGraphqlRequest(
		graphql`
			query ($tenant: String!) {
				sensorCredential(tenant: $tenant, project: "trainstation", sensorCredential: "cred") {
					lastUsedAt
				}
			}
		`,
		{ tenant }
	);

	expect(new Date(oldTime as string) < new Date(newTime as string)).toBeTruthy();
});
