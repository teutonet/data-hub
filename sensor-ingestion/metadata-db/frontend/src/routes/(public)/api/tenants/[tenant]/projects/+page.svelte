<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import { _ } from 'svelte-i18n';
	import type { PageData } from './$types';
	import { accessToken } from '$lib/common/auth';
	import { success } from '$lib/common/toast/toast';
	import { Button, Modal, P, Spinner } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import { API_NAME_REGEX, apiFetch, deleteResource, handleSubmit } from '$lib/nav/fetchUtils';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import { refreshAccessToken } from '$lib/common/auth/Auth.svelte';
	import { activeProjectId } from '$lib/nav/activeProject';

	export let data: PageData;
	const tenant: string = data.tenant;
	$activeProjectId = undefined;

	let promise = fetchProject();

	function fetchProject() {
		return apiFetch<string[]>(`data-hub/tenants/${tenant}/projects`, $accessToken, true);
	}

	let createModalOpen = false;
	let newProjectName = '';
	let requestSent = false;

	function createNewProject() {
		requestSent = true;

		void apiFetch<{ name: string }>(
			`data-hub/tenants/${tenant}/projects/${newProjectName}`,
			$accessToken,
			false,
			['name'],
			'PUT'
		)
			.then(async (response) => {
				const name: string = response.name;
				createModalOpen = false;
				success('shared.message.savedSuccessfully');
				await refreshAccessToken();
				await goto(`projects/${name}`);
			})
			.finally(() => {
				requestSent = false;
			});
	}

	async function deleteProject(project: string) {
		await deleteResource(`data-hub/tenants/${tenant}/projects/${project}`, $accessToken).then(
			() => {
				promise = fetchProject();
			}
		);
	}
</script>

<PageTitle title={$_('page.projectList.title')} />

<div class="flex flex-col gap-2">
	{#await promise}
		<Spinner />
	{:then value}
		{#if Array.isArray(value)}
			{#each value as project}
				<div class="flex flex-row gap-2">
					<Button class="grow" href={`projects/${project}`}>
						{project}
					</Button>
					<DeleteButton
						modalTitle="page.projectList.deleteModal.title"
						modalBody="page.projectList.deleteModal.body"
						buttonTitle="shared.action.delete"
						submitFunction={() => deleteProject(project)}
					/>
				</div>
			{:else}
				<P>
					{$_('page.projectList.noProjects')}
				</P>
			{/each}
		{/if}
	{/await}
</div>

<Button on:click={() => (createModalOpen = true)} class="mt-4" color="green">
	{$_('page.projectList.newProjectButton')}
</Button>

<form
	novalidate
	on:submit|preventDefault={(event) => handleSubmit(event, createNewProject)}
	class="needs-validation"
>
	<Modal bind:open={createModalOpen} title={$_('page.projectList.newProjectModalTitle')}>
		<P>
			{$_('page.projectList.newProjectExplanation')}
		</P>
		<ValidatedFormField
			bind:value={newProjectName}
			required
			inputLabel={$_('page.projectList.newProjectNameInputLabel')}
			inputId="newProjectNameInput"
			pattern={API_NAME_REGEX}
			patternMismatchText={$_('shared.keycloakAPI.resourceNameInvalid')}
			style="outlined"
		></ValidatedFormField>
		<svelte:fragment slot="footer">
			<Button type="submit" disabled={requestSent}>
				<div class="flex flex-row gap-2">
					{$_('shared.action.create')}
					{#if requestSent}
						<Spinner size={4} />
					{/if}
				</div>
			</Button>
		</svelte:fragment>
	</Modal>
</form>
