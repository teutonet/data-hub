<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { _ } from 'svelte-i18n';
	import type { PageData } from './$types';
	import { API_NAME_REGEX, apiFetch, deleteResource, handleSubmit } from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import {
		Button,
		ButtonGroup,
		Input,
		Label,
		Modal,
		P,
		Spinner,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow
	} from 'flowbite-svelte';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import { activeProjectId } from '$lib/nav/activeProject';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { success, error } from '$lib/common/toast/toast';
	import { getConfig } from '$lib/config';
	import CopyIcon from '~icons/heroicons/clipboard';

	export let data: PageData;
	const project: string = data.project;
	const tenant: string = data.tenant;
	$activeProjectId = `${data.tenant}.${data.project}`;

	let requestSent = false;
	let showTokenParameterModalOpen = false;
	let nameModalOpen = false;
	let sensorCredential: string | undefined;
	let credentials: { username: string; password: string } = {
		username: '',
		password: ''
	};

	let credentialsPromise = fetchSensorCredentials();

	function fetchSensorCredentials() {
		return apiFetch<string[]>(
			`data-hub/tenants/${tenant}/projects/${project}/sensor-credentials`,
			$accessToken,
			true
		);
	}

	function createToken() {
		requestSent = true;

		void apiFetch<{ username: string; password: string }>(
			`data-hub/tenants/${tenant}/projects/${project}/sensor-credentials/${sensorCredential}`,
			$accessToken,
			false,
			['username', 'password'],
			'PUT'
		)
			.then((response) => {
				showTokenParameterModalOpen = true;
				nameModalOpen = false;
				credentials.username = response.username;
				credentials.password = response.password;
			})
			.finally(() => {
				requestSent = false;
				credentialsPromise = fetchSensorCredentials();
			});
	}

	function rotateToken(token) {
		requestSent = true;

		sensorCredential = token;
		void apiFetch<{ username: string; password: string }>(
			`data-hub/tenants/${tenant}/projects/${project}/sensor-credentials/${sensorCredential}/rotate`,
			$accessToken,
			false,
			['username', 'password'],
			'POST'
		)
			.then((response) => {
				showTokenParameterModalOpen = true;
				nameModalOpen = false;
				credentials.username = response.username;
				credentials.password = response.password;
			})
			.finally(() => {
				requestSent = false;
				credentialsPromise = fetchSensorCredentials();
			});
	}

	async function copy(data: 'password' | 'username' | 'baseUrl') {
		try {
			if (['password', 'username'].includes(data)) {
				await navigator.clipboard.writeText(credentials[data]);
			} else if (data === 'baseUrl') {
				await navigator.clipboard.writeText(getConfig('API_BASE_URL'));
			}

			success('page.projectOverview.apiTokenModal.copySuccess');
		} catch (err) {
			error('page.projectOverview.apiTokenModal.copyError');
		}
	}

	async function deleteSensorCredential(tokenName: string | undefined) {
		await deleteResource(
			`data-hub/tenants/${tenant}/projects/${project}/sensor-credentials/${tokenName}`,
			$accessToken
		).then(() => {
			credentialsPromise = fetchSensorCredentials();
		});
	}
</script>

<PageTitle title={project} />

<div class="flex flex-col gap-1">
	<Button href={`${project}/permissions`} class="mt-4">
		{$_('page.projectList.permissionListTitle')}
	</Button>
</div>
<div class="flex flex-col gap-1">
	<Button color="green" on:click={() => (nameModalOpen = true)} class="mt-4">
		{$_('page.projectList.newTokenButton')}
	</Button>
</div>

{#await credentialsPromise}
	<Spinner />
{:then credentials}
	<Table class="mt-4">
		<TableBody>
			{#each credentials as token}
				<TableBodyRow>
					<TableBodyCell>{token}</TableBodyCell>
					<TableBodyCell class="flex justify-end gap-2">
						<DeleteButton
							modalTitle={$_('page.projectOverview.rotateTokenConfirmationModal.title')}
							modalBody={$_('page.projectOverview.rotateTokenConfirmationModal.body')}
							buttonTitle="API-Token erneuern"
							color="alternative"
							submitFunction={() => rotateToken(token)}
						/>
						<DeleteButton
							modalTitle="page.projectOverview.deleteModal.title"
							modalBody="page.projectOverview.deleteModal.body"
							buttonTitle="shared.action.delete"
							submitFunction={() => deleteSensorCredential(token)}
						/>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/await}

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
	<ButtonGroup divClass="w-full inline-flex rounded-lg shadow-sm">
		<Input bind:value={credentials.username} id="usernameDisplay" disabled class="max-w-full" />
		<Button on:click={() => copy('username')} color="primary">
			<span class="flex flex-row gap-2">
				<CopyIcon />
				{$_('page.projectOverview.apiTokenModal.copy')}
			</span>
		</Button>
	</ButtonGroup>
	<Label for="passwordDisplay" class="text-gray-900 dark:text-gray-100">
		{$_('page.projectOverview.apiTokenModal.passwordDisplay')}
	</Label>
	<ButtonGroup divClass="w-full inline-flex rounded-lg shadow-sm">
		<Input bind:value={credentials.password} id="passwordDisplay" disabled class="max-w-full" />
		<Button on:click={() => copy('password')} color="primary">
			<span class="flex flex-row gap-2">
				<CopyIcon />
				{$_('page.projectOverview.apiTokenModal.copy')}
			</span>
		</Button>
	</ButtonGroup>
	<Label for="baseUrlDisplay" class="text-gray-900 dark:text-gray-100">
		{$_('page.projectOverview.apiTokenModal.endpointLabel')}
	</Label>
	<ButtonGroup divClass="w-full inline-flex rounded-lg shadow-sm">
		<Input value={getConfig('API_BASE_URL')} id="baseUrlDisplay" disabled class="max-w-full" />
		<Button on:click={() => copy('baseUrl')} color="primary">
			<span class="flex flex-row gap-2">
				<CopyIcon />
				{$_('page.projectOverview.apiTokenModal.copy')}
			</span>
		</Button>
	</ButtonGroup>
	<svelte:fragment slot="footer">
		<Button on:click={() => (showTokenParameterModalOpen = false)}>
			{$_('shared.action.close')}
		</Button>
	</svelte:fragment>
</Modal>

<form
	novalidate
	on:submit|preventDefault={(event) => handleSubmit(event, createToken)}
	class="needs-validation"
>
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
			<Button type="submit" disabled={requestSent}>
				{$_('page.projectOverview.apiTokenModal.buttonTextCreate')}
				{#if requestSent}
					<Spinner />
				{/if}
			</Button>
		</svelte:fragment>
	</Modal>
</form>
