import {
	type CombinedError,
	type OperationContext,
	type TypedDocumentNode,
	type OperationResult,
	Client,
	getContextClient,
	queryStore
} from '@urql/svelte';
import { error } from '$lib/common/toast/toast';
import type {
	GetThingsQuery,
	GetThingsQueryVariables,
	GetPropertiesQuery,
	GetPropertiesQueryVariables,
	GetSensorsQuery,
	GetSensorsQueryVariables,
	GetThingsLatestErrorsQuery,
	GetThingsLatestErrorsQueryVariables
} from '../generated/types';
import { GET_THINGS, GET_PROPERTIES, GET_SENSORS, GET_THINGS_ERRORS } from './queries';
import { getContext } from 'svelte';
import type { GetScopesQuery } from '../generated/types-resource-api';

export function hasPermission(
	tenantObject: GetScopesQuery['tenant'] | undefined,
	scope: string,
	resourceType?: string,
	resource?: string
): boolean {
	if (!tenantObject) return false;

	if (!resourceType) {
		return tenantObject.scopes.granted.includes(scope);
	}
	if (resourceType === 'tenant' && resource) {
		return !!tenantObject.scopes?.granted.includes(scope);
	} else if (resourceType === 'group' && resource) {
		return !!tenantObject.groups
			?.find((g) => g.group === resource)
			?.scopes?.granted.includes(scope);
	} else if (resourceType === 'project' && resource) {
		return !!tenantObject.projects
			?.find((p) => p.project === resource)
			?.scopes?.granted.includes(scope);
	} else if (resourceType == 'viz-group' && resource) {
		return !!tenantObject.vizGroups
			?.find((vg) => vg.vizGroup === resource)
			?.scopes?.granted.includes(scope);
	}

	return false;
}
// translates from graphql naming scheme to keycloaks resource one
export const resourceTypeToScopeName = {
	tenant: 'tenant',
	group: 'group',
	project: 'project',
	vizGroup: 'viz-group'
};

export function handleCombinedErrors(
	combinedError: CombinedError,
	options: { showToasts: boolean }
): void {
	if (combinedError.networkError) {
		console.log(combinedError.networkError);
		if (options.showToasts) {
			error('shared.message.networkError', 'shared.message.networkErrorDetail');
		}
	}
	if (combinedError.graphQLErrors.length) {
		if (options.showToasts) {
			if (
				combinedError.graphQLErrors.length === 1 &&
				combinedError.graphQLErrors.some((error) => error.message === 'quota exceeded')
			) {
				error('shared.message.quotaExceeded', 'shared.message.quotaExceededDetail');
			} else {
				error('shared.message.graphqlError', 'shared.message.graphqlErrorDetail');
			}
		}
		combinedError.graphQLErrors.forEach((graphqlError) => {
			console.log(graphqlError);
		});
	}
}

//   export function getEnum(client: Client, name: string): Promise<Array<string>> {
//     const enumData = queryStore<GetEnumQuery, GetEnumQueryVariables>({
//       client,
//       query: GET_ENUM_BY_TYPE,
//       variables: { name },
//     });

//     return new Promise((resolve, reject) => {
//       enumData.subscribe((query) => {
//         if (query.error) {
//           handleCombinedErrors(query.error, { showToasts: false });
//           reject(query.error);
//         }
//         if (query.data) {
//           const enumArray =
//             query.data.__type?.enumValues?.map((role) => role.name) ?? [];
//           resolve(enumArray);
//         }
//       });
//     });
//   }

export function performMutation<Query, Variables extends { [prop: string]: any }>(
	client: Client,
	query: TypedDocumentNode,
	variables: Variables,
	context: Partial<OperationContext> = {}
): Promise<OperationResult<Query, Variables>> {
	return client.mutation<Query, Variables>(query, variables, context).toPromise();
}

export function removeTypename<T>(x: T): T {
	if (Array.isArray(x)) {
		return x.map((v): unknown => removeTypename(v)) as unknown as T;
	} else if (x !== null && typeof x === 'object') {
		return Object.fromEntries(
			Object.entries(x)
				.filter(([k]) => k !== '__typename')
				.map(([k, v]) => [
					k,
					v !== null && typeof v === 'object' ? removeTypename(v as Record<string, unknown>) : v
				])
		) as unknown as T;
	} else {
		return x;
	}
}

export function projectCondition(project: string) {
	return project === 'all' ? undefined : project;
}

export function getThingsStore(projectId: string) {
	return queryStore<GetThingsQuery, GetThingsQueryVariables>({
		client: getContextClient(),
		query: GET_THINGS,
		variables: {
			condition: {
				project: projectCondition(projectId)
			}
		}
	});
}

export function getNewThingsStore(projectId: string) {
	return queryStore<GetThingsQuery, GetThingsQueryVariables>({
		client: getContextClient(),
		query: GET_THINGS,
		variables: {
			condition: {
				status: 'created',
				project: projectCondition(projectId)
			}
		}
	});
}

export function getPropertyStore(projectId: string) {
	return queryStore<GetPropertiesQuery, GetPropertiesQueryVariables>({
		client: getContextClient(),
		query: GET_PROPERTIES,
		variables: {
			condition: {
				project: projectCondition(projectId)
			}
		},
		context: {
			additionalTypenames: ['Property']
		}
	});
}

export function getSensorTypesStore(projectId: string) {
	return queryStore<GetSensorsQuery, GetSensorsQueryVariables>({
		client: getContextClient(),
		query: GET_SENSORS,
		variables: {
			condition: {
				project: projectCondition(projectId)
			}
		}
	});
}

export function getallThingsErrorsStore(projectId?: string) {
	return queryStore<GetThingsLatestErrorsQuery, GetThingsLatestErrorsQueryVariables>({
		client: getContextClient(),
		query: GET_THINGS_ERRORS,
		variables: {
			condition: {
				project: projectId,
				hasError: true
			}
		}
	});
}

export function getResourceApiClient(): Client {
	return getContext('resourceApiGraphql');
}
