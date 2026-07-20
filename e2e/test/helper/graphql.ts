import axios from 'axios';
import { RESOURCE_API } from './urls';
import { ADMIN_USER, KeycloakUser } from './keycloak';
import { expect } from 'playwright/test';

export async function makeResourceApiGraphqlRequest(
	query: GraphQLQuery,
	variables: Record<string, string>,
	user: KeycloakUser | null = ADMIN_USER
): Promise<any> {
	const result = await axios.post(
		`${RESOURCE_API}graphql`,
		{
			query: query.query,
			variables
		},
		{ headers: user ? { Authorization: `Bearer ${await user.token()}` } : {} }
	);
	expect(result.status).toBe(200);
	// console.log(JSON.stringify(result.data, null, 2));
	return result.data;
}

export async function checkedResourceApiGraphqlRequest(
	query: GraphQLQuery,
	variables: Record<string, string>,
	user: KeycloakUser | null = ADMIN_USER
): Promise<any> {
	const result = await makeResourceApiGraphqlRequest(query, variables, user);
	expect(result.errors).toEqual([]);
	return result;
}

interface GraphQLQuery {
	query: string;
}

// the graphql tag causes prettier to format the query
export function graphql(s: TemplateStringsArray, ...values: string[]): GraphQLQuery {
	return { query: String.raw(s, ...values) };
}

export async function deleteTenant(tenant: string) {
	await makeResourceApiGraphqlRequest(
		graphql`
			mutation ($tenant: String!) {
				deleteTenant(tenant: $tenant)
			}
		`,
		{ tenant }
	);
}
