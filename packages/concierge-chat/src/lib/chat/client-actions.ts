import { browser } from '$app/environment';
import { goto, invalidate, invalidateAll } from '$app/navigation';
import type { AgencyAccessPreviewMode } from '$lib/agency-access';
import {
	CONCIERGE_THREAD_MUTATION_EVENT,
	type AgencyAccessPreviewResponse,
	CONCIERGE_SESSION_DEPENDENCY,
	type IntakeVerificationRequestResponse,
	type IntakeVerificationVerifyResponse,
	type SessionResetResponse,
	type ThreadAttachmentUploadResponse,
	type ThreadActionRequest,
	type ThreadCreateResponse,
	type ThreadMutationResponse
} from './api-contract';

async function readErrorMessage(response: Response) {
	try {
		const payload = await response.json();
		if (payload && typeof payload.message === 'string' && payload.message.trim()) {
			return payload.message;
		}
	} catch {
		// Fall back to the plain-text body below.
	}

	const fallback = await response.text();
	return fallback || `Request failed with status ${response.status}.`;
}

async function postJson<TResponse>(url: string, body?: unknown) {
	const response = await fetch(url, {
		method: 'POST',
		headers: body === undefined ? undefined : { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	return (await response.json()) as TResponse;
}

function dispatchThreadMutation(response: ThreadMutationResponse) {
	if (!browser) {
		return;
	}

	window.dispatchEvent(
		new CustomEvent<ThreadMutationResponse>(CONCIERGE_THREAD_MUTATION_EVENT, {
			detail: response
		})
	);
}

async function postFormData<TResponse>(url: string, body: FormData) {
	const response = await fetch(url, {
		method: 'POST',
		body
	});

	if (!response.ok) {
		throw new Error(await readErrorMessage(response));
	}

	return (await response.json()) as TResponse;
}

export async function createConciergeThreadClient() {
	const response = await postJson<ThreadCreateResponse>('/api/threads');
	await invalidate(CONCIERGE_SESSION_DEPENDENCY);
	await goto(`/chat/${response.threadId}`);
	return response.threadId;
}

export async function resetConciergeSessionClient() {
	await postJson<SessionResetResponse>('/api/threads/reset');
	await invalidate(CONCIERGE_SESSION_DEPENDENCY);
}

export async function sendThreadMessage(threadId: string, body: string) {
	const response = await postJson<ThreadMutationResponse>(`/api/threads/${threadId}/message`, {
		body
	});
	dispatchThreadMutation(response);
	return response;
}

export async function runThreadAction(threadId: string, action: ThreadActionRequest) {
	const response = await postJson<ThreadMutationResponse>(`/api/threads/${threadId}/action`, action);
	dispatchThreadMutation(response);
	return response;
}

export async function uploadThreadAttachments(
	threadId: string,
	uploads: Array<{ documentKey: string; file: File }>
) {
	const formData = new FormData();

	for (const upload of uploads) {
		formData.set(upload.documentKey, upload.file, upload.file.name);
	}

	const response = await postFormData<ThreadAttachmentUploadResponse>(
		`/api/threads/${threadId}/attachments`,
		formData
	);
	dispatchThreadMutation(response);
	return response;
}

export async function setAgencyAccessPreviewMode(mode: AgencyAccessPreviewMode | null) {
	await postJson<AgencyAccessPreviewResponse>('/api/agency-access/preview', { mode });
	await invalidateAll();
}

export async function requestIntakeVerificationCode(email: string) {
	return postJson<IntakeVerificationRequestResponse>('/api/intake-verification/request', { email });
}

export async function verifyIntakeVerificationCode(email: string, code: string) {
	const response = await postJson<IntakeVerificationVerifyResponse>(
		'/api/intake-verification/verify',
		{ email, code }
	);
	await invalidateAll();
	return response;
}
