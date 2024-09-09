<script lang="ts">
	import { goto } from '$app/navigation';
	import PropertyEdit from '$lib/PropertyEdit.svelte';
	import type {
		CreatePropertyMutation,
		CreatePropertyMutationVariables,
		PropertyInput
	} from '$lib/common/generated/types';
	import { CREATE_PROPERTY } from '$lib/common/graphql/queries';
	import { handleCombinedErrors, performMutation } from '$lib/common/graphql/utils';
	import { success } from '$lib/common/toast/toast';
	import { getContextClient } from '@urql/svelte';
	import { Card, Heading } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import { projectAccess } from '$lib/common/auth';
	import type { PageData } from './$types';

	export let data: PageData;

	const client = getContextClient();

	$: projectId = data.projectId === 'all' ? undefined : data.projectId;

	$: rawProjects =
		data.projectId === 'all'
			? $projectAccess.map((project) => {
					return { name: project, value: project };
				})
			: undefined;

	$: projects = rawProjects?.length
		? [{ name: $_('component.nav.allProjects'), value: 'all' }, ...rawProjects]
		: undefined;

	let property: PropertyInput;

	$: property = {
		name: '',
		description: '',
		metricName: '',
		measure: '',
		project: projectId ?? ''
	};

	async function submitFunction() {
		await performMutation<CreatePropertyMutation, CreatePropertyMutationVariables>(
			client,
			CREATE_PROPERTY,
			{
				propertyInput: property
			},
			{
				additionalTypenames: ['Property']
			}
		)
			.then(async (result) => {
				if (result.error) {
					handleCombinedErrors(result.error, { showToasts: true });
				} else {
					success('shared.message.savedSuccessfully');
					await goto('../properties');
				}
			})
			.catch((e) => {
				handleCombinedErrors(e, { showToasts: true });
			});
	}
</script>

<svelte:head>
	<title>{$_('page.newProperty.title')}</title>
</svelte:head>

<Heading tag="h2" class="pb-4">
	{$_('page.newProperty.title')}
</Heading>

<Card class="max-w-full">
	<PropertyEdit {projectId} {projects} create bind:property id="property-edit" {submitFunction} />
</Card>
