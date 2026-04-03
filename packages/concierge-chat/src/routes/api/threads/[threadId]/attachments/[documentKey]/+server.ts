import { type RequestHandler } from '@sveltejs/kit';
import { getRequiredDocumentSpecByKey } from '$chat/document-requirements';
import { readThreadAttachment } from '$lib/server/attachments/storage';
import {
	getIntakeAccessErrorMessage,
	getIntakeAccessStatusCode,
	resolveIntakeAccess
} from '$lib/server/intake-access';
import { ensureConciergeSession, getRequiredThreadView } from '$lib/server/threads/session';

function buildDownloadHeaders(fileName: string, contentType: string) {
	return new Headers({
		'content-type': contentType,
		'content-disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
		'cache-control': 'private, no-store'
	});
}

export const GET: RequestHandler = async ({ cookies, params, platform, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });
	const threadId = params.threadId;
	const documentKey = params.documentKey;

	if (!threadId || !documentKey) {
		return new Response('Attachment path is incomplete.', { status: 400 });
	}

	const intakeAccess = resolveIntakeAccess({
		cookies,
		url,
		platform,
		secure: url.protocol === 'https:'
	});

	if (!intakeAccess.granted) {
		return new Response(getIntakeAccessErrorMessage(intakeAccess), {
			status: getIntakeAccessStatusCode(intakeAccess)
		});
	}

	const spec = getRequiredDocumentSpecByKey(documentKey);
	if (!spec) {
		return new Response('Unknown attachment.', { status: 404 });
	}

	const threadView = await getRequiredThreadView(sessionId, threadId, platform);
	const artifact = threadView.thread.artifacts.find(
		(item) =>
			item.kind === 'upload' &&
			item.status === 'ready' &&
			(item.documentKey === spec.key || item.title === spec.title)
	);

	if (!artifact?.storageKey) {
		return new Response('Attachment is not available for download.', { status: 404 });
	}

	const resolved = await readThreadAttachment(artifact.storageKey, platform);
	if (!resolved) {
		return new Response('Stored attachment could not be found.', { status: 404 });
	}

	return new Response(resolved.bytes, {
		status: 200,
		headers: buildDownloadHeaders(
			artifact.fileName ?? resolved.fileName ?? `${spec.key}.bin`,
			artifact.contentType ?? resolved.contentType
		)
	});
};
