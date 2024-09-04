<script lang="ts">
	import { API_NAME_REGEX, apiFetchResponse, handleSubmit } from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import { Button, Label, MultiSelect, Spinner } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import { error, success, warning } from '$lib/common/toast/toast';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { goto } from '$app/navigation';

	export let tenant: string;
	export let project: string | null = null;
	export let permission: string;

	export let permissionObject: { groups: (string | null)[]; scopes: string[] };
	let newPermissionObject: { groups: string[]; scopes: string[] } = {
		// replace incoming null with 'all' option
		groups: permissionObject.groups.includes(null)
			? ['all']
			: permissionObject.groups.map((group) => group as string),
		scopes: permissionObject.scopes
	};
	export let selectableGroups: string[];
	export let selectableScopes: string[];

	export let isNew: boolean;

	let requestSent = false;

	function mapForSelect(items: string[]): Array<{ value: string; name: string }> {
		return items.map((item) => ({ value: item, name: item }));
	}

	function createOrUpdatePermission() {
		if (permission == 'new') {
			error('component.permissions.edit.nameNewNotAllowed');
			return;
		}

		// Todo replace with ValidatedFormField
		if (newPermissionObject.groups.length === 0) {
			error('component.permissions.edit.groupsMustBeSpecified');
			return;
		}

		// TODO replace with ValidatedFormField
		if (newPermissionObject.scopes.length === 0) {
			error('component.permissions.edit.scopesMustBeSpecified');
			return;
		}

		requestSent = true;

		void apiFetchResponse(
			`data-hub/tenants/${tenant}${project ? `/projects/${project}` : ''}/permissions/${permission}`,
			$accessToken,
			'PUT',
			{
				scopes: newPermissionObject.scopes,
				groups: newPermissionObject.groups.includes('all') ? [null] : newPermissionObject.groups
			}
		)
			.then(async () => {
				success('shared.message.savedSuccessfully');
				await goto(`.`);
			})
			.finally(() => {
				requestSent = false;
			});
	}

	$: {
		// remove other selected options if contains 'all'
		if (newPermissionObject.groups.includes('all') && newPermissionObject.groups.length > 1) {
			warning(
				'component.permissions.edit.otherOptionsThenAllUnselectedWarningMessage',
				'component.permissions.edit.otherOptionsThenAllUnselectedWarningMessageDetails'
			);
			newPermissionObject.groups = ['all'];
		}
	}
</script>

<form
	novalidate
	on:submit|preventDefault={(event) => handleSubmit(event, createOrUpdatePermission)}
	class="needs-validation"
>
	<div class="flex flex-col gap-2">
		<ValidatedFormField
			bind:value={permission}
			required
			pattern={API_NAME_REGEX}
			patternMismatchText={$_('shared.keycloakAPI.resourceNameInvalid')}
			inputLabel={$_('component.permissions.name')}
			inputId="name"
			disabled={!isNew}
		/>

		<Label for="groups">{$_('component.permissions.groups')}</Label>
		<!-- TODO enable required after refactor to ValidatedFormField -->
		<MultiSelect
			id="groups"
			items={[{ value: 'all', name: 'Alle' }].concat(mapForSelect(selectableGroups))}
			bind:value={newPermissionObject.groups}
			size="lg"
		/>

		<Label for="scopes">{$_('component.permissions.scopes')}</Label>
		<!-- TODO enable required after refactor to ValidatedFormField -->
		<MultiSelect
			id="scopes"
			items={mapForSelect(selectableScopes)}
			bind:value={newPermissionObject.scopes}
			size="lg"
		/>

		<Button type="submit" disabled={requestSent}>
			<div class="flex flex-row gap-2">
				{$_(isNew ? 'shared.action.create' : 'shared.action.save')}
				{#if requestSent}
					<Spinner size={4} />
				{/if}
			</div>
		</Button>
	</div>
</form>
