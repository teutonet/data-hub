<script lang="ts">
	import { editMetadata, getMetadata } from '$lib/s3-explorer/s3Utils';
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { S3 } from '@aws-sdk/client-s3';
	import {
		Button,
		Modal,
		P,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import TrashIcon from '~icons/heroicons/trash';
	import PlusIcon from '~icons/heroicons/plus';
	import EditIcon from '~icons/heroicons/pencil-square';
	import SaveIcon from '~icons/heroicons/check';
	import CancelIcon from '~icons/heroicons/x-mark';
	import { error } from '$lib/common/toast/toast';
	import { API_NAME_REGEX } from '$lib/nav/fetchUtils';

	interface Props {
		isOpen: boolean;
		s3Client: S3;
		bucket: string;
		key: string;
		allowWrite: boolean;
	}

	let {
		isOpen = $bindable(),
		s3Client,
		bucket = $bindable(),
		key = $bindable(),
		allowWrite
	}: Props = $props();

	// For ASCII, at least one non-whitespace, see https://catonmat.net/my-favorite-regex
	const METADATA_VALUE_REGEX = '^[!-~][ -~]{0,7999}$';
	// load metadata every time the modal is opened by reloading the promise
	let metadataPromise: Promise<void> = $derived.by(async () => {
		if (isOpen) return loadMetadata(s3Client, bucket, key);
	});
	let originalMetadata: Record<string, string> = $state({});
	let metadata: Record<string, string> = $state({});
	let metadataKey = $state('');
	let metadataValue = $state('');

	let editingKey = $state('');
	let editing = $state(false);

	function clean() {
		metadataKey = '';
		metadataValue = '';
		editingKey = '';
		editing = false;
	}

	async function loadMetadata(s3Client: S3, bucket: string, key: string) {
		if (!s3Client.config.region) return; // prevent region is missing error on page load
		originalMetadata = await getMetadata(s3Client, bucket, key);
		metadata = { ...originalMetadata };
	}

	function onsubmit() {
		metadataKey = metadataKey.trim().replaceAll(/ +/g, '-');
		metadataValue = metadataValue.trim();

		if (
			(!editing && metadataKey in metadata) ||
			(editing && metadataKey in metadata && metadataKey !== editingKey)
		) {
			error($_('page.s3-explorer.metadataModal.keyExists'));
			return;
		}

		metadata[metadataKey] = metadataValue;
		if (editing && editingKey !== metadataKey) {
			delete metadata[editingKey];
		}

		clean();
	}

	async function setMetadata() {
		await editMetadata(s3Client, bucket, key, metadata).then(() => {
			isOpen = false;
			metadataPromise = loadMetadata(s3Client, bucket, key);
		});
	}
</script>

{#await metadataPromise then _p}
	<Modal
		outsideclose
		bind:open={isOpen}
		title={`${key} ${$_('page.s3-explorer.metadataModal.title')}`}
	>
		<form {onsubmit}>
			<Table>
				<TableHead>
					<TableHeadCell class="max-w-[12rem]">
						{$_('page.s3-explorer.metadataModal.key')}
					</TableHeadCell>
					<TableHeadCell class="max-w-[12rem]">
						{$_('page.s3-explorer.metadataModal.value')}
					</TableHeadCell>
					<TableHeadCell />
				</TableHead>
				<TableBody>
					{#each Object.entries(metadata) as [key, value] (key)}
						<TableBodyRow>
							{#if editing && editingKey === key}
								<TableBodyCell class="max-w-[12rem] pr-0">
									<ValidatedFormField
										bind:value={metadataKey}
										inputLabel={$_('page.s3-explorer.metadataModal.editKey')}
										inputId="metadata-edit-key"
										pattern={API_NAME_REGEX}
										patternMismatchText={$_('page.s3-explorer.metadataModal.invalidKey')}
										required
									/>
								</TableBodyCell>
								<TableBodyCell class="max-w-[12rem] pr-0">
									<ValidatedFormField
										bind:value={metadataValue}
										inputLabel={$_('page.s3-explorer.metadataModal.editValue')}
										inputId="metadata-edit-value"
										pattern={METADATA_VALUE_REGEX}
										patternMismatchText={$_('page.s3-explorer.metadataModal.invalidValue')}
										required
									/>
								</TableBodyCell>
								<TableBodyCell>
									<Button
										color="green"
										class="h-[3rem]"
										type="submit"
										aria-label={$_('page.s3-explorer.metadataModal.confirmChanges')}
									>
										<SaveIcon />
									</Button>
									<Button
										color="red"
										class="h-[3rem]"
										onclick={clean}
										aria-label={$_('page.s3-explorer.metadataModal.discardChanges')}
									>
										<CancelIcon />
									</Button>
								</TableBodyCell>
							{:else}
								<TableBodyCell class="max-w-[12rem] pr-0">
									<P class="truncate">{key}</P>
								</TableBodyCell>
								<TableBodyCell class="max-w-[12rem] pr-0">
									<P class="truncate">{value}</P>
								</TableBodyCell>
								<TableBodyCell>
									<Button
										aria-label={$_('page.s3-explorer.metadataModal.edit')}
										color="blue"
										class="h-[3rem] max-w-fit"
										disabled={!allowWrite}
										onclick={() => {
											editing = true;
											editingKey = key;
											metadataKey = key;
											metadataValue = value;
										}}
									>
										<EditIcon />
									</Button>
									<Button
										aria-label={$_('page.s3-explorer.metadataModal.delete')}
										color="red"
										class="h-[3rem] max-w-fit"
										disabled={!allowWrite}
										onclick={() => delete metadata[key]}
									>
										<TrashIcon />
									</Button>
								</TableBodyCell>
							{/if}
						</TableBodyRow>
					{/each}
					{#if !editing && allowWrite}
						<TableBodyRow>
							<TableBodyCell class="p-0 pl-6">
								<ValidatedFormField
									bind:value={metadataKey}
									inputLabel={$_('page.s3-explorer.metadataModal.key')}
									inputId="metadata-key"
									pattern={API_NAME_REGEX}
									patternMismatchText={$_('page.s3-explorer.metadataModal.invalidKey')}
									required
								/>
							</TableBodyCell>
							<TableBodyCell class="p-0 pl-6">
								<ValidatedFormField
									bind:value={metadataValue}
									inputLabel={$_('page.s3-explorer.metadataModal.value')}
									inputId="metadata-value"
									pattern={METADATA_VALUE_REGEX}
									patternMismatchText={$_('page.s3-explorer.metadataModal.invalidValue')}
									required
								/>
							</TableBodyCell>
							<TableBodyCell>
								<Button
									color="green"
									class="h-[3rem]"
									type="submit"
									aria-label={$_('page.s3-explorer.metadataModal.set')}
								>
									<PlusIcon />
								</Button>
							</TableBodyCell>
						</TableBodyRow>
					{/if}
				</TableBody>
			</Table>
			<Button
				color="green"
				class={allowWrite ? 'w-full' : 'mt-4 w-full'}
				onclick={setMetadata}
				disabled={JSON.stringify(metadata) === JSON.stringify(originalMetadata) || editing}
			>
				{$_('shared.action.save')}
			</Button>
		</form>
	</Modal>
{/await}
