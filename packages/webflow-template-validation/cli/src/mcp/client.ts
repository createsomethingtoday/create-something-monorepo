// Minimal MCP Streamable HTTP client plus the Webflow tool-call conventions
// (session_id, agent_id, context). Shared by call.ts and the headless collector.

export const PROTOCOL_VERSION = "2025-06-18";

type RpcResponse = { id?: number; result?: Record<string, unknown>; error?: { code: number; message: string } };

export class McpClient {
	private sessionId?: string;
	private toolSessionId = "start";
	private nextId = 1;
	private negotiated = false;

	constructor(
		private url: string,
		private token: string,
	) {}

	private headers(): Record<string, string> {
		const h: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
			Authorization: `Bearer ${this.token}`,
		};
		if (this.negotiated) h["MCP-Protocol-Version"] = PROTOCOL_VERSION;
		if (this.sessionId) h["Mcp-Session-Id"] = this.sessionId;
		return h;
	}

	private async post(body: Record<string, unknown>): Promise<Response> {
		const res = await fetch(this.url, { method: "POST", headers: this.headers(), body: JSON.stringify(body) });
		const sid = res.headers.get("mcp-session-id");
		if (sid) this.sessionId = sid;
		if (res.status === 401) throw new Error(`401 from server: ${res.headers.get("www-authenticate") ?? ""}; run 'wf-template-validate login' again`);
		return res;
	}

	async request(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
		const id = this.nextId++;
		const res = await this.post({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) });
		if (!res.ok) throw new Error(`${method}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
		const msg = await readResponse(res, id);
		if (msg.error) throw new Error(`${method}: JSON-RPC ${msg.error.code} ${msg.error.message}`);
		return msg.result ?? {};
	}

	async notify(method: string): Promise<void> {
		const res = await this.post({ jsonrpc: "2.0", method });
		await res.body?.cancel();
	}

	async initialize(): Promise<Record<string, unknown>> {
		const result = await this.request("initialize", {
			protocolVersion: PROTOCOL_VERSION,
			capabilities: {},
			clientInfo: { name: "webflow-template-validate", version: "0.1.0" },
		});
		this.negotiated = true;
		await this.notify("notifications/initialized");
		return result;
	}

	/**
	 * Call a Webflow MCP tool. Adds session_id ('start' first, then the ses_... id
	 * the server returns), agent_id, and context. Returns the raw tools/call result.
	 */
	async callToolRaw(name: string, args: Record<string, unknown>, opts: { agentId: string; context: string }): Promise<Record<string, unknown>> {
		const result = await this.request("tools/call", {
			name,
			arguments: { ...args, session_id: this.toolSessionId, agent_id: opts.agentId, context: opts.context },
		});
		this.toolSessionId = findSessionId(result) ?? this.toolSessionId;
		if (result.isError) throw new Error(`${name} returned isError: ${JSON.stringify(payload(result)).slice(0, 400)}`);
		return result;
	}

	/** callToolRaw, then the parsed payload. */
	async callTool(name: string, args: Record<string, unknown>, opts: { agentId: string; context: string }): Promise<unknown> {
		return payload(await this.callToolRaw(name, args, opts));
	}

	get hasSession(): boolean {
		return Boolean(this.sessionId);
	}

	get hasToolSession(): boolean {
		return this.toolSessionId !== "start";
	}
}

// Response is either a single JSON body or an SSE stream; return the message matching id.
async function readResponse(res: Response, id: number): Promise<RpcResponse> {
	const type = res.headers.get("content-type") ?? "";
	if (type.includes("application/json")) return (await res.json()) as RpcResponse;
	if (!type.includes("text/event-stream") || !res.body) throw new Error(`unexpected content-type: ${type}`);

	const decoder = new TextDecoder();
	let buffer = "";
	for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
		buffer += decoder.decode(chunk, { stream: true });
		let sep: number;
		while ((sep = buffer.search(/\r?\n\r?\n/)) !== -1) {
			const event = buffer.slice(0, sep);
			buffer = buffer.slice(sep).replace(/^\r?\n\r?\n/, "");
			const data = event
				.split(/\r?\n/)
				.filter((l) => l.startsWith("data:"))
				.map((l) => l.slice(5).trimStart())
				.join("\n");
			if (!data) continue;
			const msg = JSON.parse(data) as RpcResponse;
			if (msg.id === id) {
				await res.body.cancel().catch(() => {});
				return msg;
			}
		}
	}
	throw new Error(`stream ended without a response for id ${id}`);
}

export function textBlocks(result: Record<string, unknown>): string[] {
	return ((result.content as { type: string; text?: string }[] | undefined) ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "");
}

// Tool results carry structuredContent and/or text blocks; return parsed JSON when possible.
export function payload(result: Record<string, unknown>): unknown {
	if (result.structuredContent) return result.structuredContent;
	const texts = textBlocks(result);
	for (const t of texts) {
		try {
			return JSON.parse(t);
		} catch {
			/* not JSON, keep looking */
		}
	}
	return texts.join("\n");
}

function findSessionId(result: Record<string, unknown>): string | undefined {
	const m = JSON.stringify(result).match(/ses_[0-9A-Za-z]{27}/);
	return m?.[0];
}

// Walk an unknown payload and collect the first array of objects having a key.
export function findArray(node: unknown, key: string): Record<string, unknown>[] | undefined {
	if (Array.isArray(node)) {
		if (node.length && node.every((n) => n && typeof n === "object" && key in n)) return node as Record<string, unknown>[];
		for (const n of node) {
			const r = findArray(n, key);
			if (r) return r;
		}
	} else if (node && typeof node === "object") {
		for (const v of Object.values(node)) {
			const r = findArray(v, key);
			if (r) return r;
		}
	}
	return undefined;
}
