import { error, success } from '$lib/common/toast/toast';
import { getConfig } from '$lib/config';
import { getMessageFormatter } from 'svelte-i18n';

export const API_NAME_REGEX = '[a-z0-9]([\\-a-z0-9]{0,34}[a-z0-9])?';

export const deleteResource = async (resourcePath: string, accessToken: string) => {
	return apiFetchResponse(resourcePath, accessToken, 'DELETE').then(() =>
		success('shared.message.deletedSuccessfully')
	);
};

export const fetchGroups = async (tenant: string, accessToken: string) => {
	return apiFetch<string[]>(`data-hub/tenants/${tenant}/groups`, accessToken, true);
};

export const fetchScopes = async (tenant: string, project: string | null, accessToken: string) => {
	return apiFetch<{ all: string[]; granted: string[] }>(
		`data-hub/tenants/${tenant}${project ? `/projects/${project}` : ''}/scopes`,
		accessToken,
		false
	);
};

export const apiFetchResponse = async (
	path: string,
	accessToken: string,
	method?: 'GET' | 'PUT' | 'POST' | 'DELETE',
	body?: any,
	baseUrl = getConfig('OIDC_AUTHORITY')
) => {
	const response = await fetch(`${baseUrl}/${path}`, {
		method,
		mode: 'cors',
		headers: {
			Authorization: `Bearer ${accessToken}`
		},
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		switch (response.status) {
			// Unauthorized
			case 401:
				error('shared.message.networkError', 'shared.keycloakAPI.requestErros.unauthorized');
				break;
			// Forbidden
			case 403:
				error('shared.message.networkError', 'shared.keycloakAPI.requestErros.forbidden');
				break;
			// Conflict
			case 409:
				error('shared.message.networkError', 'shared.keycloakAPI.requestErros.conflict');
				break;
			default:
				error('shared.message.networkError', 'shared.message.networkErrorDetail');
		}
		return Promise.reject('response not ok');
	}

	return response;
};

export const apiFetch = async <T>(
	path: string,
	accessToken: string,
	checkArray = false,
	expectedKeys?: string[],
	method?: 'GET' | 'PUT' | 'POST' | 'DELETE',
	body?: any,
	baseUrl = getConfig('OIDC_AUTHORITY')
) => {
	const response = await apiFetchResponse(path, accessToken, method, body, baseUrl);
	const data: object = (await response.json()) as unknown as object;
	let isMalformed = false;
	if (checkArray && !Array.isArray(data)) {
		isMalformed = true;
	} else if (expectedKeys?.length) {
		const responseKeys = Object.keys(data);
		for (const key of expectedKeys) {
			if (!responseKeys.includes(key)) {
				isMalformed = true;
				break;
			}
		}
	}
	if (isMalformed) {
		console.error(getMessageFormatter('shared.message.responseError').format(), data);
		return Promise.reject('malformed data');
	}

	return data as T;
};

export const handleSubmit = function handleSubmit(e: Event, callBackFunction: () => void) {
	const formElement = e.target as HTMLFormElement;
	if (!formElement.checkValidity()) {
		formElement.classList.add('was-validated');
	} else {
		formElement.classList.remove('was-validated');
		callBackFunction();
	}
};
