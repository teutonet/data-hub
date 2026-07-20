import {
	GetObjectCommand,
	S3,
	S3ServiceException,
	type _Object,
	type GetObjectCommandOutput,
	type ListObjectsCommandOutput
} from '@aws-sdk/client-s3';
import { STS } from '@aws-sdk/client-sts';
import { error, success } from '$lib/common/toast/toast';
import { getConfig } from '$lib/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageObject {
	readonly bucket: string;
	readonly key: string;
	readonly isPublic: boolean;
	readonly lastModified: Date;
	readonly sizeInBytes: number;
	readonly filetype?: string;
	readonly _tag: 'StorageObject';
}

export type fileType = { name: string; type: string; content: string | ArrayBuffer };

export const isDefined: <T>(value: T | undefined | null) => value is T = (value) =>
	value !== undefined && value !== null;

const filetype: (key: string) => string | undefined = (key): string | undefined => {
	const parts = key
		.toLowerCase()
		.split('.')
		.filter((w) => w.length > 0);
	return parts.length > 1 ? parts.pop() : undefined;
};

export const validFilename = (filename: string) => /^[a-zA-Z0-9()+,.;:=@_/-]+$/.test(filename);

const mkStorageObject: (
	bucket: string,
	key: string,
	isPublic: boolean,
	lastModified: Date,
	sizeInBytes: number
) => StorageObject | undefined = (bucket, key, isPublic, lastModified, sizeInBytes) => {
	const ft = filetype(key);
	return validFilename(key)
		? {
				bucket,
				key,
				isPublic,
				lastModified,
				sizeInBytes,
				filetype: ft,
				_tag: 'StorageObject'
			}
		: undefined;
};

export const toS3Objects: (result: ListObjectsCommandOutput) => StorageObject[] = ({
	Name: name,
	Contents: contents
}) =>
	name && contents
		? contents
				.filter((o): o is Required<_Object> => !!(o.Key && o.Size != undefined && o.LastModified))
				.map(({ Key: key, LastModified: lastModified, Size: sizeInBytes }) =>
					mkStorageObject(name, key, key.startsWith('_public/'), lastModified, sizeInBytes)
				)
				.filter(isDefined)
		: [];

export interface Left<E> {
	readonly left: E;
	readonly _tag: 'Left';
}

export interface Right<A> {
	readonly right: A;
	readonly _tag: 'Right';
}

export type FetchObjectsError = {
	name: 'AccessDenied' | 'Unknown';
	e: unknown;
};

export type Either<E, A> = Left<E> | Right<A>;

export const right: <E = never, A = never>(a: A) => Either<E, A> = (a) => ({
	right: a,
	_tag: 'Right'
});

export const left: <E = never, A = never>(e: E) => Either<E, A> = (e) => ({
	left: e,
	_tag: 'Left'
});

export const fetchObjectsError = (error: unknown): Either<FetchObjectsError, never> => {
	const mkError = (name: 'AccessDenied' | 'Unknown') =>
		left({
			name,
			e: error
		});
	return error instanceof S3ServiceException && error.name === 'AccessDenied'
		? mkError('AccessDenied')
		: mkError('Unknown');
};

const awsDefaultOptions = {
	region: 'none',
	forcePathStyle: true,
	endpoint: getConfig('STORAGE_URL')
} as const;

export async function createS3Client(currentIdToken: string): Promise<S3> {
	const sts = await new STS(awsDefaultOptions).assumeRoleWithWebIdentity({
		RoleArn: 'arn:aws:iam::RGW99999999999999999:role/usercode',
		RoleSessionName: `usercode`,
		WebIdentityToken: currentIdToken
	});

	const s3 = new S3({
		...awsDefaultOptions,
		credentials: {
			accessKeyId: sts.Credentials?.AccessKeyId ?? '',
			secretAccessKey: sts.Credentials?.SecretAccessKey ?? '',
			sessionToken: sts.Credentials?.SessionToken ?? ''
		}
	});

	return s3;
}

export async function fetchFile(
	s3Client: S3,
	bucket: string,
	key: string
): Promise<GetObjectCommandOutput> {
	return await s3Client.getObject({
		Bucket: bucket,
		Key: key
	});
}

export async function fetchFiles(s3Client: S3, buckets: string[]): Promise<StorageObject[]> {
	const [currentBucket, ...otherBuckets] = buckets;
	if (!currentBucket) {
		return [];
	}

	const newFiles = await s3Client
		.listObjects({ Bucket: currentBucket })
		.then(toS3Objects)
		.then(right)
		.catch(fetchObjectsError);

	const currentFiles = newFiles._tag === 'Right' ? newFiles.right : [];

	return currentFiles.concat(await fetchFiles(s3Client, otherBuckets));
}

export async function createFile(
	s3Client: S3,
	bucket: string,
	key: string,
	body: string | ReadableStream | Uint8Array
) {
	await s3Client.putObject({
		Bucket: bucket,
		Key: key,
		Body: body
	});
	success('shared.message.savedSuccessfully');
}

export async function createFiles(
	s3Client: S3,
	bucket: string,
	files: fileType[] | Promise<fileType>[]
) {
	for (const f of files) {
		const file = await f;
		await s3Client.putObject({
			Bucket: bucket,
			Key: file.name,
			Body: typeof file.content === 'string' ? file.content : new Uint8Array(file.content)
		});
	}
	success('shared.message.savedSuccessfully');
}

export async function deleteFile(s3Client: S3, bucket: string, key: string, renamed = false) {
	await s3Client.deleteObject({
		Bucket: bucket,
		Key: key
	});
	if (!renamed) {
		success('shared.message.deletedSuccessfully');
	}
}

export async function deleteFiles(s3Client: S3, files: StorageObject[]) {
	for (const file of files) {
		await s3Client.deleteObject({
			Bucket: file.bucket,
			Key: file.key
		});
	}
	success('shared.message.deletedSuccessfully');
}

export async function renameFile(s3Client: S3, bucket: string, key: string, newKey: string) {
	if (!(await fileExists(s3Client, bucket, newKey)) && newKey !== key) {
		await s3Client.copyObject({
			CopySource: encodeURI(`${bucket}/${key}`),
			Bucket: bucket,
			Key: newKey
		});
		await deleteFile(s3Client, bucket, key, true);
	} else {
		error('page.s3-explorer.fileAlreadyExists');
	}
}

export async function getMetadata(
	s3Client: S3,
	bucket: string,
	key: string
): Promise<Record<string, string>> {
	const head = await s3Client.headObject({
		Bucket: bucket,
		Key: key,
		ResponseCacheControl: 'no-cache'
	});
	return head.Metadata ?? {};
}

export async function editMetadata(
	s3Client: S3,
	bucket: string,
	key: string,
	metadata: Record<string, string>
) {
	await s3Client.copyObject({
		CopySource: encodeURI(`${bucket}/${key}`),
		Bucket: bucket,
		Key: key,
		MetadataDirective: 'REPLACE',
		Metadata: metadata
	});
	success('shared.message.savedSuccessfully');
}

export async function getDownloadUrl(s3Client: S3, bucket: string, key: string) {
	try {
		const url = await getSignedUrl(
			s3Client,
			new GetObjectCommand({
				Bucket: bucket,
				Key: key
			}),
			{ expiresIn: 300 }
		);

		const response = await fetch(url);
		if (!response.ok) {
			error('page.s3-explorer.downloadFailed');
		}

		const blob = await response.blob();

		return URL.createObjectURL(blob);
	} catch (e) {
		console.error(e);
	}
}

export async function downloadFile(s3Client: S3, bucket: string, key: string) {
	const url = (await getDownloadUrl(s3Client, bucket, key)) ?? '';
	const link = document.createElement('a');
	link.download = key.startsWith('_public/') ? key.slice(8) : key;
	link.href = url;
	link.click();
}

export async function fileExists(s3Client: S3, bucket: string, key: string) {
	const existingFiles = await fetchFiles(s3Client, [bucket]);

	return existingFiles.some((f) => f.key === key);
}
