<script lang="ts">
	import { Card, Alert, Badge, P } from 'flowbite-svelte';
	import InfoIcon from '~icons/heroicons/information-circle';
	import { _ } from 'svelte-i18n';
	interface Props {
		scopes: string[];
	}
	let { scopes }: Props = $props();
</script>

{#if scopes.length > 0}
	<Card class="min-w-full">
		<Alert color="blue" class="inline-flex gap-2">
			<InfoIcon class="h-5 w-5" />
			<p>{$_('page.tenantsList.scopesOnThisResource')}</p>
		</Alert>
		<div class="mt-4 flex flex-wrap gap-4">
			{#each scopes as scope (scope)}
				<Badge
					color="primary"
					class="border-primary-300 dark:border-primary-600 border text-nowrap sm:w-full sm:max-w-full xl:w-30/100 xl:max-w-1/2"
				>
					{scope}
				</Badge>
			{/each}
		</div>
	</Card>
{:else}
	<P>{$_('page.tenantsList.noScopesOnThisResource')}</P>
{/if}
