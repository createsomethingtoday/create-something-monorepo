// OAuth 2.1 authorization code + PKCE login against Webflow's remote MCP server.
// Registers a public client via dynamic client registration (RFC 7591) when the
// authorization server advertises a registration endpoint; otherwise reads
// WEBFLOW_MCP_CLIENT_ID. Tokens are stored with mode 0600 and never printed.

import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { access, chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const SERVER_URL = process.env.WEBFLOW_MCP_URL ?? "https://mcp.webflow.com/mcp";
export const CONFIG_DIR = join(homedir(), ".config", "webflow-template-cli");
export const TOKEN_PATH = join(CONFIG_DIR, "mcp-token.json");
const CLIENT_PATH = join(CONFIG_DIR, "mcp-client.json");
const PORT = Number(process.env.WEBFLOW_MCP_CALLBACK_PORT ?? 8976);
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

type AuthServerMeta = {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	registration_endpoint?: string;
	scopes_supported?: string[];
	code_challenge_methods_supported?: string[];
};

type StoredClient = { issuer: string; client_id: string; redirect_uri: string };

export type StoredToken = {
	server: string;
	issuer: string;
	token_endpoint: string;
	client_id: string;
	access_token: string;
	refresh_token?: string;
	token_type?: string;
	scope?: string;
	expires_at?: number;
};

const b64url = (buf: Buffer) => buf.toString("base64url");

async function writePrivate(path: string, data: unknown): Promise<void> {
	await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
	await writeFile(path, JSON.stringify(data, null, "\t"), { mode: 0o600 });
	await chmod(path, 0o600);
}

async function readJson<T>(path: string): Promise<T | undefined> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch {
		return undefined;
	}
}

// RFC 9728: protected resource metadata names the authorization server(s).
export async function discover(serverUrl: string): Promise<AuthServerMeta> {
	const u = new URL(serverUrl);
	const prm = await fetch(`${u.origin}/.well-known/oauth-protected-resource${u.pathname}`);
	if (!prm.ok) throw new Error(`protected resource metadata: HTTP ${prm.status}`);
	const { authorization_servers } = (await prm.json()) as { authorization_servers?: string[] };
	const issuer = authorization_servers?.[0];
	if (!issuer) throw new Error("protected resource metadata lists no authorization_servers");

	// RFC 8414: path-inserted well-known first, then root.
	const iu = new URL(issuer);
	const path = iu.pathname === "/" ? "" : iu.pathname;
	for (const url of [`${iu.origin}/.well-known/oauth-authorization-server${path}`, `${iu.origin}/.well-known/oauth-authorization-server`]) {
		const res = await fetch(url);
		if (res.ok) return (await res.json()) as AuthServerMeta;
	}
	throw new Error(`no authorization server metadata for ${issuer}`);
}

async function getClientId(meta: AuthServerMeta): Promise<string> {
	const envId = process.env.WEBFLOW_MCP_CLIENT_ID;
	if (envId) return envId;

	const cached = await readJson<StoredClient>(CLIENT_PATH);
	if (cached && cached.issuer === meta.issuer && cached.redirect_uri === REDIRECT_URI) return cached.client_id;

	if (!meta.registration_endpoint) {
		throw new Error(
			"No registration_endpoint advertised and WEBFLOW_MCP_CLIENT_ID is unset. A client id must be issued by Webflow.",
		);
	}
	const res = await fetch(meta.registration_endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		body: JSON.stringify({
			client_name: "Webflow Template Validate CLI (spike)",
			redirect_uris: [REDIRECT_URI],
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
		}),
	});
	if (!res.ok) throw new Error(`dynamic client registration failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
	const reg = (await res.json()) as { client_id: string; client_secret?: string };
	// A public client should not receive a secret; if one comes back we do not persist it.
	if (reg.client_secret) console.warn("warning: server issued a client_secret to a public client; not stored");
	await writePrivate(CLIENT_PATH, { issuer: meta.issuer, client_id: reg.client_id, redirect_uri: REDIRECT_URI } satisfies StoredClient);
	console.log(`registered public client (client id cached at ${CLIENT_PATH})`);
	return reg.client_id;
}

function waitForCallback(expectedState: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const server = createServer((req, res) => {
			const url = new URL(req.url ?? "/", REDIRECT_URI);
			if (url.pathname !== "/callback") {
				res.writeHead(404).end();
				return;
			}
			const done = (status: number, msg: string, err?: Error, code?: string) => {
				res.writeHead(status, { "Content-Type": "text/plain" }).end(msg);
				server.close();
				if (err) reject(err);
				else resolve(code as string);
			};
			const error = url.searchParams.get("error");
			if (error) return done(400, `Authorization failed: ${error}`, new Error(`authorization error: ${error} ${url.searchParams.get("error_description") ?? ""}`));
			if (url.searchParams.get("state") !== expectedState) return done(400, "State mismatch", new Error("state mismatch"));
			const code = url.searchParams.get("code");
			if (!code) return done(400, "Missing code", new Error("callback had no code"));
			done(200, "Webflow authorization complete. You can close this tab.", undefined, code);
		});
		server.on("error", reject);
		server.listen(PORT, "127.0.0.1");
		setTimeout(() => {
			server.close();
			reject(new Error("timed out waiting for the browser callback (5 min)"));
		}, 5 * 60_000).unref();
	});
}

async function tokenRequest(endpoint: string, body: Record<string, string>): Promise<Record<string, unknown>> {
	const res = await fetch(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
		body: new URLSearchParams(body),
	});
	const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
	if (!res.ok || typeof json.access_token !== "string") {
		throw new Error(`token endpoint HTTP ${res.status}: ${String(json.error ?? "")} ${String(json.error_description ?? "")}`.trim());
	}
	return json;
}

function toStored(base: Omit<StoredToken, "access_token">, json: Record<string, unknown>, prevRefresh?: string): StoredToken {
	return {
		...base,
		access_token: json.access_token as string,
		refresh_token: (json.refresh_token as string | undefined) ?? prevRefresh,
		token_type: json.token_type as string | undefined,
		scope: json.scope as string | undefined,
		expires_at: typeof json.expires_in === "number" ? Date.now() + json.expires_in * 1000 : undefined,
	};
}

/** True when a token file exists. Does not check expiry; loadToken refreshes. */
export async function hasToken(): Promise<boolean> {
	try {
		await access(TOKEN_PATH);
		return true;
	} catch {
		return false;
	}
}

/** Delete the token file only. The cached client registration stays. Returns whether a file was removed. */
export async function logout(): Promise<boolean> {
	const existed = await hasToken();
	await rm(TOKEN_PATH, { force: true });
	return existed;
}

// Load the stored token, refreshing it when expired.
export async function loadToken(): Promise<StoredToken> {
	const tok = await readJson<StoredToken>(TOKEN_PATH);
	if (!tok) throw new Error(`no token at ${TOKEN_PATH}; run 'wf-template-validate login' first`);
	if (!tok.expires_at || tok.expires_at - 60_000 > Date.now()) return tok;
	if (!tok.refresh_token) throw new Error("token expired and no refresh_token; run `wf-template-validate login` again");
	const json = await tokenRequest(tok.token_endpoint, {
		grant_type: "refresh_token",
		refresh_token: tok.refresh_token,
		client_id: tok.client_id,
		resource: tok.server,
	});
	const next = toStored(tok, json, tok.refresh_token);
	await writePrivate(TOKEN_PATH, next);
	return next;
}

export async function login(): Promise<void> {
	const meta = await discover(SERVER_URL);
	console.log(`authorization server: ${meta.issuer}`);
	if (!meta.code_challenge_methods_supported?.includes("S256")) throw new Error("server does not advertise PKCE S256");
	const clientId = await getClientId(meta);

	const verifier = b64url(randomBytes(32));
	const challenge = b64url(createHash("sha256").update(verifier).digest());
	const state = b64url(randomBytes(16));

	const auth = new URL(meta.authorization_endpoint);
	auth.search = new URLSearchParams({
		response_type: "code",
		client_id: clientId,
		redirect_uri: REDIRECT_URI,
		code_challenge: challenge,
		code_challenge_method: "S256",
		state,
		resource: SERVER_URL, // RFC 8707, required by the MCP authorization spec
		...(process.env.WEBFLOW_MCP_SCOPE ? { scope: process.env.WEBFLOW_MCP_SCOPE } : {}),
	}).toString();

	const callback = waitForCallback(state);
	console.log(`\nOpen this URL in a browser:\n\n${auth.toString()}\n`);
	console.log("Webflow shows a workspace and site picker. Choose the workspace that owns your template and select only");
	console.log("the template site you will submit. This CLI can read only the sites you select there. To change the");
	console.log("selection later, run `wf-template-validate logout`, then `wf-template-validate login` again.");
	console.log(`\nListening on ${REDIRECT_URI} ...`);
	const code = await callback;

	const json = await tokenRequest(meta.token_endpoint, {
		grant_type: "authorization_code",
		code,
		redirect_uri: REDIRECT_URI,
		client_id: clientId,
		code_verifier: verifier,
		resource: SERVER_URL,
	});
	const stored = toStored({ server: SERVER_URL, issuer: meta.issuer, token_endpoint: meta.token_endpoint, client_id: clientId }, json);
	await writePrivate(TOKEN_PATH, stored);
	console.log(`\ntoken stored at ${TOKEN_PATH} (mode 0600)`);
	console.log(`  scope: ${stored.scope ?? "(none returned)"}`);
	console.log(`  refresh token: ${stored.refresh_token ? "yes" : "no"}`);
	console.log(`  expires: ${stored.expires_at ? new Date(stored.expires_at).toISOString() : "(not stated)"} (refreshed automatically when a refresh token exists)`);
	console.log("\nNext: run `wf-template-validate sites` to find the --site id for `validate`.");
}
