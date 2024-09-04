<script lang="ts">
	import { error, success } from '$lib/common/toast/toast';
	import { parse } from 'csv-parse/browser/esm/sync';
	import { Button, Fileupload, Heading, Li, List, Toggle } from 'flowbite-svelte';
	import type { PageData } from './$types';
	import { getContextClient, queryStore } from '@urql/svelte';
	import {
		type CreateThingsMutation,
		type GetSensorsQuery,
		type GetSensorsQueryVariables,
		type CreateThingsMutationVariables
	} from '$lib/common/generated/types';
	import { CREATE_THINGS, GET_SENSORS } from '$lib/common/graphql/queries';
	import { _ } from 'svelte-i18n';
	import { handleCombinedErrors } from '$lib/common/graphql/utils';
	import PageTitle from '$lib/PageTitle.svelte';
	import { emptyToNull } from '$lib/stringUtils';

	export let data: PageData;

	let defaultActivate = true;

	const client = getContextClient();

	$: projectId = data.projectId;

	$: sensorQuery = queryStore<GetSensorsQuery, GetSensorsQueryVariables>({
		client,
		query: GET_SENSORS,
		variables: {
			condition: {
				project: projectId
			}
		}
	});

	$: sensors = $sensorQuery.data?.sensors ?? [];

	interface ThingImport {
		thingName: string;
		sensortypeName: string;
		sensortypeId: string | undefined;
		appid: string;
		deveui: string;
		devid: string;
		lat: string;
		long: string;
		altitude: string;
	}

	interface RequiredProblem {
		kind: 'required';
		property: string;
		row: number;
	}

	interface SensortypeNotFoundProblem {
		kind: 'sensortypeNotFound';
		sensorType: string;
		row: number;
	}

	type Problem = RequiredProblem | SensortypeNotFoundProblem;

	let files: FileList | undefined;
	let thingsToImport: ThingImport[] | undefined = undefined;
	let problems: Problem[] | undefined = undefined;

	$: void checkUpload(files);

	async function checkUpload(files: FileList | undefined) {
		thingsToImport = undefined;
		problems = undefined;
		const file = files?.item(0);
		if (file) {
			if (file.size > 1024 * 1024 * 10) {
				error('component.thingsImport.importError.fileTooBig');
				return;
			}
			const buf = new TextDecoder().decode(await file.arrayBuffer());
			const parsed: string[][] = parse(buf, {
				bom: true,
				columns: false,
				delimiter: ';'
			});
			const expectedHeaders = [
				'Sensor Name',
				'Sensortyp Name',
				'deveui',
				'devid',
				'appid',
				'lat',
				'long',
				'altitude'
			];
			if (!expectedHeaders.every((expected, index) => expected === parsed[0][index])) {
				error('component.thingsImport.importError.wrongHeaders');
				return;
			}
			const newThings: ThingImport[] = parsed.slice(1).map((row) => ({
				thingName: row[0],
				sensortypeName: row[1],
				sensortypeId: undefined,
				deveui: row[2],
				devid: row[3],
				appid: row[4],
				lat: row[5],
				long: row[6],
				altitude: row[7]
			}));
			// find problems
			// these are the first 3 columns, so that directly mapping them to "expectedHeaders" works
			const required = ['thingName', 'sensortypeName', 'deveui'];
			let foundProblems: Problem[] = [];
			newThings.forEach((thing, index) => {
				required.forEach((req, reqIndex) => {
					if (!thing[req]) {
						foundProblems.push({
							kind: 'required',
							row: index + 2,
							property: expectedHeaders[reqIndex]
						});
					}
				});
				const foundSensor = sensors.find((sensor) => sensor.name === thing.sensortypeName);
				if (!foundSensor) {
					foundProblems.push({
						kind: 'sensortypeNotFound',
						row: index + 2,
						sensorType: thing.sensortypeName
					});
				} else {
					thing.sensortypeId = foundSensor.id;
				}
			});
			if (foundProblems.length === 0) {
				thingsToImport = newThings;
			} else {
				problems = foundProblems;
			}
		}
	}

	async function doImport() {
		if (thingsToImport) {
			const result = await client.mutation<CreateThingsMutation, CreateThingsMutationVariables>(
				CREATE_THINGS,
				{
					mnThing: thingsToImport.map((thing) => ({
						deveui: thing.deveui,
						name: thing.thingName,
						project: projectId,
						sensorId: thing.sensortypeId!,
						status: defaultActivate ? 'activated' : 'created',
						altitude: emptyToNull(thing.altitude),
						appid: emptyToNull(thing.appid),
						devid: emptyToNull(thing.devid),
						lat: emptyToNull(thing.lat),
						long: emptyToNull(thing.long)
					}))
				}
			);
			if (result.error) {
				if (
					result.error.graphQLErrors.some((e) =>
						e.message.includes('unique_thing_name_per_project')
					)
				) {
					error('component.thingsImport.failure', 'component.thingsImport.nameDuplicate');
				} else {
					handleCombinedErrors(result.error, { showToasts: true });
				}
			} else {
				success(`component.thingsImport.success`, 'component.thingsImport.successDetail', {
					count: thingsToImport.length
				});
			}
		}
	}
</script>

<PageTitle title={$_('component.thingsImport.title')} />

<div>
	<Button size="sm" href="/thingsimport.csv" download="thingsimport.csv">
		{$_('component.thingsImport.downloadTemplate')}
	</Button>
</div>
<div>
	<Fileupload inputClass="border !p-0 dark:text-gray-400 w-auto" bind:files multiple={false} />
</div>
<div>
	<Toggle bind:checked={defaultActivate}>{$_('component.thingsImport.defaultActivate')}</Toggle>
</div>
{#if thingsToImport}
	<div>
		<Button size="sm" on:click={doImport}>{$_('component.thingsImport.importToDatabase')}</Button>
	</div>
{/if}
{#if problems}
	<Heading tag="h2">{$_('component.thingsImport.problems')}</Heading>
	<List>
		{#each problems as problem}
			<Li>
				{#if problem.kind === 'required'}
					{$_('component.thingsImport.importError.required', {
						values: { row: problem.row, property: problem.property }
					})}
				{:else if problem.kind === 'sensortypeNotFound'}
					{$_('component.thingsImport.importError.sensortypeNotFound', {
						values: { row: problem.row, sensorType: problem.sensorType }
					})}
				{/if}
			</Li>
		{/each}
	</List>
{/if}
