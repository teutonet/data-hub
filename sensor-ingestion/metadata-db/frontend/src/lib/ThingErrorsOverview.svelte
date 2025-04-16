<script lang="ts">
	import { P, Card } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import type { GetThingsLatestErrorsQuery } from './common/generated/types';
	import { formatDatetime } from './nav/dateUtils';

	interface Props {
		things: NonNullable<GetThingsLatestErrorsQuery['things']>;
		project: string;
	}

	let { things, project }: Props = $props();
</script>

<Card class="max-w-full">
	<div class="mb-4 flex-col">
		<P class="text-xl font-bold">{$_('component.thingsError.modalTitle')}</P>
		<P class="italic">*{$_('component.thingsError.fixNotice')}</P>
	</div>
	{#if things.length === 0}
		<p class="m-4 pt-4 italic text-black dark:text-slate-300">
			{$_('component.thingsError.empty')}
		</p>
	{:else}
		<ul class="my-1 space-y-3">
			{#each things as thing (thing.id)}
				<li>
					<a
						href={project == undefined ? '../all/sensor/' + thing.id : './sensor/' + thing.id}
						class="flex items-center rounded-lg bg-red-600 p-3 text-base font-bold text-white hover:bg-red-200 hover:text-black hover:shadow-sm dark:bg-red-600 dark:hover:bg-red-200"
					>
						<span class="ms-3 flex w-8/12 justify-start whitespace-pre-line"
							>{project == 'all' ? `${thing.project} | ` : ''}{thing.name}</span
						>
						<span class="ms-3 flex w-full whitespace-pre-line font-normal">{thing.latestError}</span
						>
						<span class="ms-3 flex w-1/2 justify-end whitespace-pre-line"
							>{$formatDatetime(thing.errorTimestamp)}</span
						>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</Card>
