<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Modal, Button, P } from 'flowbite-svelte';
	import TrashIcon from '~icons/heroicons/trash';

	interface Props {
		buttonText?: string | undefined;
		buttonTitle: string;
		disabled?: boolean;
		modalTitle: string;
		modalBody: string;
		action?: string;
		color?:
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
			| undefined;
		additionalClasses?: string | null;
		isIcon?: boolean;
		submitFunction: () => void;
	}

	let {
		buttonText = undefined,
		buttonTitle,
		disabled = false,
		modalTitle,
		modalBody,
		action = 'delete',
		color = 'red',
		additionalClasses = null,
		isIcon = false,
		submitFunction
	}: Props = $props();

	let modalOpen = $state(false);
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
