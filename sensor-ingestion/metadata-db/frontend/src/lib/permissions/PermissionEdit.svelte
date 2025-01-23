<script lang="ts">
	import {
		API_NAME_REGEX,
		apiFetchResponse,
		handleSubmit,
		toResourceUrl,
		type GroupResource,
		type ResourceType,
		type UdhPrincipal
	} from '$lib/nav/fetchUtils';
	import { accessToken } from '$lib/common/auth';
	import { Button, Label, MultiSelect, Spinner } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import { error, success, warning } from '$lib/common/toast/toast';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		resource: ResourceType;
		permission: string;
		isNew: boolean;
		permissionObject: { principals: UdhPrincipal[]; scopes: string[] };
		selectableGroups: string[];
		selectableScopes: string[];
	}

	let {
		resource,
		permission = $bindable(),
		isNew,
		permissionObject,
		selectableGroups,
		selectableScopes
	}: Props = $props();

	let newPermissionObject: { groups: string[]; scopes: string[] } = $state({
		// replace incoming null with 'all' option
		groups: permissionObject.principals.some((principal) => principal.type == 'tenant')
			? ['all']
			: permissionObject.principals.map((principal) => (principal as GroupResource).group),
		scopes: permissionObject.scopes
	});

	if (isNew) {
		permission = '';
	}

	let requestSent = $state(false);

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
			`${toResourceUrl(resource)}/permissions/${permission}`,
			$accessToken,
			'PUT',
			{
				scopes: newPermissionObject.scopes,
				principals: newPermissionObject.groups.includes('all')
					? [{ type: 'tenant', tenant: resource.tenant }]
					: newPermissionObject.groups.map((group) => ({
							type: 'group',
							tenant: resource.tenant,
							group: group
						}))
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

	$effect(() => {
		// remove other selected options if contains 'all'
		if (newPermissionObject.groups.includes('all') && newPermissionObject.groups.length > 1) {
			warning(
				'component.permissions.edit.otherOptionsThenAllUnselectedWarningMessage',
				'component.permissions.edit.otherOptionsThenAllUnselectedWarningMessageDetails'
			);
			newPermissionObject.groups = ['all'];
		}
	});
</script>

<form
	novalidate
	onsubmit={(event) => handleSubmit(event, createOrUpdatePermission)}
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
