<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { PageData } from './$types';
	import { API_NAME_REGEX, apiFetch, handleSubmit } from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import {
		Button,
		ButtonGroup,
		Input,
		Label,
		Modal,
		P,
		Spinner,
		Tabs,
		TabItem,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		Card,
		Tooltip
	} from 'flowbite-svelte';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import { activeProjectId } from '$lib/nav/activeProject';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { success, error } from '$lib/common/toast/toast';
	import { getConfig } from '$lib/config';
	import CopyIcon from '~icons/heroicons/clipboard';
	import { fetchPermissions, type ResourceType } from '$lib/nav/fetchUtils';
	import PermissionList from '$lib/permissions/PermissionList.svelte';
	import { refreshAccessToken } from '$lib/common/auth/Auth.svelte';
	import PageTitle from '$lib/PageTitle.svelte';
	import { getResourceApiClient, hasPermission } from '$lib/common/graphql/utils';
	import {
		type GetProjectDisplayNameQuery,
		type GetProjectDisplayNameQueryVariables,
		type GetScopesQuery,
		type GetScopesQueryVariables
	} from '$lib/common/generated/types-resource-api';
	import { GET_SCOPES } from '$lib/common/graphql/queries-resource-api';
	import {
		createSensorCredential,
		deleteProject,
		deleteSensorCredential,
		rotateSensorCredential
	} from '$lib/common/graphql/ressource-api-utils';
	import { queryStore, type Client as GraphQLClient } from '@urql/svelte';
	import DisplayNameModal from '$lib/DisplayNameModal.svelte';
	import { GET_PROJECT_DISPLAY_NAME } from '$lib/common/graphql/queries-resource-api';
	import OwmCollectorMenu from '$lib/OwmCollectorMenu.svelte';
	import ResourceOverviewMenu from '$lib/ResourceOverviewMenu.svelte';
	import ResourceScopesMenu from '$lib/ResourceScopesMenu.svelte';
	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const project: string = $derived(data.project);
	const tenant: string = $derived(data.tenant);

	const gqlClient: GraphQLClient = getResourceApiClient();
	let displayNameStore = $derived(
		queryStore<GetProjectDisplayNameQuery, GetProjectDisplayNameQueryVariables>({
			client: gqlClient,
			query: GET_PROJECT_DISPLAY_NAME,
			variables: {
				tenant: tenant,
				resourceName: project
			}
		})
	);

	let scopesStore = $derived(
		queryStore<GetScopesQuery, GetScopesQueryVariables>({
			client: gqlClient,
			query: GET_SCOPES,
			variables: {
				tenant: tenant
			}
		})
	);

	let resource: ResourceType = $derived({
		type: 'project',
		tenant: tenant,
		resourceName: project,
		displayName: $displayNameStore.data?.project?.displayName ?? project
	});

	let displayNameModalOpen = $state(false);

	$effect(() => {
		$activeProjectId = `${data.tenant}.${data.project}`;
	});

	let tenantObject = $derived($scopesStore.data?.tenant);
	let scopes = $derived(
		tenantObject?.projects.find((p) => p.project == project)?.scopes?.granted ?? []
	);

	let requestSent = $state(false);
	let showTokenParameterModalOpen = $state(false);
	let nameModalOpen = $state(false);
	let sensorCredential: string = $state('');
	let credentials: { username: string; password: string } = $state({
		username: '',
		password: ''
	});

	let credentialsPromise = $state(fetchSensorCredentials());
	let permissionsPromise = $derived(fetchPermissions(resource, $accessToken));

	function fetchSensorCredentials() {
		return apiFetch<string[]>(
			`data-hub/tenants/${tenant}/projects/${project}/sensor-credentials`,
			$accessToken,
			true
		);
	}

	async function createToken() {
		requestSent = true;

		await createSensorCredential(gqlClient, tenant, project, sensorCredential)
			.then(async (result) => {
				if (result) {
					showTokenParameterModalOpen = true;
					nameModalOpen = false;
					credentials.username = result.username;
					credentials.password = result.password;
					sensorCredential = '';
				}
			})
			.finally(() => {
				requestSent = false;
				credentialsPromise = fetchSensorCredentials();
			});
	}

	async function rotateToken(token: string) {
		requestSent = true;

		sensorCredential = token;
		await rotateSensorCredential(gqlClient, tenant, project, token)
			.then((result) => {
				if (result) {
					showTokenParameterModalOpen = true;
					nameModalOpen = false;
					credentials.username = result.username;
					credentials.password = result.password;
				}
			})
			.finally(() => {
				requestSent = false;
				credentialsPromise = fetchSensorCredentials();
			});
	}

	async function copy(data: 'password' | 'username' | 'baseUrl') {
		try {
			if ('password' === data || 'username' === data) {
				await navigator.clipboard.writeText(credentials[data]);
			} else if (data === 'baseUrl') {
				await navigator.clipboard.writeText(getConfig('API_BASE_URL'));
			}

			success('page.projectOverview.apiTokenModal.copySuccess');
		} catch {
			error('page.projectOverview.apiTokenModal.copyError');
		}
	}

	async function deleteToken(tokenName: string) {
		await deleteSensorCredential(gqlClient, tenant, project, tokenName).then(() => {
			credentialsPromise = fetchSensorCredentials();
		});
	}

	function reload() {
		permissionsPromise = fetchPermissions(resource, $accessToken);
	}

	let hasAdminOnProject = $derived(
		hasPermission(tenantObject, 'project:admin', 'project', project)
	);
	let hasRotateSensorCredentialsPermission = $derived(
		hasPermission(tenantObject, 'sensor-credential:rotate', 'project', project)
	);
	let canViewOwmCollectors = $derived(
		hasPermission(tenantObject, 'owm-collector:view', 'project', project)
	);
	let canViewSensorCredentials = $derived(
		hasPermission(tenantObject, 'sensor-credential:view', 'project', project)
	);
</script>

<PageTitle
	title={$_('page.projectsList.projectPageOverview') + (resource.displayName ?? project)}
/>

<Tabs>
	<TabItem open title={$_('page.resourceTabMenu.overview')}>
		<ResourceOverviewMenu {tenantObject} {resource} bind:displayNameModalOpen />
	</TabItem>
	<TabItem title={$_('page.resourceTabMenu.scopes')}>
		<ResourceScopesMenu {scopes} />
	</TabItem>

	<TabItem
		class="permissions-list-tab"
		disabled={!hasAdminOnProject}
		title={$_('page.projectsList.permissionListTitle')}
	>
		{#await permissionsPromise}
			<Spinner />
		{:then permissions}
			<PermissionList {tenantObject} {resource} {permissions} {reload} />
		{/await}
	</TabItem>
	{#if !hasAdminOnProject}
		<Tooltip triggeredBy=".permissions-list-tab" placement="top">
			{$_('component.permissions.missingPermissions')}
		</Tooltip>
	{/if}
	<TabItem
		class="token-tab"
		disabled={!canViewSensorCredentials}
		title={$_('page.projectsList.tokens')}
	>
		<Card class="max-w-full">
			{#await credentialsPromise}
				<Spinner />
			{:then credentials}
				<Table>
					<TableBody>
						{#each credentials as token (token)}
							<TableBodyRow>
								<TableBodyCell class="m-0 p-0 pl-3">{token}</TableBodyCell>
								<TableBodyCell class="m-0 flex justify-end gap-2 p-0 py-2 pr-3">
									<DeleteButton
										disabled={!hasRotateSensorCredentialsPermission}
										modalTitle={$_('page.projectOverview.rotateTokenConfirmationModal.title')}
										buttonTitle={!hasRotateSensorCredentialsPermission
											? $_('component.permissions.missingPermissions')
											: $_('page.projectOverview.apiTokenModal.buttonText')}
										buttonText={$_('page.projectOverview.apiTokenModal.buttonText')}
										modalBody={$_('page.projectOverview.rotateTokenConfirmationModal.body')}
										color="alternative"
										submitFunction={() => rotateToken(token)}
									/>
									<DeleteButton
										disabled={!hasAdminOnProject}
										modalTitle="page.projectOverview.deleteModalToken.title"
										modalBody="page.projectOverview.deleteModalToken.body"
										buttonTitle={!hasAdminOnProject
											? $_('component.permissions.missingPermissions')
											: 'shared.action.delete'}
										buttonText="shared.action.delete"
										submitFunction={() => deleteToken(token)}
									/>
								</TableBodyCell>
							</TableBodyRow>
						{/each}
					</TableBody>
				</Table>
			{/await}
			<Button
				disabled={!hasAdminOnProject}
				title={!hasAdminOnProject
					? $_('component.permissions.missingPermissions')
					: $_('page.projectsList.newTokenButton')}
				color="green"
				class={`mt-4 ${!hasAdminOnProject ? '' : 'cursor-copy'}`}
				onclick={() => (nameModalOpen = true)}
			>
				{$_('page.projectsList.newTokenButton')}
			</Button>
		</Card>
	</TabItem>
	{#if !canViewSensorCredentials}
		<Tooltip triggeredBy=".token-tab" placement="top">
			{$_('component.permissions.missingPermissions')}
		</Tooltip>
	{/if}
	<TabItem
		class="owm-tab"
		disabled={!canViewOwmCollectors}
		title={$_('page.projectOverview.owmCollectors')}
	>
		<OwmCollectorMenu {tenantObject} {tenant} {project}></OwmCollectorMenu>
	</TabItem>
	{#if !canViewOwmCollectors}
		<Tooltip triggeredBy=".owm-tab" placement="top">
			{$_('component.permissions.missingPermissions')}
		</Tooltip>
	{/if}
	<TabItem title={$_('page.resourceTabMenu.dangerZone')}>
		<Card class="max-w-full">
			<DeleteButton
				buttonTitle={!hasAdminOnProject
					? $_('component.permissions.missingPermissions')
					: 'shared.action.delete'}
				buttonText="shared.action.delete"
				disabled={!hasAdminOnProject}
				additionalClasses="w-fit"
				modalTitle="page.projectsList.deleteModal.title"
				modalBody="page.projectsList.deleteModal.body"
				submitFunction={async () => {
					await deleteProject(gqlClient, tenant, project, refreshAccessToken);
				}}
			/>
		</Card>
	</TabItem>
</Tabs>

<Modal
	bind:open={showTokenParameterModalOpen}
	title={$_('page.projectOverview.apiTokenModal.title', { values: { project, sensorCredential } })}
>
	<P>
		{$_('page.projectOverview.apiTokenModal.explanation')}
	</P>
	<Label for="usernameDisplay" class="text-gray-900 dark:text-gray-100">
		{$_('page.projectOverview.apiTokenModal.usernameDisplay')}
	</Label>
	<ButtonGroup divClass="w-full inline-flex rounded-lg shadow-xs">
		<Input bind:value={credentials.username} id="usernameDisplay" disabled class="max-w-full" />
		<Button onclick={() => copy('username')} color="primary">
			<span class="flex flex-row gap-2">
				<CopyIcon />
				{$_('page.projectOverview.apiTokenModal.copy')}
			</span>
		</Button>
	</ButtonGroup>
	<Label for="passwordDisplay" class="text-gray-900 dark:text-gray-100">
		{$_('page.projectOverview.apiTokenModal.passwordDisplay')}
	</Label>
	<ButtonGroup divClass="w-full inline-flex rounded-lg shadow-xs">
		<Input bind:value={credentials.password} id="passwordDisplay" disabled class="max-w-full" />
		<Button onclick={() => copy('password')} color="primary">
			<span class="flex flex-row gap-2">
				<CopyIcon />
				{$_('page.projectOverview.apiTokenModal.copy')}
			</span>
		</Button>
	</ButtonGroup>
	<Label for="baseUrlDisplay" class="text-gray-900 dark:text-gray-100">
		{$_('page.projectOverview.apiTokenModal.endpointLabel')}
	</Label>
	<ButtonGroup divClass="w-full inline-flex rounded-lg shadow-xs">
		<Input value={getConfig('API_BASE_URL')} id="baseUrlDisplay" disabled class="max-w-full" />
		<Button onclick={() => copy('baseUrl')} color="primary">
			<span class="flex flex-row gap-2">
				<CopyIcon />
				{$_('page.projectOverview.apiTokenModal.copy')}
			</span>
		</Button>
	</ButtonGroup>
	<svelte:fragment slot="footer">
		<Button onclick={() => (showTokenParameterModalOpen = false)}>
			{$_('shared.action.close')}
		</Button>
	</svelte:fragment>
</Modal>

<form novalidate onsubmit={(event) => handleSubmit(event, createToken)} class="needs-validation">
	<Modal bind:open={nameModalOpen} title={$_('page.projectOverview.apiTokenModal.nameModalTitle')}>
		<div>
			<ValidatedFormField
				bind:value={sensorCredential}
				pattern={API_NAME_REGEX}
				patternMismatchText={$_('shared.keycloakAPI.resourceNameInvalid')}
				required
				inputLabel={$_('page.projectOverview.apiTokenModal.nameInputLabel')}
				inputId="newCredentialNameInput"
			/>
		</div>
		<svelte:fragment slot="footer">
			<Button disabled={!hasAdminOnProject || requestSent} type="submit">
				{$_('page.projectOverview.apiTokenModal.buttonTextCreate')}
				{#if requestSent}
					<Spinner />
				{/if}
			</Button>
		</svelte:fragment>
	</Modal>
</form>

<DisplayNameModal bind:isOpen={displayNameModalOpen} bind:resource />
