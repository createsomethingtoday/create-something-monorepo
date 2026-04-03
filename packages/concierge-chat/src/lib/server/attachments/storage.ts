import type { RequiredDocumentKey } from '$chat/document-requirements';

interface ThreadAttachmentStoreInput {
	sessionId: string;
	threadId: string;
	documentKey: RequiredDocumentKey;
	fileName: string;
	contentType: string;
	bytes: ArrayBuffer;
	platform?: App.Platform;
}

interface LocalAttachmentRecord {
	bytes: Uint8Array;
	contentType: string;
	fileName: string;
}

export interface StoredThreadAttachment {
	storageKey: string;
	fileName: string;
	contentType: string;
	byteSize: number;
	storageBackend: 'memory' | 'r2';
}

export interface ResolvedThreadAttachment {
	bytes: ArrayBuffer;
	contentType: string;
	fileName?: string;
}

const localAttachmentStore = new Map<string, LocalAttachmentRecord>();

function sanitizePathSegment(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
}

function buildStorageKey(
	sessionId: string,
	threadId: string,
	documentKey: RequiredDocumentKey,
	fileName: string
) {
	const timestamp = Date.now();
	const safeName = sanitizePathSegment(fileName || 'attachment.bin');
	return `sessions/${sessionId}/threads/${threadId}/${documentKey}/${timestamp}-${crypto.randomUUID()}-${safeName}`;
}

export async function storeThreadAttachment({
	sessionId,
	threadId,
	documentKey,
	fileName,
	contentType,
	bytes,
	platform
}: ThreadAttachmentStoreInput): Promise<StoredThreadAttachment> {
	const storageKey = buildStorageKey(sessionId, threadId, documentKey, fileName);
	const byteSize = bytes.byteLength;
	const bucket = platform?.env?.UPLOADS;

	if (bucket) {
		await bucket.put(storageKey, bytes, {
			httpMetadata: {
				contentType,
				contentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"`
			}
		});

		return {
			storageKey,
			fileName,
			contentType,
			byteSize,
			storageBackend: 'r2'
		};
	}

	localAttachmentStore.set(storageKey, {
		bytes: new Uint8Array(bytes),
		contentType,
		fileName
	});

	return {
		storageKey,
		fileName,
		contentType,
		byteSize,
		storageBackend: 'memory'
	};
}

export async function readThreadAttachment(storageKey: string, platform?: App.Platform) {
	const bucket = platform?.env?.UPLOADS;

	if (bucket) {
		const object = await bucket.get(storageKey);
		if (!object) {
			return null;
		}

		return {
			bytes: await object.arrayBuffer(),
			contentType: object.httpMetadata?.contentType ?? 'application/octet-stream'
		} satisfies ResolvedThreadAttachment;
	}

	const localRecord = localAttachmentStore.get(storageKey);
	if (!localRecord) {
		return null;
	}

	return {
		bytes: localRecord.bytes.slice().buffer,
		contentType: localRecord.contentType,
		fileName: localRecord.fileName
	} satisfies ResolvedThreadAttachment;
}
