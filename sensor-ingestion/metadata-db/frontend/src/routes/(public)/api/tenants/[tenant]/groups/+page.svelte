<script lang="ts">
	import type { PageData } from './$types';
	import PageTitle from '$lib/PageTitle.svelte';
	import { Button, Modal, P, Spinner } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import {
		API_NAME_REGEX,
		apiFetch,
		deleteResource,
		fetchGroups,
		handleSubmit
	} from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import { success } from '$lib/common/toast/toast';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';

	export let data: PageData;
	const tenant: string = data.tenant;

	let promise = fetchGroups(tenant, $accessToken);

	let createModalOpen = false;
	let requestSent = false;

	let newGroupName: string;

	function createNewGroup() {
		requestSent = true;
		void apiFetch<{ name: string }>(
			`data-hub/tenants/${tenant}/groups/${newGroupName}`,
			$accessToken,
			false,
			['name'],
			'PUT'
		)
			.then(() => {
				createModalOpen = false;
				success('shared.message.savedSuccessfully');
				promise = fetchGroups(tenant, $accessToken);
				newGroupName = '';
			})
			.finally(() => {
				requestSent = false;
			});
	}

	async function deleteGroup(group: string) {
		await deleteResource(`data-hub/tenants/${tenant}/groups/${group}`, $accessToken).then(() => {
			promise = fetchGroups(tenant, $accessToken);
		});
	}
</script>

<PageTitle title={$_('page.groupsList.title')} />

{#await promise}
	<Spinner />
{:then groups}
	<div class="flex flex-col gap-2">
		{#each groups as group}
			<div class="flex flex-row gap-2">
				<Button class="grow">
					{group}
				</Button>
				<DeleteButton
					modalTitle="page.groupsList.deleteModal.title"
					modalBody="page.groupsList.deleteModal.body"
					buttonTitle="shared.action.delete"
					submitFunction={() => deleteGroup(group)}
				/>
			</div>
		{:else}
			<P>
				{$_('page.groupsList.noGroups')}
			</P>
		{/each}
	</div>
{/await}

<Button on:click={() => (createModalOpen = true)} class="mt-4" color="green">
	{$_('page.groupsList.newGroupButton')}
</Button>

<Modal bind:open={createModalOpen} title={$_('page.groupsList.newGroupModalTitle')} outsideclose>
	<form
		novalidate
		on:submit|preventDefault={(event) => handleSubmit(event, createNewGroup)}
		class="needs-validation"
	>
		<div class="flex flex-col gap-4">
			<P>
				{$_('page.groupsList.newGroupExplanation')}
			</P>
			<ValidatedFormField
				bind:value={newGroupName}
				pattern={API_NAME_REGEX}
				patternMismatchText={$_('shared.keycloakAPI.resourceNameInvalid')}
				required
				inputLabel={$_('page.groupsList.newGroupNameInputLabel')}
				inputId="newGroupNameInput"
			/>
			<Button type="submit" disabled={requestSent}>
				<div class="flex flex-row gap-2">
					{$_('shared.action.create')}
					{#if requestSent}
						<Spinner size={4} />
					{/if}
				</div>
			</Button>
		</div>
	</form>
</Modal>
