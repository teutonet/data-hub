<script lang="ts">
	import PageTitle from '$lib/PageTitle.svelte';
	import {
		Alert,
		Button,
		ButtonGroup,
		Checkbox,
		Dropdown,
		DropdownItem,
		P,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Tooltip
	} from 'flowbite-svelte';
	import DocumentPlusIcon from '~icons/heroicons/document-plus';
	import UploadIcon from '~icons/heroicons/arrow-up-tray';
	import ChevronUpIcon from '~icons/heroicons/chevron-up';
	import ChevronDownIcon from '~icons/heroicons/chevron-down';
	import PencilSquareIcon from '~icons/heroicons/pencil-square';
	import ArrowDownTrayIcon from '~icons/heroicons/arrow-down-tray';
	import PublicIcon from '~icons/heroicons/globe-alt';
	import PrivateIcon from '~icons/heroicons/lock-closed';
	import MetadataIcon from '~icons/heroicons/table-cells';
	import Bars3Icon from '~icons/heroicons/bars-3';
	import RefreshIcon from '~icons/heroicons/arrow-path-solid';
	import ExclamationCircleIcon from '~icons/heroicons/exclamation-circle-20-solid';
	import { _ } from 'svelte-i18n';
	import { S3 } from '@aws-sdk/client-s3';
	import {
		deleteFile,
		fetchFiles,
		type StorageObject,
		deleteFiles,
		downloadFile,
		createS3Client
	} from '$lib/s3-explorer/s3Utils';
	import DeleteButton from '$lib/common/modals/DeleteButton.svelte';
	import { activeProjectId } from '$lib/nav/activeProject';
	import Pagination from '$lib/common/Pagination.svelte';
	import FileUploadModal from '$lib/s3-explorer/FileUploadModal.svelte';
	import FileRenameModal from '$lib/s3-explorer/FileRenameModal.svelte';
	import FileCreationModal from '$lib/s3-explorer/FileCreationModal.svelte';
	import MetadataEditModal from '$lib/s3-explorer/MetadataEditModal.svelte';
	import { getProjectsWithBucketPermissions } from '$lib/common/graphql/ressource-api-utils';
	import type { Readable } from 'svelte/store';
	import { idToken } from '$lib/common/auth';

	type SortColumnType =
		'isPublic' | 'key' | 'bucket' | 'filetype' | 'sizeInBytes' | 'lastModified' | null;

	let s3Client: S3 = $state(new S3());

	$effect(() => {
		createS3Client($idToken).then((client) => (s3Client = client));
	});

	const projects: Readable<{ project: string; permission: { read: boolean; write: boolean } }[]> =
		getProjectsWithBucketPermissions();

	const bucketPermissions = $derived(
		$projects.map((p) => ({
			project: p.project,
			permission: { read: p.permission.read, write: p.permission.write }
		}))
	);

	const currentBucketPerms = $derived(
		$activeProjectId === 'all'
			? {
					read: bucketPermissions.some((b) => b.permission.read),
					write: bucketPermissions.some((b) => b.permission.write)
				}
			: bucketPermissions.find((b) => b.project === $activeProjectId)?.permission
	);

	const writableBuckets: string[] = $derived(
		bucketPermissions.filter((b) => b.permission.write).map((b) => b.project)
	);
	const readableBuckets: string[] = $derived(
		$activeProjectId === 'all'
			? $projects.map((p) => p.project)
			: currentBucketPerms?.read || currentBucketPerms?.write
				? [$activeProjectId]
				: []
	);

	function getBucketPerms(projectId: string) {
		return bucketPermissions.find((b) => b.project === projectId);
	}

	const showBucketWarning: 'write' | 'both' | undefined = $derived.by(() => {
		if ($activeProjectId === 'all') {
			return bucketPermissions.some((b) => !b.permission.write) ? 'write' : undefined;
		}
		if (!currentBucketPerms) return 'both';
		if (!currentBucketPerms.write) return 'write';
	});

	let files: StorageObject[] = $state([]);

	$effect(() => {
		getFiles(s3Client, readableBuckets);
	});

	let allFilesCheckboxChecked = $state(false);
	let checkedFiles: StorageObject[] = $state([]);

	let uploadModalOpen = $state(false);
	let creationModalOpen = $state(false);
	let renameModalOpen = $state(false);
	let renameFileKey = $state('');
	let renameFileBucket = $state('');
	let metadataModalOpen = $state(false);
	let metadataFileBucket = $state('');
	let metadataFileKey = $state('');
	let metadataFileAllowWrite = $state(false);

	let totalFileSize = $derived(files.reduce((total, file) => total + file.sizeInBytes, 0));
	let fileCount = $derived(files.length);
	let writableFileCount = $derived(
		files.filter((file) => getBucketPerms(file.bucket)?.permission.write).length
	);

	let sortColumn: SortColumnType = $state(null);
	let sortDirection = $state(1);

	let currentPage = $state(1);
	let maxItemsPerPage = $state(10);
	let itemsPerPage = $state([10, 25, 50]);
	let totalPages = $derived(Math.ceil(files.length / maxItemsPerPage));
	let currentPageList: StorageObject[] = $derived(
		files
			.map((f) => ({ ...f }))
			.sort((a, b) => {
				let aVal;
				let bVal;

				if (sortColumn === 'lastModified') {
					aVal = `${a.lastModified.toLocaleDateString()} ${a.lastModified.toLocaleTimeString()}`;
					bVal = `${b.lastModified.toLocaleDateString()} ${b.lastModified.toLocaleTimeString()}`;
				} else {
					aVal = a[sortColumn ?? 'key'] ?? '';
					bVal = b[sortColumn ?? 'key'] ?? '';
				}

				return (
					(sortColumn !== 'sizeInBytes'
						? aVal?.toString().localeCompare(bVal?.toString())
						: a['sizeInBytes'] - b['sizeInBytes']) * sortDirection
				);
			})
			.slice((currentPage - 1) * maxItemsPerPage, currentPage * maxItemsPerPage)
	);

	$effect(() => {
		if (checkedFiles.length < writableFileCount) {
			allFilesCheckboxChecked = false;
		} else {
			allFilesCheckboxChecked = writableFileCount > 0 ? true : false;
		}
	});

	async function getFiles(s3Client: S3, buckets: string[]) {
		files = await fetchFiles(s3Client, buckets);
	}

	async function deleteFunction() {
		await deleteFiles(s3Client, checkedFiles);
		checkedFiles = [];
		allFilesCheckboxChecked = false;
		await getFiles(s3Client, readableBuckets);
		currentPage = 1;
	}

	function getFileSizeWithUnit(sizeInBytes: number): string {
		let units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
		let unitIndex = 0;
		let size = sizeInBytes;
		for (let i = 0; i < units.length; i++) {
			if (size / 1024 >= 1) {
				size /= 1024;
			} else {
				unitIndex = i;
				break;
			}
		}
		return `${size.toFixed(2)} ${units[unitIndex]}`;
	}

	function setSortColumn(column: SortColumnType) {
		if (sortColumn === column) {
			sortDirection *= -1;
		} else {
			sortColumn = column;
			sortDirection = 1;
		}
	}

	const onPreviousButtonClick = () => {
		if (currentPage > 1) {
			currentPage--;
		}
	};

	const onNextButtonClick = () => {
		if (currentPage < totalPages) {
			currentPage++;
		}
	};

	function setMaxItemsPerPage(num: number) {
		currentPage = 1;
		maxItemsPerPage = num;
	}

	function checkboxFunction(file: StorageObject) {
		let checkbox = document.getElementById(
			`checkbox-${file.bucket}.${file.key}`
		) as HTMLInputElement;
		if (checkbox.checked) {
			checkedFiles.push(file);
		} else {
			let i = checkedFiles.findIndex((f) => f.bucket === file.bucket && f.key === file.key);
			checkedFiles.splice(i, 1);
		}
	}
</script>

<PageTitle title={$_('page.s3-explorer.title')} />

{#if showBucketWarning}
	<Alert
		border
		color={showBucketWarning === 'both' ? 'red' : 'primary'}
		class="mb-4 flex items-center"
	>
		<ExclamationCircleIcon class="-mr-2 -ml-1" font-size="20" />
		<div class="flex flex-col">
			{#if $activeProjectId === 'all'}
				{#if showBucketWarning === 'write'}
					<P color="red" size="sm">
						{$_('page.s3-explorer.noWritePermissionWarning')}
					</P>
				{/if}
			{:else}
				{#if showBucketWarning === 'both'}
					<P color="red" size="sm">
						{$_('page.s3-explorer.noBucketAccessWarning')}
					</P>
				{/if}
				{#if showBucketWarning === 'write'}
					<P color="red" size="sm">
						{$_('page.s3-explorer.noBucketWriteWarning')}
					</P>
				{/if}
			{/if}
		</div>
	</Alert>
{/if}

<div class="mb-2 flex flex-row justify-between">
	<ButtonGroup>
		{#if currentBucketPerms?.write}
			<Button
				color="green"
				class="border-r border-black"
				on:click={() => (creationModalOpen = true)}
			>
				<div class="flex flex-row items-center">
					<DocumentPlusIcon class="me-1" />
					{$_('page.s3-explorer.creationModal.title')}
				</div>
			</Button>
			<Button color="green" class="border-r border-black" on:click={() => (uploadModalOpen = true)}>
				<div class="flex flex-row items-center">
					<UploadIcon class="me-1" />
					{$_('page.s3-explorer.uploadModal.title')}
				</div>
			</Button>
		{/if}
		<Button
			color="blue"
			on:click={() => {
				getFiles(s3Client, readableBuckets);
			}}
		>
			<div class="flex flex-row items-center">
				<RefreshIcon class="me-1" />
				{$_('page.s3-explorer.refresh')}
			</div>
		</Button>
	</ButtonGroup>
	<DeleteButton
		disabled={checkedFiles.length === 0}
		additionalClasses="max-w-fit"
		modalTitle={$_('page.s3-explorer.deleteModal.title', {
			values: {
				file:
					checkedFiles.length === 1
						? checkedFiles[0].key
						: $_('page.s3-explorer.files', {
								values: { count: checkedFiles.length }
							})
			}
		})}
		modalBody={$_('page.s3-explorer.deleteModal.body', {
			values: { count: checkedFiles.length }
		})}
		buttonTitle={$_('shared.action.delete')}
		submitFunction={deleteFunction}
	/>
</div>

<Table divClass="overflow-visible">
	<TableHead>
		<TableHeadCell class="w-0">
			<Checkbox
				title={$_('page.s3-explorer.selectAllFiles')}
				bind:checked={allFilesCheckboxChecked}
				on:change={() => {
					checkedFiles = allFilesCheckboxChecked
						? files.filter((file) => getBucketPerms(file.bucket)?.permission.write)
						: [];
				}}
			/>
		</TableHeadCell>
		<TableHeadCell class="w-0" on:click={() => setSortColumn('isPublic')}>
			<div class="flex flex-row">
				{$_('page.s3-explorer.public')}
				{@render sortIcon('isPublic')}
			</div>
		</TableHeadCell>
		<TableHeadCell on:click={() => setSortColumn('key')}>
			<div class="flex flex-row">
				{$_('page.s3-explorer.fileName')}
				{@render sortIcon('key')}
			</div>
		</TableHeadCell>
		<TableHeadCell on:click={() => setSortColumn('bucket')}>
			<div class="flex flex-row">
				{$_('page.s3-explorer.bucket')}
				{@render sortIcon('bucket')}
			</div>
		</TableHeadCell>
		<TableHeadCell on:click={() => setSortColumn('filetype')}>
			<div class="flex flex-row">
				{$_('page.s3-explorer.fileType')}
				{@render sortIcon('filetype')}
			</div>
		</TableHeadCell>
		<TableHeadCell on:click={() => setSortColumn('sizeInBytes')}>
			<div class="flex flex-row">
				{$_('page.s3-explorer.fileSize')}
				{@render sortIcon('sizeInBytes')}
			</div>
		</TableHeadCell>
		<TableHeadCell on:click={() => setSortColumn('lastModified')}>
			<div class="flex flex-row">
				{$_('page.s3-explorer.lastModified')}
				{@render sortIcon('lastModified')}
			</div>
		</TableHeadCell>
		<TableHeadCell />
	</TableHead>
	<TableBody>
		{#each currentPageList as file (file)}
			<TableBodyRow>
				<TableBodyCell>
					{#if getBucketPerms(file.bucket)?.permission.write}
						<Checkbox
							title={$_('page.s3-explorer.selectFile')}
							id={`checkbox-${file.bucket}.${file.key}`}
							checked={allFilesCheckboxChecked ||
								checkedFiles.some((f) => f.bucket === file.bucket && f.key === file.key)}
							on:change={() => checkboxFunction(file)}
						/>
					{/if}
				</TableBodyCell>
				<TableBodyCell>
					{#if file.isPublic}
						<PublicIcon />
						<Tooltip>{$_('page.s3-explorer.publicTooltip')}</Tooltip>
						<span class="sr-only">{$_('page.s3-explorer.public')}</span>
					{:else}
						<PrivateIcon />
						<Tooltip>{$_('page.s3-explorer.privateTooltip')}</Tooltip>
						<span class="sr-only">{$_('page.s3-explorer.private')}</span>
					{/if}
				</TableBodyCell>
				<TableBodyCell>
					{file.key}
				</TableBodyCell>
				<TableBodyCell>
					{file.bucket}
				</TableBodyCell>
				<TableBodyCell>
					{file.filetype ?? '-'}
				</TableBodyCell>
				<TableBodyCell>
					{getFileSizeWithUnit(file.sizeInBytes)}
				</TableBodyCell>
				<TableBodyCell>
					{@const d = file.lastModified}
					{`${d.toLocaleDateString()} ${d.toLocaleTimeString()}`}
				</TableBodyCell>
				<TableBodyCell class="flex justify-end">
					<Button title={$_('page.s3-explorer.options')}>
						<Bars3Icon />
					</Button>
					<Dropdown>
						{#if getBucketPerms(file.bucket)?.permission.write}
							<DropdownItem
								on:click={() => {
									renameFileBucket = file.bucket;
									renameFileKey = file.key;
									renameModalOpen = true;
								}}
								data-sveltekit-preload-data="off"
							>
								<div class="flex min-w-fit flex-row">
									<PencilSquareIcon class="mr-1" />
									{$_('page.s3-explorer.renameModal.title')}
								</div>
							</DropdownItem>
						{/if}
						<DropdownItem
							on:click={async () => await downloadFile(s3Client, file.bucket, file.key)}
							data-sveltekit-preload-data="off"
						>
							<div class="flex min-w-fit flex-row">
								<ArrowDownTrayIcon class="mr-1" />
								{$_('page.s3-explorer.download')}
							</div>
						</DropdownItem>
						<DropdownItem
							onclick={() => {
								metadataModalOpen = true;
								metadataFileBucket = file.bucket;
								metadataFileAllowWrite =
									getBucketPerms(metadataFileBucket)?.permission.write ?? false;
								metadataFileKey = file.key;
							}}
							data-sveltekit-preload-data="off"
						>
							<div class="flex min-w-fit flex-row">
								<MetadataIcon class="mr-1" />
								{$_('page.s3-explorer.metadataModal.title')}
							</div>
						</DropdownItem>
						{#if getBucketPerms(file.bucket)?.permission.write}
							<DeleteButton
								additionalClasses="w-full"
								modalTitle={$_('page.s3-explorer.deleteModal.title', {
									values: { file: file.key }
								})}
								modalBody={$_('page.s3-explorer.deleteModal.body', {
									values: { count: checkedFiles.length }
								})}
								buttonTitle={$_('shared.action.delete')}
								submitFunction={async () => {
									await deleteFile(s3Client, file.bucket, file.key);
									await getFiles(s3Client, readableBuckets);
									currentPage = 1;
								}}
							/>
						{/if}
					</Dropdown>
				</TableBodyCell>
			</TableBodyRow>
		{/each}
		<TableBodyCell />
		<TableBodyCell />
		<TableBodyCell>
			{$_(`page.s3-explorer.files`, {
				values: { count: fileCount }
			})}
		</TableBodyCell>
		<TableBodyCell />
		<TableBodyCell />
		<TableBodyCell>
			{getFileSizeWithUnit(totalFileSize)}
		</TableBodyCell>
	</TableBody>
</Table>

{#if totalPages > 1}
	<div class="flex flex-row justify-between pt-8">
		<div></div>
		<div>
			<Pagination
				bind:pageCount={totalPages}
				bind:currentPage
				previous={onPreviousButtonClick}
				next={onNextButtonClick}
			/>
		</div>
		<div>
			<ButtonGroup>
				<Button>
					{$_('page.s3-explorer.filesPerPage') + maxItemsPerPage}
				</Button>
				<Dropdown>
					{#each itemsPerPage as amount (amount)}
						<DropdownItem on:click={() => setMaxItemsPerPage(amount)}>{amount}</DropdownItem>
					{/each}
					<DropdownItem on:click={() => setMaxItemsPerPage(fileCount)}>
						{$_('page.s3-explorer.showAllFiles')}
					</DropdownItem>
				</Dropdown>
			</ButtonGroup>
		</div>
	</div>
{/if}

<FileUploadModal
	bind:isOpen={uploadModalOpen}
	{s3Client}
	buckets={writableBuckets}
	onSubmit={async () => await getFiles(s3Client, readableBuckets)}
/>

<FileCreationModal
	bind:isOpen={creationModalOpen}
	{s3Client}
	buckets={writableBuckets}
	onSubmit={async () => await getFiles(s3Client, readableBuckets)}
/>
<FileRenameModal
	bind:isOpen={renameModalOpen}
	{s3Client}
	bucket={renameFileBucket}
	bind:key={renameFileKey}
	onSubmit={async () => await getFiles(s3Client, readableBuckets)}
/>

<MetadataEditModal
	bind:isOpen={metadataModalOpen}
	{s3Client}
	bind:bucket={metadataFileBucket}
	bind:key={metadataFileKey}
	allowWrite={metadataFileAllowWrite}
/>

{#snippet sortIcon(column: SortColumnType)}
	{#if sortColumn === column}
		{#if sortDirection === 1}
			<ChevronUpIcon />
		{:else}
			<ChevronDownIcon />
		{/if}
	{/if}
{/snippet}
