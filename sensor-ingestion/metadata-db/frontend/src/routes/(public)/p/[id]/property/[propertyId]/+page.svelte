<script lang="ts">
	import { getContextClient, queryStore } from '@urql/svelte';
	import { Card, CardPlaceholder, Heading, P } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import PropertyEdit from '$lib/PropertyEdit.svelte';
	import type {
		DeletePropertyMutation,
		DeletePropertyMutationVariables,
		GetPropertyByIdQuery,
		GetPropertyByIdQueryVariables,
		PropertyPatch,
		UpdatePropertyByIdMutation,
		UpdatePropertyByIdMutationVariables
	} from '$lib/common/generated/types';
	import type { PageData } from './$types';
	import {
		DELETE_PROPERTY,
		GET_PROPERTY_BY_ID,
		UPDATE_PROPERTY_BY_ID
	} from '$lib/common/graphql/queries';
	import { handleCombinedErrors, performMutation } from '$lib/common/graphql/utils';
	import { success } from '$lib/common/toast/toast';
	import { projectAccess } from '$lib/common/auth';
	import { goto } from '$app/navigation';

	export let data: PageData;

	$: propertyId = data.propertyId;
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

	$: propertyStore = queryStore<GetPropertyByIdQuery, GetPropertyByIdQueryVariables>({
		client,
		query: GET_PROPERTY_BY_ID,
		variables: {
			id: propertyId
		},
		pause: !propertyId
	});

	$: property = $propertyStore.data?.property;

	const client = getContextClient();

	async function deleteFunction() {
		const result = await performMutation<DeletePropertyMutation, DeletePropertyMutationVariables>(
			client,
			DELETE_PROPERTY,
			{
				id: propertyId
			},
			{
				additionalTypenames: ['Property']
			}
		);
		if (result.error) {
			handleCombinedErrors(result.error, { showToasts: true });
		} else {
			success('shared.message.savedSuccessfully');
			await goto('../properties');
		}
	}

	async function submitFunction() {
		const propertyPatch: PropertyPatch = {
			project: projectId ?? undefined,
			name: property?.name ?? undefined,
			measure: property?.measure ?? undefined,
			metricName: property?.metricName ?? undefined,
			description: property?.description ?? undefined
		};

		await performMutation<UpdatePropertyByIdMutation, UpdatePropertyByIdMutationVariables>(
			client,
			UPDATE_PROPERTY_BY_ID,
			{
				id: propertyId,
				propertyPatch
			},
			{
				additionalTypenames: ['Property']
			}
		).then((result) => {
			if (result.error) {
				handleCombinedErrors(result.error, { showToasts: true });
			} else {
				success('shared.message.savedSuccessfully');
			}
		});
	}
</script>

<svelte:head>
	<title>{$_('page.propertyPage.title', { values: { name: property?.name } })}</title>
</svelte:head>

{#if !$propertyStore.fetching && property}
	<Heading tag="h2" class="pb-4">
		{$_('page.propertyPage.title', { values: { name: property.name } })}
	</Heading>
	<Card class="max-w-full">
		<P>
			{$_('page.propertyPage.editInfo')}
		</P>
		<PropertyEdit
			{projectId}
			{projects}
			id="property-edit"
			bind:property
			{submitFunction}
			{deleteFunction}
		/>
	</Card>
{:else}
	<CardPlaceholder />
{/if}
