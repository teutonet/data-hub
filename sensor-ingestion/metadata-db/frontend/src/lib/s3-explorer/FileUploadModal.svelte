<script lang="ts">
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import {
		Alert,
		Button,
		Checkbox,
		Fileupload,
		InputAddon,
		Label,
		List,
		Modal,
		P,
		Select,
		Spinner
	} from 'flowbite-svelte';
	import { _ } from 'svelte-i18n';
	import XCircleIcon from '~icons/heroicons/x-circle';
	import InfoIcon from '~icons/heroicons/information-circle';
	import { error } from '$lib/common/toast/toast';
	import FileOverwriteModal from '$lib/s3-explorer/FileOverwriteModal.svelte';
	import { validFilename, type fileType, createFiles, fileExists } from '$lib/s3-explorer/s3Utils';
	import { S3 } from '@aws-sdk/client-s3';
	import { activeProjectId } from '$lib/nav/activeProject';

	interface Props {
		isOpen: boolean;
		s3Client: S3;
		buckets: string[];
		onSubmit: () => void;
	}

	let { isOpen = $bindable(), s3Client, buckets, onSubmit }: Props = $props();

	let currentBucket: string | undefined = $state();
	$effect(() => {
		if (isOpen && buckets.includes($activeProjectId)) {
			currentBucket = $activeProjectId;
		} else {
			currentBucket = undefined;
		}
	});

	let overwriteModalOpen = $state(false);

	let isPublic = $state(false);
	let requestSent = $state(false);

	let selectedFilesList = $state<FileList | undefined>(undefined);
	let newFiles: Promise<fileType>[] = $derived(
		Array.from(selectedFilesList ?? []).map(async (f) => {
			return { name: f.name, type: f.type, content: await f.arrayBuffer() };
		}) ?? []
	);
	let overwrites: fileType[] = $state([]);
	let unchangedFiles: fileType[] = [];

	async function submit() {
		if (!currentBucket) {
			error($_('page.s3-explorer.noBucketSelected'));
			return;
		}

		requestSent = true;
		await fileUploadFunction(currentBucket).finally(() => (requestSent = false));
	}

	async function fileUploadFunction(bucket: string) {
		overwrites = [];
		unchangedFiles = [];

		for (let i = 0; i < newFiles.length; i++) {
			const currentFile = await newFiles[i];
			const key = currentFile.name;

			if (key.startsWith('/')) {
				currentFile.name = key.slice(1);
			}
			if (key.endsWith('/')) {
				currentFile.name = key.slice(0, -1);
			}
			if (isPublic && !key.startsWith('_public/')) {
				currentFile.name = '_public/' + key;
			}

			if (!key || !validFilename(key)) {
				error($_('page.s3-explorer.invalidFileName'));
				return;
			}

			if (await fileExists(s3Client, bucket, currentFile.name)) {
				overwrites.push(currentFile);
				continue;
			} else {
				unchangedFiles.push(currentFile);
				continue;
			}
		}

		if (overwrites.length > 0) {
			overwriteModalOpen = true;
			return;
		} else {
			await createFiles(s3Client, bucket, unchangedFiles);
			await cleanup();
		}
	}

	async function fileOverwriteFunction(bucket: string | undefined) {
		if (!bucket) {
			error($_('page.s3-explorer.noBucketSelected'));
			return;
		}

		let uploadFiles = (await Promise.all(newFiles).then((files) => files))
			.filter((file) => {
				if (overwrites.some((f) => file.name === f.name)) {
					return file;
				}
			})
			.concat(unchangedFiles);

		await createFiles(s3Client, bucket, uploadFiles);
		await cleanup();
	}

	function unselectFile(file: fileType) {
		if (selectedFilesList) {
			const dt = new DataTransfer();

			for (let i = 0; i < selectedFilesList.length; i++) {
				const currentFile = selectedFilesList.item(i);

				if (currentFile && currentFile.name !== file.name) {
					dt.items.add(currentFile);
				}
			}

			selectedFilesList = dt.files;
		}
	}

	async function cleanup() {
		isOpen = false;
		overwriteModalOpen = false;
		isPublic = false;
		requestSent = false;
		selectedFilesList = undefined;
		unchangedFiles = [];
		overwrites = [];

		onSubmit();
	}
</script>

<Modal
	outsideclose
	title={$_('page.s3-explorer.uploadModal.title')}
	bind:open={isOpen}
	on:close={cleanup}
>
	<form onsubmit={submit} class="flex flex-1 flex-col gap-4">
		<Label>
			{$_('page.s3-explorer.bucket')}
			<Select
				items={buckets.map((b) => {
					return { value: b, name: b };
				})}
				bind:value={currentBucket}
			/>
		</Label>
		<Fileupload
			multiple
			clearable
			bind:files={selectedFilesList}
			aria-label={$_('page.s3-explorer.uploadModal.fileuploadLabel')}
		/>
		<div class="flex flex-row">
			<Alert color={isPublic ? 'orange' : 'default'} class="flex flex-row p-2">
				<Checkbox bind:checked={isPublic}>
					{$_('page.s3-explorer.public')}
					<InfoIcon class="ms-4 h-[1.5rem] w-[1.5rem]" />
					<P class="ps-1 align-text-bottom" size="xs">{$_('page.s3-explorer.publicTooltip')}</P>
				</Checkbox>
			</Alert>
		</div>
		{#if (selectedFilesList ?? []).length > 0}
			<P class="text-primary-600 dark:text-primary-500 underline">
				{$_('page.s3-explorer.uploadModal.selectedFiles')}
			</P>
			<List class="max-h-[50vh] overflow-auto">
				{#each newFiles as file (file)}
					{#await file then file}
						<div class="mb-2 flex flex-row">
							{#if isPublic}
								<InputAddon class="border-r-0">
									<span>_public/</span>
								</InputAddon>
							{/if}
							<ValidatedFormField
								outerDivClasses="grow"
								inputClass={isPublic ? 'rounded-l-none' : ''}
								bind:value={file.name}
								inputLabel={$_('page.s3-explorer.fileName')}
								inputId="file-key"
								required
							/>
							<Button
								title={$_('page.s3-explorer.uploadModal.removeFile')}
								color="red"
								class="ms-1"
								on:click={() => unselectFile(file)}
							>
								<XCircleIcon />
							</Button>
						</div>
					{/await}
				{/each}
			</List>
		{/if}
		<Button
			color="green"
			type="submit"
			disabled={requestSent || !currentBucket || currentBucket === 'all'}
		>
			{$_('page.s3-explorer.upload')}
			{#if requestSent}
				<Spinner class="ms-1" />
			{/if}
		</Button>
	</form>

	<FileOverwriteModal
		bind:isOpen={overwriteModalOpen}
		bind:overwrites
		fileOverwriteFunction={() => fileOverwriteFunction(currentBucket)}
	/>
</Modal>
