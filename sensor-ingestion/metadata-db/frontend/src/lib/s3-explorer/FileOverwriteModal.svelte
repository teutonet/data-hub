<script lang="ts">
	import { Button, Modal, P, Spinner } from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import XMarkIcon from '~icons/heroicons/x-mark';
	import type { fileType } from './s3Utils';

	interface Props {
		isOpen: boolean;
		overwrites: fileType[];
		fileOverwriteFunction: () => Promise<void>;
	}

	let { isOpen = $bindable(), overwrites = $bindable(), fileOverwriteFunction }: Props = $props();

	let requestSent = $state(false);
</script>

<Modal outsideclose bind:open={isOpen} title={$_('page.s3-explorer.overwriteModal.title')}>
	<P>
		{$_('page.s3-explorer.overwriteModal.body')}
	</P>
	{#each overwrites as file (file)}
		<div class="flex flex-row">
			<P class="grow">
				{file.name}
			</P>
			<Button
				color="none"
				class="cursor-pointer p-0"
				on:click={() => {
					overwrites = overwrites.filter((f) => f.name !== file.name);
				}}
			>
				<XMarkIcon />
			</Button>
		</div>
	{/each}
	<Button
		disabled={requestSent}
		color="red"
		on:click={async () => {
			requestSent = true;
			await fileOverwriteFunction().then(() => (requestSent = false));
		}}
	>
		{$_('shared.action.continue')}
		{#if requestSent}
			<Spinner />
		{/if}
	</Button>
	<Button color="dark" on:click={() => (isOpen = false)}>
		{$_('shared.action.abort')}
	</Button>
</Modal>
