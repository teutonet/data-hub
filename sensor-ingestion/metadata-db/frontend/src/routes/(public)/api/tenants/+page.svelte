<script lang="ts">
	import { goto } from '$app/navigation';
	import PageTitle from '$lib/PageTitle.svelte';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { accessToken } from '$lib/common/auth';
	import { success } from '$lib/common/toast/toast';
	import { API_NAME_REGEX, apiFetch, handleSubmit } from '$lib/nav/fetchUtils';
	import { Button, Modal, P, Spinner } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';

	let createModalOpen = false;
	let newTenantName = '';
	let requestSent = false;

	const promise = apiFetch<string[]>('data-hub/tenants', $accessToken, true);

	function createNewTenant() {
		requestSent = true;
		void apiFetch<{ name: string }>(
			`data-hub/tenants/${newTenantName}`,
			$accessToken,
			false,
			['name'],
			'PUT'
		)
			.then(async (response) => {
				const name: string = response.name;
				createModalOpen = false;
				success('shared.message.savedSuccessfully');
				await goto(`tenants/${name}`);
			})
			.finally(() => {
				requestSent = false;
			});
	}
</script>

<PageTitle title={$_('page.tenantsList.title')} />

{#await promise}
	<Spinner />
{:then value}
	{#if Array.isArray(value)}
		<div class="flex flex-col gap-2">
			{#each value as tenant}
				<Button href={`tenants/${tenant}`}>
					{tenant}
				</Button>
			{:else}
				<P>
					{$_('page.tenantsList.noTenants')}
				</P>
			{/each}
		</div>
	{/if}
{/await}

<Button on:click={() => (createModalOpen = true)} class="mt-4" color="green">
	{$_('page.tenantsList.newTenantButton')}
</Button>

<Modal bind:open={createModalOpen} title={$_('page.tenantsList.newTenantModalTitle')} outsideclose>
	<form
		novalidate
		on:submit|preventDefault={(event) => handleSubmit(event, createNewTenant)}
		class="needs-validation"
	>
		<div class="flex flex-col gap-4">
			<P>
				{$_('page.tenantsList.newTenantExplanation')}
			</P>
			<ValidatedFormField
				bind:value={newTenantName}
				pattern={API_NAME_REGEX}
				patternMismatchText={$_('shared.keycloakAPI.resourceNameInvalid')}
				required
				inputLabel={$_('page.tenantsList.newTenantNameInputLabel')}
				inputId="newTenantNameInput"
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
