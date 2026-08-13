import type { RequestHandler } from './$types';

type JsonRpcId = string | number | null;

type A2ATextPart = {
	kind?: unknown;
	text?: unknown;
};

type A2ARequest = {
	jsonrpc?: unknown;
	id?: unknown;
	method?: unknown;
	params?: {
		message?: {
			kind?: unknown;
			role?: unknown;
			messageId?: unknown;
			contextId?: unknown;
			parts?: unknown;
		};
	};
};

function rpcId(value: unknown): JsonRpcId {
	return typeof value === 'string' || typeof value === 'number' ? value : null;
}

function randomId(prefix: string): string {
	if (typeof crypto.randomUUID === 'function') return `${prefix}_${crypto.randomUUID()}`;
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function jsonRpcError(id: JsonRpcId, code: number, message: string, status = 200): Response {
	return Response.json(
		{ jsonrpc: '2.0', id, error: { code, message } },
		{ status, headers: { 'cache-control': 'no-store' } }
	);
}

function textFromMessage(request: A2ARequest): string | null {
	const message = request.params?.message;
	if (request.jsonrpc !== '2.0' || request.method !== 'message/send') return null;
	if (message?.kind !== 'message' || message.role !== 'user' || !Array.isArray(message.parts)) return null;

	const text = (message.parts as A2ATextPart[])
		.find((part) => part?.kind === 'text' && typeof part.text === 'string')
		?.text;
	return typeof text === 'string' && text.trim() ? text.trim() : null;
}

function forwardHeaders(request: Request): Headers {
	const headers = new Headers({ 'content-type': 'application/json' });
	for (const name of ['cf-connecting-ip', 'user-agent']) {
		const value = request.headers.get(name);
		if (value) headers.set(name, value);
	}
	return headers;
}

/**
 * A2A JSON-RPC bridge for the existing public Atlas mapping agent.
 * It forwards a text-only request through the same rate-limited route rather
 * than creating a second execution path or claiming workflow authority.
 */
export const POST: RequestHandler = async ({ request, fetch }) => {
	let body: A2ARequest | null;
	try {
		const parsed = await request.json();
		body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as A2ARequest) : null;
	} catch {
		return jsonRpcError(null, -32700, 'Parse error', 400);
	}
	if (!body) return jsonRpcError(null, -32600, 'Invalid Request', 400);

	const id = rpcId(body.id);
	const message = textFromMessage(body);
	if (!message) {
		return jsonRpcError(id, -32600, 'Use message/send with one non-empty user text part.', 400);
	}

	let atlasResponse: Response;
	try {
		atlasResponse = await fetch(new Request(new URL('/api/atlas/public-agent', request.url), {
			method: 'POST',
			headers: forwardHeaders(request),
			body: JSON.stringify({ message })
		}));
	} catch {
		return jsonRpcError(id, -32603, 'The public workflow mapper is unavailable.', 503);
	}

	const atlasBody = (await atlasResponse.json().catch(() => null)) as
		| { reply?: unknown; [key: string]: unknown }
		| null;
	if (!atlasResponse.ok || typeof atlasBody?.reply !== 'string') {
		return jsonRpcError(id, -32000, 'The public workflow mapper rejected this request.', atlasResponse.status);
	}

	const requestMessage = body.params?.message;
	const contextId = typeof requestMessage?.contextId === 'string' ? requestMessage.contextId : randomId('context');
	return Response.json(
		{
			jsonrpc: '2.0',
			id,
			result: {
				kind: 'task',
				id: randomId('task'),
				contextId,
				status: {
					state: 'completed',
					message: {
						kind: 'message',
						messageId: randomId('message'),
						role: 'agent',
						parts: [
							{ kind: 'text', text: atlasBody.reply },
							{ kind: 'data', data: atlasBody }
						]
					}
				}
			}
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
