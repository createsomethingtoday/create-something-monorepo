import type { ConciergeThread } from '$chat/thread-store';
import {
	getIndeedMcpApiKey,
	getIndeedMcpBaseUrl
} from './runtime';

type RpcFetch = typeof globalThis.fetch;

interface JsonRpcToolResult {
	content?: Array<{ type?: string; text?: string }>;
	structuredContent?: Record<string, unknown>;
	isError?: boolean;
}

interface JsonRpcResponse {
	error?: unknown;
	result?: JsonRpcToolResult;
}

export interface IndeedDispositionWritebackResult {
	skipped: boolean;
	dispositionStatus: string | null;
	syncState:
		| 'not_linked'
		| 'recorded_local_only'
		| 'synced_remote'
		| 'sync_error';
	note: string;
	recordedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeIndeedMcpEndpoint(baseUrl: string) {
	const url = new URL(baseUrl);
	if (url.pathname === '/mcp' || url.pathname.endsWith('/mcp')) {
		return url.toString();
	}

	return new URL('/mcp', url).toString();
}

function extractRpcText(result: JsonRpcToolResult) {
	if (!Array.isArray(result.content)) {
		return null;
	}

	const textParts = result.content
		.filter((item) => item?.type === 'text' && typeof item.text === 'string')
		.map((item) => item.text?.trim() ?? '')
		.filter((value) => value.length > 0);

	return textParts.length > 0 ? textParts.join('\n') : null;
}

function parseRpcPayload(result: JsonRpcToolResult) {
	if (isRecord(result.structuredContent)) {
		return result.structuredContent;
	}

	const text = extractRpcText(result);
	if (!text) {
		return null;
	}

	try {
		const parsed = JSON.parse(text) as unknown;
		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function getThreadIndeedLink(thread: ConciergeThread) {
	return thread.integrationRefs?.indeed ?? null;
}

function buildDispositionNote(thread: ConciergeThread, dispositionStatus: string) {
	const roleTitle = thread.handoff?.roleTitle ?? thread.matching?.shortlist?.[0]?.roleTitle ?? 'travel nurse role';
	const facility = thread.handoff?.facility ?? thread.matching?.shortlist?.[0]?.facility ?? 'assigned facility';

	if (dispositionStatus === 'placement_confirmed') {
		return `Recorded from Abundance after ${facility} confirmed placement for ${roleTitle}.`;
	}

	return `Recorded from Abundance after the staffing request closed for ${roleTitle} at ${facility}.`;
}

export function shouldAttemptIndeedDispositionWriteback(thread: ConciergeThread) {
	return Boolean(getThreadIndeedLink(thread)?.indeedApplyId);
}

export async function recordIndeedDispositionWriteback(input: {
	thread: ConciergeThread;
	dispositionStatus: 'placement_confirmed' | 'request_closed';
	platform?: App.Platform;
	fetch?: RpcFetch;
}): Promise<IndeedDispositionWritebackResult> {
	const recordedAt = new Date().toISOString();
	const indeedLink = getThreadIndeedLink(input.thread);

	if (!indeedLink?.indeedApplyId) {
		return {
			skipped: true,
			dispositionStatus: null,
			syncState: 'not_linked',
			note: 'No Indeed application is linked to this thread.',
			recordedAt
		};
	}

	if (!indeedLink.localApplicationId) {
		return {
			skipped: false,
			dispositionStatus: input.dispositionStatus,
			syncState: 'sync_error',
			note: 'Indeed writeback is linked, but the local application id is missing.',
			recordedAt
		};
	}

	const baseUrl = getIndeedMcpBaseUrl(input.platform);
	const apiKey = getIndeedMcpApiKey(input.platform);
	if (!baseUrl || !apiKey) {
		return {
			skipped: false,
			dispositionStatus: input.dispositionStatus,
			syncState: 'sync_error',
			note: 'Indeed MCP writeback is not configured in this runtime.',
			recordedAt
		};
	}

	const endpoint = normalizeIndeedMcpEndpoint(baseUrl);
	const requestBody = {
		jsonrpc: '2.0',
		id: crypto.randomUUID(),
		method: 'tools/call',
		params: {
			name: 'indeed_apply_record_disposition',
			arguments: {
				local_application_id: indeedLink.localApplicationId,
				status: input.dispositionStatus,
				notes: buildDispositionNote(input.thread, input.dispositionStatus)
			}
		}
	};

	try {
		const response = await (input.fetch ?? fetch)(endpoint, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${apiKey}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const text = await response.text();
			return {
				skipped: false,
				dispositionStatus: input.dispositionStatus,
				syncState: 'sync_error',
				note: `Indeed MCP request failed (${response.status}): ${text}`.slice(0, 400),
				recordedAt
			};
		}

		const payload = (await response.json()) as JsonRpcResponse;
		if (payload.error) {
			return {
				skipped: false,
				dispositionStatus: input.dispositionStatus,
				syncState: 'sync_error',
				note: `Indeed MCP RPC error: ${JSON.stringify(payload.error)}`.slice(0, 400),
				recordedAt
			};
		}

		if (!payload.result) {
			return {
				skipped: false,
				dispositionStatus: input.dispositionStatus,
				syncState: 'sync_error',
				note: 'Indeed MCP response did not include a tool result.',
				recordedAt
			};
		}

		if (payload.result.isError) {
			return {
				skipped: false,
				dispositionStatus: input.dispositionStatus,
				syncState: 'sync_error',
				note: extractRpcText(payload.result) ?? 'Indeed MCP reported a tool error.',
				recordedAt
			};
		}

		const structured = parseRpcPayload(payload.result);
		const returnedStatus =
			typeof structured?.disposition_status === 'string'
				? structured.disposition_status
				: input.dispositionStatus;
		const syncState =
			structured?.sync_state === 'synced_remote' ? 'synced_remote' : 'recorded_local_only';
		const note =
			typeof structured?.note === 'string' && structured.note.trim().length > 0
				? structured.note.trim()
				: extractRpcText(payload.result) ?? 'Indeed disposition recorded.';

		return {
			skipped: false,
			dispositionStatus: returnedStatus,
			syncState,
			note,
			recordedAt
		};
	} catch (error) {
		return {
			skipped: false,
			dispositionStatus: input.dispositionStatus,
			syncState: 'sync_error',
			note:
				error instanceof Error
					? error.message.slice(0, 400)
					: 'Indeed MCP request failed unexpectedly.',
			recordedAt
		};
	}
}
