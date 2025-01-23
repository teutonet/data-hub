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
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const client = getContextClient();

	let projectId = $derived(data.projectId);

	const initialInput = {
		name: '',
		description: '',
		metricName: '',
		measure: '',
		project: data.projectId ?? ''
	};

	$effect(() => {
		if (projectId === 'all') {
			goto('../properties').catch((e) => {
				console.error(e.message);
			});
		}
	});

	let property: PropertyInput = $state(initialInput);

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
	<PropertyEdit create bind:property id="property-edit" {submitFunction} />
</Card>
