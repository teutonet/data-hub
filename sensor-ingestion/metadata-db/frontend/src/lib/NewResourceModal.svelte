<script lang="ts">
	import { API_NAME_REGEX, type ResourceType } from './nav/fetchUtils';
	import { Button, Modal, P, Spinner } from 'flowbite-svelte';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { _ } from 'svelte-i18n';
	import { error } from './common/toast/toast';
	import type { Client as GraphQLClient } from '@urql/svelte';
	import { createResource } from './common/graphql/ressource-api-utils';
	import { refreshAccessToken } from './common/auth/Auth.svelte';

	interface Props {
		gqlClient: GraphQLClient;
		resource: ResourceType;
		createModalOpen: true | false;
		createFunction: (tenantCreated: boolean) => void;
	}

	let {
		gqlClient,
		resource = $bindable(),
		createModalOpen = $bindable(),
		createFunction
	}: Props = $props();

	$effect(() => {
		resource.resourceName = resource.displayName
			.toLowerCase()
			.replaceAll('ä', 'ae')
			.replaceAll('ö', 'oe')
			.replaceAll('ü', 'ue')
			.replaceAll(/[^a-z0-9- ]+/g, '')
			.replaceAll(/[ -]+/g, '-')
			.replaceAll(/^-/g, '')
			.replaceAll(/-$/g, '')
			.substring(0, 36);
	});
	let requestSent = $state(false);

	let labels: Record<
		ResourceType['type'],
		{
			list: string;
			modalTitle: string;
			explanation: string;
			nameInputLabel: string;
			nameInput: string;
		}
	> = {
		tenant: {
			list: 'tenantsList',
			modalTitle: 'newTenantModalTitle',
			explanation: 'newTenantExplanation',
			nameInputLabel: 'newTenantNameInputLabel',
			nameInput: 'newTenantNameInput'
		},
		group: {
			list: 'groupsList',
			modalTitle: 'newGroupModalTitle',
			explanation: 'newGroupExplanation',
			nameInputLabel: 'newGroupNameInputLabel',
			nameInput: 'newGroupNameInput'
		},
		vizGroup: {
			list: 'viz-groupsList',
			modalTitle: 'newVizGroupModalTitle',
			explanation: 'newVizGroupExplanation',
			nameInputLabel: 'newVizGroupNameInputLabel',
			nameInput: 'newVizGroupNameInput'
		},
		project: {
			list: 'projectsList',
			modalTitle: 'newProjectModalTitle',
			explanation: 'newProjectExplanation',
			nameInputLabel: 'newProjectNameInputLabel',
			nameInput: 'newProjectNameInput'
		}
	};

	function onsubmit(event: Event) {
		event.preventDefault();
		const formElement = event.target as HTMLFormElement;
		if (!formElement.checkValidity()) {
			formElement.classList.add('was-validated');
		} else {
			formElement.classList.remove('was-validated');
			submitFunction();
		}
	}

	function submitFunction() {
		if (resource.resourceName.length < 1 || resource.resourceName.length > 36) {
			error($_('shared.keycloakAPI.resourceNameInvalid'));
			return;
		}

		requestSent = true;
		createResource(gqlClient, resource, refreshAccessToken).then(
			() => {
				requestSent = false;
				createModalOpen = false;
				createFunction(resource.type === 'tenant');
			},
			() => {
				requestSent = false;
			}
		);
	}
</script>

<Modal
	outsideclose
	bind:open={createModalOpen}
	title={$_(`page.${labels[resource.type]['list']}.${labels[resource.type]['modalTitle']}`)}
>
	<form novalidate {onsubmit} class="needs-validation">
		<div class="flex flex-col gap-4">
			<P>
				{$_(`page.${labels[resource.type]['list']}.${labels[resource.type]['explanation']}`)}
			</P>
			<ValidatedFormField
				bind:value={resource.displayName}
				required
				inputLabel={$_(
					`page.${labels[resource.type]['list']}.${labels[resource.type]['nameInputLabel']}`
				)}
				inputId={labels[resource.type]['nameInput']}
			/>
			<ValidatedFormField
				bind:value={resource.resourceName}
				inputId={$_('page.tenantsList.resourceURL')}
				inputLabel={`${$_('page.tenantsList.resourceURL')}: /api/tenants/${resource.type === 'tenant' ? '' : `${resource.tenant}/${resource.type}s/`}`}
				pattern={API_NAME_REGEX}
				patternMismatchText={$_('shared.keycloakAPI.resourceNameInvalid')}
			/>
			<Button type="submit" disabled={requestSent} color="green">
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
