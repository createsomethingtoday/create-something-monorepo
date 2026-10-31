// Probe OAuth metadata (RFC 9728 / RFC 8414) and unauthenticated MCP initialize
// for each candidate Webflow remote MCP server URL.

export const CANDIDATES = [
	"https://developers.webflow.com/_mcp/server",
	"https://mcp.webflow.com/mcp",
	"https://mcp.webflow.com/sse",
];

type Json = Record<string, unknown>;

async function getJson(url: string): Promise<{ status: number; body?: Json; note?: string }> {
	try {
		const res = await fetch(url, { headers: { Accept: "application/json" }, redirect: "follow" });
		const text = await res.text();
		try {
			return { status: res.status, body: JSON.parse(text) as Json };
		} catch {
			return { status: res.status, note: `non-JSON (${res.headers.get("content-type") ?? "?"}): ${text.slice(0, 120).replace(/\s+/g, " ")}` };
		}
	} catch (err) {
		return { status: 0, note: `fetch failed: ${(err as Error).message}` };
	}
}

// RFC 9728 well-known URIs: insert well-known segment between host and path, plus root fallback.
function wellKnownUrls(resource: string, suffix: string): string[] {
	const u = new URL(resource);
	const path = u.pathname === "/" ? "" : u.pathname;
	const urls = [`${u.origin}/.well-known/${suffix}${path}`, `${u.origin}/.well-known/${suffix}`];
	return [...new Set(urls)];
}

function summarizeAs(meta: Json): Record<string, unknown> {
	return {
		issuer: meta.issuer,
		authorization_endpoint: meta.authorization_endpoint,
		token_endpoint: meta.token_endpoint,
		registration_endpoint: meta.registration_endpoint ?? "(none)",
		scopes_supported: meta.scopes_supported ?? "(not advertised)",
		code_challenge_methods_supported: meta.code_challenge_methods_supported ?? "(not advertised)",
		grant_types_supported: meta.grant_types_supported,
		token_endpoint_auth_methods_supported: meta.token_endpoint_auth_methods_supported,
		client_id_metadata_document_supported: meta.client_id_metadata_document_supported,
	};
}

export async function discoverAuthServer(issuer: string): Promise<Json | undefined> {
	const u = new URL(issuer);
	const path = u.pathname === "/" ? "" : u.pathname;
	const tries = [
		`${u.origin}/.well-known/oauth-authorization-server${path}`,
		`${u.origin}/.well-known/openid-configuration${path}`,
		`${u.origin}${path}/.well-known/openid-configuration`,
	];
	for (const url of [...new Set(tries)]) {
		const r = await getJson(url);
		if (r.status === 200 && r.body?.authorization_endpoint) return { ...r.body, _source: url };
	}
	return undefined;
}

async function probe(serverUrl: string): Promise<void> {
	console.log(`\n=== ${serverUrl}`);

	// 1. Unauthenticated initialize
	try {
		const res = await fetch(serverUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-06-18" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "webflow-template-validate-discover", version: "0.0.0" } },
			}),
		});
		const body = (await res.text()).slice(0, 200).replace(/\s+/g, " ");
		console.log(`initialize POST: HTTP ${res.status} ${res.statusText}`);
		console.log(`  WWW-Authenticate: ${res.headers.get("www-authenticate") ?? "(absent)"}`);
		console.log(`  content-type: ${res.headers.get("content-type") ?? "(absent)"}`);
		console.log(`  body[0..200]: ${body || "(empty)"}`);
	} catch (err) {
		console.log(`initialize POST failed: ${(err as Error).message}`);
	}

	// 2. Protected resource metadata
	const issuers = new Set<string>();
	for (const url of wellKnownUrls(serverUrl, "oauth-protected-resource")) {
		const r = await getJson(url);
		console.log(`GET ${url} -> ${r.status}${r.note ? ` ${r.note}` : ""}`);
		if (r.status === 200 && r.body) {
			console.log(`  resource: ${String(r.body.resource)}`);
			console.log(`  authorization_servers: ${JSON.stringify(r.body.authorization_servers)}`);
			console.log(`  scopes_supported: ${JSON.stringify(r.body.scopes_supported ?? "(not advertised)")}`);
			for (const s of (r.body.authorization_servers as string[] | undefined) ?? []) issuers.add(s);
		}
	}

	// 3. Authorization server metadata at the server origin
	for (const url of wellKnownUrls(serverUrl, "oauth-authorization-server")) {
		const r = await getJson(url);
		console.log(`GET ${url} -> ${r.status}${r.note ? ` ${r.note}` : ""}`);
		if (r.status === 200 && r.body?.authorization_endpoint) {
			console.log(JSON.stringify(summarizeAs(r.body), null, 2).replace(/^/gm, "  "));
		}
	}

	// 4. Authorization servers named by protected-resource metadata
	for (const issuer of issuers) {
		const meta = await discoverAuthServer(issuer);
		console.log(`auth server ${issuer}: ${meta ? `metadata from ${String(meta._source)}` : "no metadata found"}`);
		if (meta) console.log(JSON.stringify(summarizeAs(meta), null, 2).replace(/^/gm, "  "));
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	console.log(`discover.ts run at ${new Date().toISOString()}`);
	for (const url of CANDIDATES) await probe(url);
}
