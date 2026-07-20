<script lang="ts">
	import {
		Alert,
		Button,
		Card,
		Heading,
		Modal,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { API_NAME_REGEX } from './nav/fetchUtils';
	import ValidatedFormField from './ValidatedFormField.svelte';
	import { _ } from 'svelte-i18n';
	import DeleteButton from './common/modals/DeleteButton.svelte';
	import InfoIcon from '~icons/heroicons/information-circle';
	import { getResourceApiClient, hasPermission, performMutation } from './common/graphql/utils';
	import { queryStore } from '@urql/svelte';
	import {
		CREATE_OWM_COLLECTOR,
		DELETE_OWM_COLLECTOR,
		GET_OWM_COLLECTORS_FROM_PROJECT
	} from './common/graphql/queries-resource-api';
	import type {
		GetOwmCollectorsFromProjectQuery,
		GetOwmCollectorsFromProjectQueryVariables,
		CreateCollectorMutation,
		CreateCollectorMutationVariables,
		DeleteCollectorMutation,
		DeleteCollectorMutationVariables,
		GetScopesQuery
	} from './common/generated/types-resource-api';
	import { error, success } from './common/toast/toast';

	interface Props {
		tenantObject: GetScopesQuery['tenant'] | undefined;
		tenant: string;
		project: string;
	}
	let { tenant, project, tenantObject }: Props = $props();

	const client = getResourceApiClient();

	let owmCollectorInput = $state({
		name: '',
		token: '',
		longitude: '',
		latitude: '',
		interval: 60
	});

	let owmCollectorModalOpen = $state(false);
	const owmCollectorsStore = $derived(
		queryStore<GetOwmCollectorsFromProjectQuery, GetOwmCollectorsFromProjectQueryVariables>({
			client,
			query: GET_OWM_COLLECTORS_FROM_PROJECT,
			variables: { tenant, project }
		})
	);

	let hasAdminOnProject = $derived(
		hasPermission(tenantObject, 'owm-collector:admin', 'project', project)
	);

	const owmCollectors = $derived($owmCollectorsStore.data?.project?.owmCollectors);

	async function createOwmCollector() {
		if (Object.values(owmCollectorInput).every((value) => value !== undefined)) {
			performMutation<CreateCollectorMutation, CreateCollectorMutationVariables>(
				client,
				CREATE_OWM_COLLECTOR,
				{
					tenant: tenant,
					project: project,
					collectorName: owmCollectorInput.name,
					collectorConfig: {
						token: owmCollectorInput.token,
						latitude: parseFloat(owmCollectorInput.latitude),
						longitude: parseFloat(owmCollectorInput.longitude),
						interval: owmCollectorInput.interval
					}
				}
			)
				.then((result) => {
					if (result.error?.graphQLErrors.length ?? 0 > 0) {
						error($_('shared.message.errorSaving'));
						return;
					}
					owmCollectorsStore.reexecute({ requestPolicy: 'network-only' });
					success($_('shared.message.savedSuccessfully'));
				})
				.catch(() => {
					error($_('shared.message.errorSaving'));
					return;
				});
		}
		// Reset Input
		owmCollectorInput = {
			name: '',
			token: '',
			latitude: '',
			longitude: '',
			interval: 60
		};
		owmCollectorModalOpen = false;
	}
	async function deleteOwmCollector(collectorName: string) {
		performMutation<DeleteCollectorMutation, DeleteCollectorMutationVariables>(
			client,
			DELETE_OWM_COLLECTOR,
			{
				tenant: tenant,
				project: project,
				collectorName: collectorName
			}
		)
			.then((result) => {
				if (result.error?.graphQLErrors.length ?? 0 > 0) {
					error($_('shared.message.errorDeleting'));
					return;
				}
				owmCollectorsStore.reexecute({ requestPolicy: 'network-only' });
				success($_('shared.message.deletedSuccessfully'));
			})
			.catch(() => {
				error($_('shared.message.errorDeleting'));
				return;
			});
		owmCollectorModalOpen = false;
	}
</script>

<Card class="max-w-full">
	<div class="flex flex-row items-center justify-between">
		<Heading tag="h4" class="text-center"
			>{$_('page.projectOverview.owmCollectors')}: {$_(
				'page.projectOverview.currentWeatherApi'
			)}</Heading
		>
		<Button
			class="shrink-0"
			color="green"
			title={!hasAdminOnProject ? $_('component.permissions.missingPermissions') : ''}
			disabled={!hasAdminOnProject}
			onclick={() => (owmCollectorModalOpen = true)}
		>
			{$_('page.projectsList.newOWMCollectorButton')}
		</Button>
	</div>
	<Alert class="my-4" color="orange">
		<InfoIcon slot="icon" class="h-5 w-5" />
		{$_('page.projectOverview.betaFeatureNotice')}
	</Alert>
	<div class="max-h-100 overflow-y-scroll">
		<Table>
			<TableHead class="sticky">
				<TableHeadCell>{$_('page.projectOverview.owmCollectorModal.name')}</TableHeadCell>
				<TableHeadCell>{$_('page.projectOverview.owmCollectorModal.longitude')}</TableHeadCell>
				<TableHeadCell>{$_('page.projectOverview.owmCollectorModal.latitude')}</TableHeadCell>
				<TableHeadCell>{$_('page.projectOverview.owmCollectorModal.interval')}</TableHeadCell>
				<TableHeadCell>{$_('page.projectOverview.owmCollectorModal.action')}</TableHeadCell>
			</TableHead>
			<TableBody>
				{#if owmCollectors && owmCollectors.length > 0}
					{#each owmCollectors as collector (collector)}
						<TableBodyRow>
							<TableBodyCell>{collector.collectorName}</TableBodyCell>
							<TableBodyCell>{collector.longitude}</TableBodyCell>
							<TableBodyCell>{collector.latitude}</TableBodyCell>
							<TableBodyCell>{collector.interval}</TableBodyCell>
							<TableBodyCell>
								<DeleteButton
									buttonTitle={!hasAdminOnProject
										? $_('component.permissions.missingPermissions')
										: 'shared.action.delete'}
									buttonText="shared.action.delete"
									disabled={!hasAdminOnProject}
									modalTitle="page.projectOverview.deleteModalCollector.title"
									modalBody="page.projectOverview.deleteModalCollector.body"
									submitFunction={() => deleteOwmCollector(collector.collectorName)}
								/>
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				{:else}
					<TableBodyRow>
						<TableBodyCell
							>{$_('page.projectOverview.owmCollectorModal.noCollectors')}</TableBodyCell
						>
						<TableBodyCell />
						<TableBodyCell />
						<TableBodyCell />
						<TableBodyCell />
					</TableBodyRow>
				{/if}
			</TableBody>
		</Table>
	</div>
</Card>

<Modal bind:open={owmCollectorModalOpen} title={$_('page.projectOverview.owmCollectorModal.title')}>
	<form class="flex flex-col gap-4" onsubmit={createOwmCollector}>
		<ValidatedFormField
			inputId="newCollectorName"
			inputLabel={$_('page.projectOverview.owmCollectorModal.name')}
			pattern={API_NAME_REGEX}
			patternMismatchText={$_('shared.keycloakAPI.resourceNameInvalid')}
			type="text"
			bind:value={owmCollectorInput.name}
		/>
		<ValidatedFormField
			inputId="newCollectorToken"
			inputLabel={$_('page.projectOverview.owmCollectorModal.token')}
			type="text"
			bind:value={owmCollectorInput.token}
		/>
		<Alert color="orange">
			<InfoIcon slot="icon" class="h-5 w-5" />
			{$_('page.projectOverview.owmCollectorModal.tokenNotice')}
		</Alert>
		<ValidatedFormField
			inputId="newCollectorLatitude"
			inputLabel={$_('page.projectOverview.owmCollectorModal.latitude')}
			bind:value={owmCollectorInput.latitude}
		/>
		<ValidatedFormField
			inputId="newCollectorLongitude"
			inputLabel={$_('page.projectOverview.owmCollectorModal.longitude')}
			bind:value={owmCollectorInput.longitude}
		/>
		<ValidatedFormField
			inputId="newCollectorInterval"
			inputLabel={$_('page.projectOverview.owmCollectorModal.interval')}
			type="number"
			bind:value={owmCollectorInput.interval}
		/>
		<Button type="submit">{$_('page.projectOverview.owmCollectorModal.buttonCreate')}</Button>
	</form>
</Modal>
