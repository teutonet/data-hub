import test, { expect } from 'playwright/test';
import { createResources, createResourceToken } from './helper/keycloak';
import { MdbApi, Thing } from './helper/mdb-api';
import { RandomTenantManager } from './helper/util';

const TENANT_MGR = new RandomTenantManager();

test('Lorawan meaningful errors', async () => {
	const tenant = TENANT_MGR.get();
	const project = 'airport';
	await createResources([`tenants/${tenant}/projects/${project}`]);
	const sensorCredential = await createResourceToken(tenant, project, 'test');

	const mdbClientAuthorized = new MdbApi(
		`${tenant}.${project}`,
		sensorCredential.username,
		sensorCredential.password
	);
	const mdbClientUnauthorized = new MdbApi(
		`${tenant}.${project}`,
		'not-a-valid-username',
		'notAValidPassphrase'
	);

	const thingName = 'sauce_meter';
	const sensortypeId = await mdbClientAuthorized.createSensorTypeWithExistingProperties(
		'sauce_type',
		[
			{
				name: 'airPressure',
				alias: null
			}
		]
	);
	const deveui = await mdbClientAuthorized.createThing(sensortypeId, thingName, 'activated');
	const soupSensorThing: Thing = { deveui: deveui, appid: 'test', devid: 'test' };

	// sensor writing with unauthorized token
	await test.step('Unauthorized Token writeVarsLorawan', async () => {
		const result = await mdbClientUnauthorized.remotWriteVarsLorawanUnchecked(soupSensorThing, {
			airPressure: 100
		});
		expect(result.status).toBe(401);
		expect(result.data).toContain(
			'The server could not verify that you are authorized to access the URL requested.'
		);
	});

	// post non matching schema to thing
	await test.step('non-matching schema writeVarsLorawan', async () => {
		// could not convert string to float
		const resultStringToFloat = await mdbClientAuthorized.remotWriteVarsLorawanUnchecked(
			soupSensorThing,
			{
				airPressure: 'positive pressure'
			}
		);
		expect(resultStringToFloat.data).toContain('could not convert string to float');

		// no payload object
		const resultNoPayload =
			await mdbClientAuthorized.remotWriteVarsLorawanUnchecked(soupSensorThing);
		expect(resultNoPayload.status).toBe(400);
		expect(resultNoPayload.data.errors[0].title).toContain(
			"'decoded_payload' is a required property"
		);

		// no request body
		const resultNoRequestBody = await mdbClientAuthorized.postToLorawanWithoutRequestBody();
		expect(resultNoRequestBody.status).toBe(400);
		expect(resultNoRequestBody.data.errors[0].title).toBe('Missing required request body');
	});
});
