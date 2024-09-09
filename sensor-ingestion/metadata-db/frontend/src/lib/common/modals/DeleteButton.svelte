<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Modal, Button, P } from 'flowbite-svelte';
	import TrashIcon from '~icons/heroicons/trash';

	export let buttonText: string | undefined = undefined;
	export let buttonTitle: string;
	export let disabled = false;
	export let modalTitle: string;
	export let modalBody: string;
	export let action = 'delete';
	export let color:
		| 'red'
		| 'yellow'
		| 'green'
		| 'purple'
		| 'blue'
		| 'light'
		| 'dark'
		| 'primary'
		| 'none'
		| 'alternative'
		| undefined = 'red';

	export let additionalClasses: string | null = null;
	export let isIcon = false;

	export let submitFunction: () => void;

	let modalOpen = false;
</script>

<Button
	title={$_(buttonTitle)}
	{disabled}
	on:click={() => (modalOpen = true)}
	class={`${additionalClasses ? additionalClasses : ''} !p-2`}
	{color}
	size="lg"
>
	{#if isIcon}
		<span class="sr-only">
			{buttonText ? $_(buttonText) : $_(buttonTitle)}
		</span>
		{#if ['delete'].includes(action)}
			<TrashIcon class="h-5 w-5" />
		{/if}
	{:else}
		{buttonText ? $_(buttonText) : $_(buttonTitle)}
	{/if}
</Button>
<Modal title={$_(modalTitle)} bind:open={modalOpen} autoclose>
	<P>{$_(modalBody)}</P>
	<svelte:fragment slot="footer">
		<Button
			color="red"
			on:click={() => {
				submitFunction();
			}}
		>
			{$_('shared.action.continue')}
		</Button>
		<Button
			color="alternative"
			on:click={() => {
				modalOpen = false;
			}}
		>
			{$_('shared.action.abort')}
		</Button>
	</svelte:fragment>
</Modal>
