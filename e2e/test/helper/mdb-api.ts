import axios, { AxiosInstance } from 'axios';
import { Agent } from 'https';
import { randomUUID } from 'node:crypto';
import { KEYCLOAK, MDB_FRONTEND, API } from './urls';
import { Page } from '@playwright/test';

export interface Property {
	name: string;
	metricName: string | null;
	measure: string | null;
	alias: string | null;
}

export interface ExistingProperty {
	name: string;
	alias: string | null;
}

export interface Thing {
	appid: string;
	devid: string;
	deveui: string;
	location?: [number, number];
}

export async function aquireTokenViaDeviceCode(
	page: Page,
	username: string,
	password: string,
	scope: string[]
): Promise<string> {
	const httpClient = axios.create({
		httpsAgent: new Agent({ rejectUnauthorized: false })
	});
	const authInfo = (
		await httpClient.post<{
			interval: number;
			device_code: string;
			verification_uri_complete: string;
		}>(
			`${KEYCLOAK}realms/udh/protocol/openid-connect/auth/device`,
			{
				client_id: 'usercode',
				scope: ['openid'].concat(scope).join(' ')
			},
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			}
		)
	).data;
	await page.goto(authInfo.verification_uri_complete);
	await page.getByLabel('Username or email').fill(username);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign In' }).click();
	await page.getByRole('button', { name: 'Yes' }).click();

	for (;;) {
		const authResult = await httpClient.post<{ error: string; access_token: string }>(
			`${KEYCLOAK}realms/udh/protocol/openid-connect/token`,
			{
				client_id: 'usercode',
				device_code: authInfo.device_code,
				grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
			},
			{
				validateStatus: (_) => true,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			}
		);
		if (authResult.status === 200) {
			// console.log(authResult.data);
			return authResult.data.access_token;
		} else {
			if (authResult.data.error === 'slow_down') {
				authInfo.interval += 5;
			} else if (authResult.data.error !== 'authorization_pending') {
				throw new Error(`login failed: ${JSON.stringify(authResult.data)}`);
			}
		}
		await page.waitForTimeout(authInfo.interval * 1000);
	}
}

const createSensorProperty = `mutation MyMutation(
	$propertyId: UUID!
	$sensorId: UUID!
	$project: String!
	$alias: String
) {
	createSensorProperty(
		input: {
			sensorProperty: {
				project: $project
				sensorId: $sensorId
				propertyId: $propertyId
				alias: $alias
			}
		}
	) {
		clientMutationId
	}
}`;

export class MdbApi {
	private tokenUrl: string;
	private graphqlUrl: string;
	private httpClient: AxiosInstance;
	private accessToken: { token: string; expiry: number } | undefined;
	constructor(
		private projectName: string,
		private clientId: string,
		private clientSecret: string
	) {
		this.tokenUrl = `${KEYCLOAK}realms/udh/protocol/openid-connect/token`;
		this.graphqlUrl = `${MDB_FRONTEND}graphql`;
		this.httpClient = axios.create({
			httpsAgent: new Agent({ rejectUnauthorized: false })
		});
	}
	async getOrFetchToken(): Promise<string> {
		if (this.accessToken) {
			if (this.accessToken.expiry > Date.now()) {
				return this.accessToken.token;
			}
		}
		const response = await this.fetchToken();
		const expiryTime = Date.now() + (response.expires_in - 5) * 1000;
		this.accessToken = { expiry: expiryTime, token: response.access_token };
		return response.access_token;
	}
	async fetchToken(): Promise<{ access_token: string; expires_in: number }> {
		const response = await this.httpClient.post<{ access_token: string; expires_in: number }>(
			`${this.tokenUrl}`,
			'grant_type=client_credentials',
			{
				auth: {
					username: this.clientId,
					password: this.clientSecret
				}
			}
		);
		return response.data;
	}
	async doGraphqlRequest(
		query: string,
		variables: Record<string, number | string | null>
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): Promise<any> {
		// console.log(query, variables);
		const response = await this.httpClient.post(
			this.graphqlUrl,
			JSON.stringify({
				query,
				variables
			}),
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${await this.getOrFetchToken()}`
				}
			}
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return response.data;
	}
	async createSensorType(name: string): Promise<string> {
		const createSensorTypeQuery = `mutation MyMutation($name: String!, $project: String!) {
			createSensor(input: { sensor: { project: $project, name: $name } }) {
				clientMutationId
				sensor {
					id
				}
			}
		}`;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const sensorTypeResponse = await this.doGraphqlRequest(createSensorTypeQuery, {
			name,
			project: this.projectName
		});
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		return sensorTypeResponse.data.createSensor.sensor.id as string;
	}
	async createSensorTypeWithProperties(name: string, properties: Property[]): Promise<string> {
		const sensorId = await this.createSensorType(name);
		const createProperty = `mutation MyMutation(
			$name: String!
			$project: String!
			$measure: String
			$metricName: String
		) {
			createProperty(
				input: {
					property: {
						project: $project
						name: $name
						metricName: $metricName
						measure: $measure
					}
				}
			) {
				property {
					id
				}
			}
		}`;

		for (const property of properties) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const createPropResponse = await this.doGraphqlRequest(createProperty, {
				name: property.name,
				project: this.projectName,
				measure: property.measure,
				metricName: property.metricName
			});
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const propertyId = createPropResponse.data.createProperty.property.id as string;
			await this.doGraphqlRequest(createSensorProperty, {
				propertyId,
				sensorId: sensorId,
				project: this.projectName,
				alias: property.alias
			});
		}
		return sensorId;
	}
	async createSensorTypeWithExistingProperties(
		name: string,
		properties: ExistingProperty[]
	): Promise<string> {
		const sensorId = await this.createSensorType(name);
		const searchProperty = `query searchProperty($name: String!) {
			properties(condition: {name: $name}) {
				id
			}
		}`;

		for (const property of properties) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const searchResponse = await this.doGraphqlRequest(searchProperty, {
				name: property.name
			});
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const propertyId = searchResponse.data.properties[0].id as string;
			await this.doGraphqlRequest(createSensorProperty, {
				propertyId,
				sensorId: sensorId,
				project: this.projectName,
				alias: property.alias
			});
		}
		return sensorId;
	}
	async createThing(sensorId: string, name: string, status: string): Promise<string> {
		const createThing = `mutation MyMutation(
			$sensorId: UUID!
			$project: String!
			$name: String!
			$deveui: String!
			$status: String!
		) {
			createThing(
				input: {
					thing: {
						project: $project
						name: $name
						sensorId: $sensorId
						deveui: $deveui
						status: $status
					}
				}
			) {
				thing {
					id
				}
			}
		}`;
		const deveui = randomUUID();
		await this.doGraphqlRequest(createThing, {
			name,
			project: this.projectName,
			sensorId,
			deveui,
			status
		});
		return deveui;
	}
	async remoteWriteVars(thing: Thing, variables: Record<string, number | string>) {
		await this.httpClient.post(
			`${API}api/v1/write`,
			JSON.stringify({
				resultTime: new Date().toISOString(),
				sourcePath: {
					deveui: thing.deveui,
					devid: thing.devid,
					appid: thing.appid
				},
				variables
			}),
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${await this.getOrFetchToken()}`
				}
			}
		);
	}
	async remoteWriteVarsLorawan(thing: Thing, variables: Record<string, number | string>) {
		const data = {
			'@type': 'type.googleapis.com/ttn.lorawan.v3.ApplicationUp',
			end_device_ids: {
				device_id: thing.devid,
				application_ids: {
					application_id: thing.appid
				},
				dev_eui: thing.deveui,
				join_eui: 'A000000000004321',
				dev_addr: '12345678'
			},
			received_at: new Date().toISOString(),
			uplink_message: {
				decoded_payload: variables,
				rx_metadata: [{}],
				received_at: new Date().toISOString(),
				locations: thing.location
					? {
							user: {
								latitude: thing.location[0],
								longitude: thing.location[1],
								source: 'SOURCE_REGISTRY'
							}
						}
					: {}
			}
		};
		await this.httpClient.post(`${API}api/v1/sensordata`, JSON.stringify(data), {
			headers: {
				'Content-Type': 'application/json'
			},
			auth: {
				username: this.clientId,
				password: this.clientSecret
			}
		});
	}
}
