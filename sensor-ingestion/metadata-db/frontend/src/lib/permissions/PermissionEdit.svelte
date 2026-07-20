<script lang="ts">
	import {
		API_NAME_REGEX,
		handleSubmit,
		type ResourceType,
		type UdhPrincipal
	} from '$lib/nav/fetchUtils';
	import { Button, Label, MultiSelect, Spinner } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import { error, warning } from '$lib/common/toast/toast';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { onMount } from 'svelte';
	import {
		createGroupPermission,
		createProjectPermission,
		createTenantPermission,
		createVizGroupPermission
	} from '$lib/common/graphql/ressource-api-utils';
	import { getResourceApiClient } from '$lib/common/graphql/utils';

	interface Props {
		resource: ResourceType;
		permission: string;
		isNew: boolean;
		permissionObject: { principals: UdhPrincipal[]; scopes: string[] };
		selectableGroups: string[];
		selectableVizGroups: string[];
		selectableScopes: string[];
	}

	let {
		resource,
		permission = $bindable(),
		isNew,
		permissionObject,
		selectableGroups,
		selectableVizGroups,
		selectableScopes
	}: Props = $props();

	const gqlClient = getResourceApiClient();

	let newPermissionObject: { groups: string[]; scopes: string[]; vizGroups: string[] } = $state({
		groups: [],
		scopes: [],
		vizGroups: []
	});

	onMount(() => {
		if (isNew) {
			permission = '';
		}

		newPermissionObject = {
			// replace incoming null with '*' option
			groups: permissionObject.principals.some((principal) => principal.type == 'tenant')
				? ['*']
				: permissionObject.principals
						.map((principal) => (principal.type === 'group' ? principal.group : ''))
						.filter((group) => group !== ''),
			vizGroups: permissionObject.principals
				.map((principal) => (principal.type === 'vizGroup' ? principal.vizGroup : ''))
				.filter((vizGroup) => vizGroup !== ''),
			scopes: permissionObject.scopes.slice()
		};
	});

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
		if (
			(newPermissionObject.groups.length === 0 && !(newPermissionObject.vizGroups.length > 0)) ||
			(newPermissionObject.vizGroups.length === 0 && !(newPermissionObject.groups.length > 0))
		) {
			error('component.permissions.edit.groupsMustBeSpecified');
			return;
		}

		// TODO replace with ValidatedFormField
		if (newPermissionObject.scopes.length === 0) {
			error('component.permissions.edit.scopesMustBeSpecified');
			return;
		}

		requestSent = true;

		const groupPrincipals = newPermissionObject.groups.includes('*')
			? []
			: newPermissionObject.groups.map((group) => ({
					tenant: resource.tenant,
					group: group
				}));

		const vizGroupPrincipals = newPermissionObject.vizGroups.map((vizGroup) => ({
			tenant: resource.tenant,
			vizGroup: vizGroup
		}));

		const tenantPrincipal = newPermissionObject.groups.includes('*')
			? [{ tenant: resource.tenant }]
			: null;

		const permissionInputObject = {
			name: permission,
			scopes: newPermissionObject.scopes,
			tenantPrincipals: tenantPrincipal,
			groupPrincipals: groupPrincipals,
			vizGroupPrincipals: vizGroupPrincipals
		};

		switch (resource.type) {
			case 'tenant':
				createTenantPermission(gqlClient, resource.tenant, permissionInputObject).finally(() => {
					requestSent = false;
				});
				break;
			case 'group':
				createGroupPermission(
					gqlClient,
					resource.tenant,
					resource.resourceName,
					permissionInputObject
				).finally(() => {
					requestSent = false;
				});
				break;
			case 'vizGroup':
				createVizGroupPermission(
					gqlClient,
					resource.tenant,
					resource.resourceName,
					permissionInputObject
				).finally(() => {
					requestSent = false;
				});
				break;
			case 'project':
				createProjectPermission(
					gqlClient,
					resource.tenant,
					resource.resourceName,
					permissionInputObject
				).finally(() => {
					requestSent = false;
				});
				break;
		}
	}

	$effect(() => {
		// remove other selected options if contains '*'
		if (newPermissionObject.groups.includes('*') && newPermissionObject.groups.length > 1) {
			warning(
				'component.permissions.edit.otherOptionsThenAllUnselectedWarningMessage',
				'component.permissions.edit.otherOptionsThenAllUnselectedWarningMessageDetails'
			);
			newPermissionObject.groups = ['*'];
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
			items={[{ value: '*', name: 'Alle' }].concat(mapForSelect(selectableGroups))}
			bind:value={newPermissionObject.groups}
			size="lg"
		/>

		{#if selectableVizGroups.length > 0}
			<Label for="vizGroups">{$_('component.permissions.vizGroups')}</Label>
			<!-- TODO enable required after refactor to ValidatedFormField -->
			<MultiSelect
				id="vizGroups"
				items={mapForSelect(selectableVizGroups)}
				bind:value={newPermissionObject.vizGroups}
				size="lg"
			/>
		{/if}

		<Label for="scopes">{$_('component.permissions.scopes')}</Label>
		<!-- TODO enable required after refactor to ValidatedFormField -->
		<MultiSelect
			id="scopes"
			items={mapForSelect(selectableScopes)}
			bind:value={newPermissionObject.scopes}
			size="lg"
		/>

		<Button type="submit" disabled={requestSent} color="green">
			<div class="flex flex-row gap-2">
				{$_(isNew ? 'shared.action.create' : 'shared.action.save')}
				{#if requestSent}
					<Spinner size={4} />
				{/if}
			</div>
		</Button>
	</div>
</form>
