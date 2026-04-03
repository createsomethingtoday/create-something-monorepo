import { json, type RequestHandler } from '@sveltejs/kit';
import type { ThreadAttachmentUploadResponse } from '$chat/api-contract';
import {
	getRequiredDocumentSpecByKey,
	REQUIRED_DOCUMENT_SPECS,
	type RequiredDocumentKey
} from '$chat/document-requirements';
import type { ThreadAttachmentUpload } from '$chat/prototype-session';
import {
	getIntakeAccessErrorMessage,
	getIntakeAccessStatusCode,
	resolveIntakeAccess
} from '$lib/server/intake-access';
import {
	ensureConciergeSession,
	getRequiredThreadView,
	uploadPersistedThreadAttachments
} from '$lib/server/threads/session';
import { storeThreadAttachment } from '$lib/server/attachments/storage';

const MAX_THREAD_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function hasAllowedExtension(fileName: string, allowedExtensions: string[]) {
	const lowerName = fileName.toLowerCase();
	return allowedExtensions.some((extension) => lowerName.endsWith(extension));
}

function resolveContentType(file: File, documentKey: RequiredDocumentKey) {
	const spec = getRequiredDocumentSpecByKey(documentKey);
	if (!spec) {
		return null;
	}

	const normalizedType = file.type.toLowerCase();
	if (spec.allowedMimeTypes.includes(normalizedType)) {
		return normalizedType;
	}

	if (!normalizedType && hasAllowedExtension(file.name, spec.allowedExtensions)) {
		return spec.allowedMimeTypes[0];
	}

	return null;
}

export const POST: RequestHandler = async ({ cookies, params, platform, request, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });
	const threadId = params.threadId;

	if (!threadId) {
		return json({ message: 'Thread id is required.' }, { status: 400 });
	}

	const intakeAccess = resolveIntakeAccess({
		cookies,
		url,
		platform,
		secure: url.protocol === 'https:'
	});

	if (!intakeAccess.granted) {
		return json(
			{ message: getIntakeAccessErrorMessage(intakeAccess) },
			{ status: getIntakeAccessStatusCode(intakeAccess) }
		);
	}

	await getRequiredThreadView(sessionId, threadId, platform);

	let formData: FormData;

	try {
		formData = await request.formData();
	} catch {
		return json({ message: 'Expected multipart form data.' }, { status: 400 });
	}

	const uploads: ThreadAttachmentUpload[] = [];

	for (const spec of REQUIRED_DOCUMENT_SPECS) {
		const value = formData.get(spec.key);

		if (!(value instanceof File) || value.size === 0) {
			continue;
		}

		if (value.size > MAX_THREAD_ATTACHMENT_BYTES) {
			return json(
				{
					message: `${spec.title} exceeds the 10 MB upload limit.`
				},
				{ status: 400 }
			);
		}

		if (!hasAllowedExtension(value.name, spec.allowedExtensions)) {
			return json(
				{
					message: `${spec.title} must use one of these extensions: ${spec.allowedExtensions.join(', ')}.`
				},
				{ status: 400 }
			);
		}

		const contentType = resolveContentType(value, spec.key);

		if (!contentType) {
			return json(
				{
					message: `${spec.title} must be uploaded as ${spec.acceptedTypes.join(' or ')}.`
				},
				{ status: 400 }
			);
		}

		const stored = await storeThreadAttachment({
			sessionId,
			threadId,
			documentKey: spec.key,
			fileName: value.name,
			contentType,
			bytes: await value.arrayBuffer(),
			platform
		});

		uploads.push({
			documentKey: spec.key,
			fileName: stored.fileName,
			contentType: stored.contentType,
			byteSize: stored.byteSize,
			storageKey: stored.storageKey,
			href: `/api/threads/${threadId}/attachments/${spec.key}`
		});
	}

	if (uploads.length === 0) {
		return json({ message: 'Attach at least one required document before uploading.' }, { status: 400 });
	}

	await uploadPersistedThreadAttachments(sessionId, threadId, uploads, platform);

	const response: ThreadAttachmentUploadResponse = {
		ok: true,
		threadId,
		threadView: await getRequiredThreadView(sessionId, threadId, platform),
		uploaded: uploads.map((upload) => ({
			documentKey: upload.documentKey,
			title: getRequiredDocumentSpecByKey(upload.documentKey)?.title ?? upload.documentKey,
			fileName: upload.fileName,
			byteSize: upload.byteSize
		}))
	};

	return json(response);
};
