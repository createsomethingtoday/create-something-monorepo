import { json, type RequestHandler } from '@sveltejs/kit';
import type { ThreadAttachmentUploadResponse } from '$chat/api-contract';
import {
	getRequiredDocumentSpecByKey,
	REQUIRED_DOCUMENT_SPECS,
	type RequiredDocumentKey
} from '$chat/document-requirements';
import type { ThreadAttachmentUpload } from '$chat/prototype-session';
import { storeThreadAttachment } from '$lib/server/attachments/storage';
import {
	getIntakeAccessErrorMessage,
	getIntakeAccessStatusCode,
	resolveIntakeAccess
} from '$lib/server/intake-access';
import { logConciergeEvent, resolveRequestIp, serializeError } from '$lib/server/observability';
import {
	createRateLimitedJsonResponse,
	enforcePublicWritePolicies
} from '$lib/server/public-write-limits';
import {
	ensureConciergeSession,
	getRequiredThreadView,
	uploadPersistedThreadAttachments
} from '$lib/server/threads/session';

const MAX_THREAD_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_THREAD_ATTACHMENT_BYTES_PER_DAY = 60 * 1024 * 1024;

interface ValidatedAttachmentFile {
	spec: (typeof REQUIRED_DOCUMENT_SPECS)[number];
	file: File;
	contentType: string;
}

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
		logConciergeEvent({
			level: 'warn',
			event: 'thread.upload.blocked',
			route: '/api/threads/[threadId]/attachments',
			sessionId,
			threadId,
			request,
			data: {
				reason: intakeAccess.reason,
				source: intakeAccess.source
			}
		});
		return json(
			{ message: getIntakeAccessErrorMessage(intakeAccess) },
			{ status: getIntakeAccessStatusCode(intakeAccess) }
		);
	}

	try {
		await getRequiredThreadView(sessionId, threadId, platform);

		let formData: FormData;

		try {
			formData = await request.formData();
		} catch {
			return json({ message: 'Expected multipart form data.' }, { status: 400 });
		}

		const validatedFiles: ValidatedAttachmentFile[] = [];
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

			validatedFiles.push({
				spec,
				file: value,
				contentType
			});
		}

		if (validatedFiles.length === 0) {
			return json(
				{ message: 'Attach at least one required document before uploading.' },
				{ status: 400 }
			);
		}

		const totalByteSize = validatedFiles.reduce((sum, entry) => sum + entry.file.size, 0);
		const limitResult = await enforcePublicWritePolicies({
			platform,
			policies: [
				{
					scope: 'thread_upload.ip.1h',
					subject: `ip:${resolveRequestIp(request)}`,
					windowMs: 60 * 60 * 1000,
					maxHits: 12,
					hitCost: validatedFiles.length
				},
				{
					scope: 'thread_upload.session.1h',
					subject: `session:${sessionId}`,
					windowMs: 60 * 60 * 1000,
					maxHits: 8,
					hitCost: validatedFiles.length
				},
				{
					scope: 'thread_upload.session.bytes.1d',
					subject: `session:${sessionId}`,
					windowMs: 24 * 60 * 60 * 1000,
					maxHits: 100,
					hitCost: 1,
					maxBytes: MAX_THREAD_ATTACHMENT_BYTES_PER_DAY,
					byteCost: totalByteSize
				}
			]
		});

		if (!limitResult.ok && limitResult.blockedPolicy) {
			logConciergeEvent({
				level: 'warn',
				event: 'thread.upload.rate_limited',
				route: '/api/threads/[threadId]/attachments',
				sessionId,
				threadId,
				request,
				data: {
					scope: limitResult.blockedPolicy.scope,
					hitCount: limitResult.blockedPolicy.hitCount,
					byteCount: limitResult.blockedPolicy.byteCount,
					retryAfterSeconds: limitResult.blockedPolicy.retryAfterSeconds
				}
			});
			return createRateLimitedJsonResponse(
				'Too many protected uploads were attempted from this browser. Wait a bit and try again.',
				limitResult.blockedPolicy.retryAfterSeconds
			);
		}

		const uploads: ThreadAttachmentUpload[] = [];
		for (const entry of validatedFiles) {
			const stored = await storeThreadAttachment({
				sessionId,
				threadId,
				documentKey: entry.spec.key,
				fileName: entry.file.name,
				contentType: entry.contentType,
				bytes: await entry.file.arrayBuffer(),
				platform
			});

			uploads.push({
				documentKey: entry.spec.key,
				fileName: stored.fileName,
				contentType: stored.contentType,
				byteSize: stored.byteSize,
				storageKey: stored.storageKey,
				href: `/api/threads/${threadId}/attachments/${entry.spec.key}`
			});
		}

		await uploadPersistedThreadAttachments(sessionId, threadId, uploads, platform);

		logConciergeEvent({
			event: 'thread.upload.accepted',
			route: '/api/threads/[threadId]/attachments',
			sessionId,
			threadId,
			request,
			data: {
				fileCount: uploads.length,
				totalByteSize
			}
		});

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
	} catch (issue) {
		logConciergeEvent({
			level: 'error',
			event: 'thread.upload.failed',
			route: '/api/threads/[threadId]/attachments',
			sessionId,
			threadId,
			request,
			data: serializeError(issue)
		});
		throw issue;
	}
};
