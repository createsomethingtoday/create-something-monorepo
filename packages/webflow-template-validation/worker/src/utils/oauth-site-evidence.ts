/**
 * OAuth site-access evidence: proves a command-line client can read a site by
 * calling Webflow's MCP server with the client's OAuth token. The worker acts
 * as an MCP client (initialize, then data_sites_tool get_site) and accepts the
 * evidence only when the returned site id equals the submitted site id.
 *
 * The raw token is used for the outbound requests only. It is never logged,
 * stored, or included in an error message.
 */

export const DEFAULT_VALIDATOR_MCP_SERVER_URL = 'https://mcp.webflow.com/mcp';
const MCP_PROTOCOL_VERSION = '2025-06-18';
const MCP_TIMEOUT_MS = 15_000;
const EVIDENCE_CONTEXT =
	"The template validation worker reads this site's details to confirm the submitting client has access before recording validation results.";

export interface OauthSiteAccessVerified {
	ok: true;
	siteId: string;
	workspaceId: string | null;
	shortName: string | null;
	publishedHosts: string[];
}

export interface OauthSiteAccessFailed {
	ok: false;
	reason: string;
}

export type OauthSiteAccessResult = OauthSiteAccessVerified | OauthSiteAccessFailed;

interface RpcMessage {
	id?: number;
	result?: Record<string, unknown>;
	error?: { code?: number; message?: string };
}

interface McpSite {
	id: string;
	workspaceId?: unknown;
	shortName?: unknown;
	customDomains?: unknown;
}

function getMcpServerUrl(env: unknown): string {
	const value = (env as Record<string, unknown> | undefined)?.VALIDATOR_MCP_SERVER_URL;
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : DEFAULT_VALIDATOR_MCP_SERVER_URL;
}

function randomShortId(): string {
	const bytes = new Uint8Array(4);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Replace every occurrence of the secret so it cannot reach a log or response. */
export function redactSecret(text: string, secret: string): string {
	return secret ? text.split(secret).join('[redacted]') : text;
}

export async function verifyOauthSiteAccess(
	env: unknown,
	siteId: string,
	accessToken: string
): Promise<OauthSiteAccessResult> {
	const url = getMcpServerUrl(env);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), MCP_TIMEOUT_MS);
	let sessionId: string | undefined;
	// The initialize response fixes the version for the rest of the connection.
	let protocolVersion = MCP_PROTOCOL_VERSION;

	const post = async (body: Record<string, unknown>): Promise<Response> => {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			Accept: 'application/json, text/event-stream',
			'MCP-Protocol-Version': protocolVersion
		};
		if (sessionId) headers['Mcp-Session-Id'] = sessionId;
		const response = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: controller.signal
		});
		const issued = response.headers.get('mcp-session-id');
		if (issued) sessionId = issued;
		return response;
	};

	const request = async (id: number, method: string, params: Record<string, unknown>) => {
		const response = await post({ jsonrpc: '2.0', id, method, params });
		if (!response.ok) {
			await response.body?.cancel().catch(() => undefined);
			throw new Error(`${method} returned HTTP ${response.status}`);
		}
		const message = await readRpcMessage(response, id);
		if (message.error) throw new Error(`${method} returned JSON-RPC error ${message.error.code ?? ''}`.trim());
		return message.result ?? {};
	};

	try {
		const initialized = await request(1, 'initialize', {
			protocolVersion: MCP_PROTOCOL_VERSION,
			capabilities: {},
			clientInfo: { name: 'webflow-template-validation-worker', version: '1.0.0' }
		});
		if (typeof initialized.protocolVersion === 'string' && initialized.protocolVersion.trim() !== '') {
			protocolVersion = initialized.protocolVersion.trim();
		}
		const notified = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
		await notified.body?.cancel().catch(() => undefined);

		const result = await request(2, 'tools/call', {
			name: 'data_sites_tool',
			arguments: {
				actions: [{ label: 'site', get_site: { site_id: siteId } }],
				session_id: 'start',
				agent_id: `validation-worker|evidence|${randomShortId()}`,
				context: EVIDENCE_CONTEXT
			}
		});
		if (result.isError) return { ok: false, reason: 'get_site returned an error result' };

		const site = findSite(toolPayload(result));
		if (!site) return { ok: false, reason: 'get_site result did not include a site' };
		if (site.id !== siteId) return { ok: false, reason: 'get_site returned a different site id' };

		const shortName = typeof site.shortName === 'string' && site.shortName.trim() !== '' ? site.shortName.trim() : null;
		return {
			ok: true,
			siteId: site.id,
			workspaceId: typeof site.workspaceId === 'string' ? site.workspaceId : null,
			shortName,
			publishedHosts: collectPublishedHosts(shortName, site.customDomains)
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, reason: redactSecret(message, accessToken) };
	} finally {
		clearTimeout(timer);
	}
}

/** Normalize a URL or bare host to a lowercase hostname, or null. */
export function normalizePublishedHost(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed === '') return null;
	try {
		const parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
		const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
		return host.includes('.') ? host : null;
	} catch {
		return null;
	}
}

function collectPublishedHosts(shortName: string | null, customDomains: unknown): string[] {
	const hosts = new Set<string>();
	if (shortName) {
		const host = normalizePublishedHost(`${shortName}.webflow.io`);
		if (host) hosts.add(host);
	}
	if (Array.isArray(customDomains)) {
		for (const domain of customDomains) {
			const host = normalizePublishedHost((domain as { url?: unknown } | null)?.url);
			if (host) hosts.add(host);
		}
	}
	return [...hosts];
}

// A response is either one JSON body or an SSE stream; return the message for id.
async function readRpcMessage(response: Response, id: number): Promise<RpcMessage> {
	const type = response.headers.get('content-type') ?? '';
	if (type.includes('application/json')) return (await response.json()) as RpcMessage;
	if (!type.includes('text/event-stream') || !response.body) {
		throw new Error(`unexpected content-type: ${type}`);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	const consume = (event: string): RpcMessage | null => {
		const data = event
			.split(/\r?\n/)
			.filter((line) => line.startsWith('data:'))
			.map((line) => line.slice(5).trimStart())
			.join('\n');
		if (!data) return null;
		const message = JSON.parse(data) as RpcMessage;
		return message.id === id ? message : null;
	};

	for (;;) {
		const { done, value } = await reader.read();
		if (value) buffer += decoder.decode(value, { stream: !done });
		let separator: number;
		while ((separator = buffer.search(/\r?\n\r?\n/)) !== -1) {
			const event = buffer.slice(0, separator);
			buffer = buffer.slice(separator).replace(/^\r?\n\r?\n/, '');
			const message = consume(event);
			if (message) {
				await reader.cancel().catch(() => undefined);
				return message;
			}
		}
		if (done) {
			const message = buffer.trim() !== '' ? consume(buffer) : null;
			if (message) return message;
			throw new Error(`stream ended without a response for id ${id}`);
		}
	}
}

// Tool results carry structuredContent and/or text blocks; return parsed JSON when possible.
function toolPayload(result: Record<string, unknown>): unknown {
	if (result.structuredContent) return result.structuredContent;
	const blocks = Array.isArray(result.content) ? (result.content as Array<{ type?: string; text?: string }>) : [];
	for (const block of blocks) {
		if (block.type !== 'text' || typeof block.text !== 'string') continue;
		try {
			return JSON.parse(block.text);
		} catch {
			// Not JSON; keep looking.
		}
	}
	return null;
}

// Find the get_site result: `{ label, action, result: { id, ... } }`, possibly in an array.
function findSite(node: unknown, depth = 0): McpSite | null {
	if (depth > 6 || !node || typeof node !== 'object') return null;
	if (Array.isArray(node)) {
		for (const item of node) {
			const site = findSite(item, depth + 1);
			if (site) return site;
		}
		return null;
	}
	const record = node as Record<string, unknown>;
	const result = record.result as Record<string, unknown> | undefined;
	if (result && typeof result === 'object' && typeof result.id === 'string') return result as unknown as McpSite;
	if (typeof record.id === 'string' && ('shortName' in record || 'workspaceId' in record)) {
		return record as unknown as McpSite;
	}
	for (const value of Object.values(record)) {
		const site = findSite(value, depth + 1);
		if (site) return site;
	}
	return null;
}
