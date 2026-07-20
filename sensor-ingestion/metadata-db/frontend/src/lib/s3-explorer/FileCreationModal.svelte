<script lang="ts">
	import ValidatedFormField from '$lib/ValidatedFormField.svelte';
	import { Alert, Button, Checkbox, Label, Modal, P, Select, Spinner } from 'flowbite-svelte';
	import InfoIcon from '~icons/heroicons/information-circle';
	import { _ } from 'svelte-i18n';
	import { error } from '$lib/common/toast/toast';
	import FileOverwriteModal from '$lib/s3-explorer/FileOverwriteModal.svelte';
	import { validFilename, createFile, fileExists } from '$lib/s3-explorer/s3Utils';
	import { S3 } from '@aws-sdk/client-s3';
	import { activeProjectId } from '$lib/nav/activeProject';

	interface Props {
		isOpen: boolean;
		s3Client: S3;
		buckets: string[];
		onSubmit: () => void;
	}

	let { isOpen = $bindable(), s3Client, buckets, onSubmit }: Props = $props();
	let overwriteModalOpen = $state(false);

	let currentBucket: string | undefined = $state();
	$effect(() => {
		if (isOpen && buckets.includes($activeProjectId)) {
			currentBucket = $activeProjectId;
		} else {
			currentBucket = undefined;
		}
	});

	let key = $state('');
	let type = $derived(key.split('.').pop() ?? '');
	let body = $state('');
	let isPublic = $state(false);
	let requestSent = $state(false);

	$effect(() => {
		if (key.startsWith('_public/')) {
			isPublic = true;
		}
	});

	async function submit() {
		if (!currentBucket) {
			error($_('page.s3-explorer.noBucketSelected'));
			return;
		}

		requestSent = true;
		await fileCreateFunction(currentBucket).finally(() => (requestSent = false));
	}

	async function fileCreateFunction(bucket: string) {
		if (!validFilename(key)) {
			error($_('page.s3-explorer.invalidFileName'));
			return;
		}

		if (isPublic && !key.startsWith('_public/')) {
			key = '_public/' + key;
		}

		if (await fileExists(s3Client, bucket, key)) {
			overwriteModalOpen = true;
			return;
		}

		await createFile(s3Client, bucket, key, body);
		await cleanup();
	}

	async function fileOverwriteFunction(bucket: string | undefined) {
		if (!bucket) {
			error($_('page.s3-explorer.noBucketSelected'));
			return;
		}

		await createFile(s3Client, bucket, key, body);
		await cleanup();
	}

	async function cleanup() {
		isOpen = false;
		overwriteModalOpen = false;
		isPublic = false;
		requestSent = false;
		key = '';
		body = '';

		onSubmit();
	}
</script>

<Modal outsideclose bind:open={isOpen} title={$_('page.s3-explorer.creationModal.title')}>
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
		<Alert color={isPublic ? 'orange' : 'default'} class="flex flex-row p-2">
			<Checkbox bind:checked={isPublic}>
				{$_('page.s3-explorer.public')}
				<InfoIcon class="ms-4 h-[1.5rem] w-[1.5rem]" />
				<P class="ps-1 align-text-bottom" size="xs">{$_('page.s3-explorer.publicTooltip')}</P>
			</Checkbox>
		</Alert>
		<ValidatedFormField
			patternMismatchText={$_('shared.keycloakAPI.resourceNameInvalid')}
			bind:value={key}
			inputLabel={$_('page.s3-explorer.fileName')}
			inputId="file-key"
			required
		/>
		<ValidatedFormField
			inputClass="h-full"
			innerDivClasses="h-full"
			outerDivClasses="grow"
			bind:value={body}
			inputLabel={$_('page.s3-explorer.fileBody')}
			inputId="file-body"
			inputType="textarea"
		/>
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
		overwrites={[{ name: key, type: type, content: body }]}
		fileOverwriteFunction={() => fileOverwriteFunction(currentBucket)}
	/>
</Modal>
