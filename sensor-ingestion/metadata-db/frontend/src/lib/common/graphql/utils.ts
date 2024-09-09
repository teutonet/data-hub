import {
	type CombinedError,
	type OperationContext,
	type TypedDocumentNode,
	type OperationResult,
	Client
} from '@urql/svelte';
import { error } from '$lib/common/toast/toast';

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
