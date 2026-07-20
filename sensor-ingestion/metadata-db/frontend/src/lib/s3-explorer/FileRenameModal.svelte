<script lang="ts">
	import { renameFile } from '$lib/s3-explorer/s3Utils';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { S3 } from '@aws-sdk/client-s3';
	import { Alert, Button, Checkbox, Modal, P } from 'flowbite-svelte';
	import InfoIcon from '~icons/heroicons/information-circle';
	import { _ } from 'svelte-i18n';

	interface Props {
		isOpen: boolean;
		s3Client: S3;
		bucket: string;
		key: string;
		onSubmit: () => void;
	}

	let { isOpen = $bindable(), s3Client, bucket, key = $bindable(), onSubmit }: Props = $props();

	let newKey = $derived(key);
	let isPublic = $derived(newKey.startsWith('_public/'));

	async function submit() {
		if (newKey) {
			await renameFile(s3Client, bucket, key, newKey);
			key = newKey;
			isOpen = false;
			onSubmit();
		}
	}

	function toggleIsPublic() {
		isPublic = !isPublic;

		if (newKey.startsWith('/')) newKey = newKey.slice(1);

		if (isPublic && !newKey.startsWith('_public/')) {
			newKey = '_public/' + newKey;
		} else if (!isPublic && newKey.startsWith('_public/')) {
			newKey = newKey.slice(8);
		}
	}
</script>

{#key key}
	<Modal outsideclose bind:open={isOpen} title={$_('page.s3-explorer.renameModal.title')}>
		<form class="flex flex-1 flex-col gap-4" onsubmit={submit}>
			<Alert color={isPublic ? 'orange' : 'default'} class="flex flex-row p-2">
				<Checkbox checked={isPublic} on:change={toggleIsPublic}>
					{$_('page.s3-explorer.public')}
					<InfoIcon class="ms-4 h-[1.5rem] w-[1.5rem]" />
					<P class="ps-1 align-text-bottom" size="xs">{$_('page.s3-explorer.publicTooltip')}</P>
				</Checkbox>
			</Alert>
			<ValidatedFormField
				outerDivClasses="grow"
				bind:value={newKey}
				inputLabel={$_('page.s3-explorer.newFileName')}
				inputId="file-key"
				required
			/>
			<Button color="green" type="submit" class="w-full" disabled={newKey === '_public/'}>
				{$_('shared.action.save')}
			</Button>
		</form>
	</Modal>
{/key}
