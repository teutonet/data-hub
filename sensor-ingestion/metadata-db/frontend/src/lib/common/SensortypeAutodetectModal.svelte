<script lang="ts">
	import {
		Button,
		Checkbox,
		Modal,
		P,
		Spinner,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Tooltip
	} from 'flowbite-svelte';
	import type {
		AssignSensortypeToNewDevicesMutation,
		AssignSensortypeToNewDevicesMutationVariables,
		Exact,
		GetThingsQuery,
		GetThingsQueryVariables,
		Sensor,
		ThingCondition
	} from '$lib/common/generated/types';
	import { getContextClient, type OperationResult } from '@urql/svelte';
	import { ASSIGN_SENSORTYPE_TO_NEW_DEVICES, GET_THINGS } from '$lib/common/graphql/queries';
	import { _ } from 'svelte-i18n';
	import {
		getThingMatches,
		type SensorShape,
		type SensortypeAutodetectionMatch
	} from '$lib/sensorAutodetectUtils';
	import { info, success, error } from '$lib/common/toast/toast';
	import { handleCombinedErrors, performMutation } from './graphql/utils';

	export let sensortype: Sensor;
	export let project: string;

	let modalOpen = false;

	const client = getContextClient();

	let thingsPromise:
		| Promise<OperationResult<GetThingsQuery, Exact<{ condition: ThingCondition }>>>
		| undefined = undefined;

	let sensorShape: SensorShape;

	let thingMatches: SensortypeAutodetectionMatch[] | undefined = undefined;

	$: sensorShape = {
		id: sensortype.id,
		name: sensortype.name,
		properties: sensortype.sensorProperties.map((prop) => ({
			// if the property is null, something is broken
			name: prop.alias || prop.property?.name || '',
			metricName: prop.property?.metricName,
			measure: prop.property?.measure
		}))
	};

	async function getThingsAndAttemptAutodetection() {
		thingsPromise = client
			.query<GetThingsQuery, GetThingsQueryVariables>(GET_THINGS, {
				condition: {
					status: 'created',
					sensorId: null,
					project
				}
			})
			.toPromise();

		await thingsPromise.then((result) => {
			const things = result.data?.things;

			if (!things) {
				return [];
			}

			const matches: SensortypeAutodetectionMatch[] = getThingMatches(sensorShape, result).sort(
				(a, b) => a.missingKeys.length - b.missingKeys.length
			);

			thingMatches = matches;

			if (thingMatches.length) {
				modalOpen = true;
			} else {
				info($_('sensorTypeAutodetect.noThings'));
				thingsPromise = undefined;
				thingMatches = undefined;
			}
		});
	}

	async function assignSensorTypes() {
		await performMutation<
			AssignSensortypeToNewDevicesMutation,
			AssignSensortypeToNewDevicesMutationVariables
		>(
			client,
			ASSIGN_SENSORTYPE_TO_NEW_DEVICES,
			{
				sensortypeId: sensortype.id,
				deviceIds: group
			},
			{
				additionalTypenames: ['Thing']
			}
		)
			.then((result) => {
				if (result.error) {
					handleCombinedErrors(result.error, { showToasts: false });
				} else {
					success(
						$_('shared.message.savedSuccessfully'),
						$_('sensorTypeAutodetect.sensorTypesSaved', {
							values: {
								number: group.length ?? 0
							}
						})
					);
				}
			})
			.catch((err) => {
				error($_('shared.message.errorSaving'));
				console.error(err);
			})
			.finally(() => {
				modalOpen = false;
				group = [];
				thingMatches = undefined;
				thingsPromise = undefined;
			});
	}

	let group: string[] = [];

	function toggleAllSelected() {
		if (allSelected) {
			allSelected = false;
			group = [];
		} else {
			allSelected = true;
			group = thingMatches?.map((match) => match.id) ?? [];
		}
	}

	let allSelected = false;
</script>

<Button on:click={() => getThingsAndAttemptAutodetection()} disabled={!!thingsPromise}>
	{$_('sensorTypeAutodetect.buttonText')}
	{#if thingsPromise}
		{#await thingsPromise}
			<Spinner />
		{/await}
	{/if}
</Button>

<Modal
	size="xl"
	bind:open={modalOpen}
	dismissable={false}
	title={$_('sensorTypeAutodetect.modalTitle')}
>
	<P>
		{$_('sensorTypeAutodetect.modalExplanation', { values: { sensorTypeName: sensortype.name } })}
	</P>
	{#if thingMatches?.length}
		<Table>
			<TableHead>
				<TableHeadCell>
					<Checkbox
						on:click={() => toggleAllSelected()}
						bind:checked={allSelected}
						disabled={!thingMatches.length}
						name={$_('sensorTypeAutodetect.toggleAllCheckboxName')}
					/>
					<Tooltip class="normal-case">
						{$_('sensorTypeAutodetect.toggleAllCheckboxName')}
					</Tooltip>
				</TableHeadCell>
				<TableHeadCell>
					{$_('sensorTypeAutodetect.nameHead')}
				</TableHeadCell>
				<TableHeadCell>
					{$_('sensorTypeAutodetect.appeuiHead')}
				</TableHeadCell>
				<TableHeadCell>
					{$_('sensorTypeAutodetect.labelsHead')}
				</TableHeadCell>
				<TableHeadCell>
					{$_('sensorTypeAutodetect.metricsHead')}
				</TableHeadCell>
				<TableHeadCell>
					{$_('sensorTypeAutodetect.unusedKeysHead')}
				</TableHeadCell>
				<TableHeadCell>
					{$_('sensorTypeAutodetect.missingKeysHead')}
				</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each thingMatches as match}
					<TableBodyRow>
						<TableBodyCell>
							<Checkbox
								bind:group
								value={match.id}
								name={$_('sensorTypeAutodetect.matchCheckboxName', {
									values: { name: match.name }
								})}
							/>
							<Tooltip>
								{$_('sensorTypeAutodetect.matchCheckboxName', { values: { name: match.name } })}
							</Tooltip>
						</TableBodyCell>
						<TableBodyCell>
							{match.name}
						</TableBodyCell>
						<TableBodyCell>
							{match.deveui ?? '-'}
						</TableBodyCell>
						<TableBodyCell>
							{#each Object.entries(match.labels) as [labelKey, labelValue]}
								<P>
									{labelKey}: {labelValue}
								</P>
							{:else}
								-
							{/each}
						</TableBodyCell>
						<TableBodyCell>
							{#each Object.entries(match.metrics) as [metricsKey, metricsValue]}
								<P>
									{metricsKey}: {metricsValue}
								</P>
							{:else}
								-
							{/each}
						</TableBodyCell>
						<TableBodyCell>
							{#each match.unusedKeys as unusedKey}
								<P>
									{unusedKey}
								</P>
							{:else}
								-
							{/each}
						</TableBodyCell>
						<TableBodyCell>
							{#each match.missingKeys as missingKey}
								<P>
									{missingKey}
								</P>
							{:else}
								-
							{/each}
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
	<svelte:fragment slot="footer">
		<Button
			color="alternative"
			on:click={() => {
				modalOpen = false;
				thingsPromise = undefined;
				thingMatches = undefined;
			}}
		>
			{$_('shared.action.abort')}
		</Button>
		<Button on:click={() => assignSensorTypes()} disabled={!group.length}>
			{$_('shared.action.save')}
		</Button>
	</svelte:fragment>
</Modal>
