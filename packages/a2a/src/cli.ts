#!/usr/bin/env node
import { recoveryAction } from './connection';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { constants } from 'node:fs';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://a2a.createsomething.agency';
const ISSUER = 'https://id.createsomething.space';
const RESOURCE = `${DEFAULT_BASE_URL}/mcp`;
const REDIRECT_URI = 'http://127.0.0.1:42678/callback';
const OWNER_SCOPES = 'openid email profile offline_access mcp a2a:read a2a:write a2a:admin';
const HELP = `CREATE SOMETHING A2A — owner-authorized agent correspondence

Usage: pnpm --filter @create-something/a2a cli <command> [options]

  login                                      Open Identity sign-in with owner consent
  logout                                     Remove this device's saved session
  status                                     Show authenticated connection facts
  diagnose                                   Show anonymous transport facts
  whoami                                     Show the authenticated owner
  agents                                     List your inbox identities
  register --name NAME                       Register your pilot inbox
  allow --agent ID --sender ID               Approve a counterpart sender
  revoke --grant ID                          Revoke a counterpart approval
  pause --agent ID | resume --agent ID        Pause or resume an inbox
  send --from ID --to ID --text TEXT          Send a request
       [--thread ID] [--key IDEMPOTENCY_KEY]
  inbox --agent ID [--after CURSOR]           List new messages
  read --message ID                          Read a message
  claim --message ID                         Acquire a processing lease
  finish --message ID --claim-token TOKEN
         --state completed|rejected|approval_required
  subscriptions --agent ID                   List event subscriptions
  unsubscribe --subscription ID              Stop an event subscription
  deliveries --agent ID                      Inspect delivery outcomes
  replay --delivery ID                       Request an authorized replay

Global: --base-url URL (default ${DEFAULT_BASE_URL}), --help
Only HTTPS is accepted, except an explicitly selected loopback HTTP service.
Login requests owner administration consent through CREATE SOMETHING Identity.
Credentials are saved privately; A2A_TOKEN overrides the saved session.
Send keys appear in output. Retain the key and reuse the identical request after
an uncertain write. The CLI never automatically retries a product write.
`;

class CliError extends Error {}
interface PublicConfig { issuer: string; resource: string; clientId: string; cliRedirectUri: string }
interface Session {
	version: 1; baseUrl: string; issuer: string; resource: string; clientId: string;
	accessToken: string; refreshToken?: string; expiresAt: number;
}
interface TokenResponse { access_token: string; refresh_token?: string; expires_in: number }
export interface CliOptions {
	fetch?: typeof globalThis.fetch;
	env?: Record<string, string | undefined>;
	out?: (value: string) => void;
	err?: (value: string) => void;
	/** Explicit seams for offline qualification; never accepted as CLI arguments. */
	sessionPath?: string;
	openBrowser?: (url: string) => Promise<void>;
	loginTimeoutMs?: number;
	sessionLockTimeoutMs?: number;
	now?: () => number;
}
interface Parsed { command: string; flags: Map<string, string>; help: boolean }
function parse(argv: string[]): Parsed {
	const flags = new Map<string, string>();
	let command = '', help = false;
	for (let i = 0; i < argv.length; i++) {
		const value = argv[i];
		if (value === '--help' || value === '-h') { help = true; continue; }
		if (!value.startsWith('--')) {
			if (command) throw new CliError('Unexpected argument. Use --help for command syntax.');
			command = value; continue;
		}
		const equal = value.indexOf('=');
		const name = value.slice(2, equal < 0 ? undefined : equal);
		const argument = equal < 0 ? argv[++i] : value.slice(equal + 1);
		if (!name || argument === undefined || (equal < 0 && argument.startsWith('--')) || flags.has(name)) throw new CliError('Each option requires one value and may appear once.');
		flags.set(name, argument);
	}
	return { command: command || 'help', flags, help };
}
function baseUrl(value: string, explicit: boolean): string {
	let url: URL;
	try { url = new URL(value); } catch { throw new CliError('Invalid --base-url.'); }
	const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
	if ((url.protocol !== 'https:' && !(explicit && loopback && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
		throw new CliError('--base-url must be an HTTPS origin, or explicit loopback HTTP origin.');
	}
	return url.origin;
}
function requireFlag(flags: Map<string, string>, name: string): string {
	const value = flags.get(name);
	if (!value?.trim()) throw new CliError(`Missing --${name}.`);
	return value;
}
function allowFlags(flags: Map<string, string>, allowed: string[]): void {
	for (const key of flags.keys()) if (key !== 'base-url' && !allowed.includes(key)) throw new CliError('Unknown option for this command. Use --help for command syntax.');
}
function id(value: string): string { return encodeURIComponent(value); }
function isMissing(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'; }
async function readSession(path: string, expectedBase: string): Promise<Session> {
	let file;
	try {
		file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
		const stat = await file.stat();
		if (!stat.isFile() || (stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid())) throw new CliError('Saved session must be owned by you with mode 0600. Run login again.');
		const raw = JSON.parse(await file.readFile('utf8')) as Partial<Session>;
		if (raw.version !== 1 || raw.baseUrl !== expectedBase || raw.issuer !== ISSUER || raw.resource !== RESOURCE || !raw.clientId || typeof raw.accessToken !== 'string' || !raw.accessToken || typeof raw.expiresAt !== 'number' || !Number.isFinite(raw.expiresAt) || (raw.refreshToken !== undefined && typeof raw.refreshToken !== 'string')) throw new CliError('Saved session does not match this service. Run login for the selected base URL.');
		return raw as Session;
	} catch (cause) {
		if (cause instanceof CliError) throw cause;
		throw new CliError(isMissing(cause) ? 'Run login first, or explicitly set A2A_TOKEN.' : 'Saved session could not be read. Run login again.');
	} finally { await file?.close(); }
}
async function saveSession(path: string, session: Session): Promise<void> {
	const temporary = `${path}.${randomUUID()}.tmp`;
	let file;
	try {
		await mkdir(dirname(path), { recursive: true, mode: 0o700 });
		file = await open(temporary, 'wx', 0o600);
		await file.writeFile(JSON.stringify(session), 'utf8');
		await file.sync();
		await file.close(); file = undefined;
		await rename(temporary, path);
	} catch { throw new CliError('Session could not be saved privately.'); }
	finally { await file?.close(); await unlink(temporary).catch(() => {}); }
}
/** All credential writers share this exclusive filesystem lock, including other
 * CLI processes. A crashed holder fails closed: never steal its lock and risk
 * replaying a refresh grant whose outcome is unknown.
 */
async function withSessionLock<T>(path: string, timeoutMs: number, operation: () => Promise<T>): Promise<T> {
	const lockPath = `${path}.lock`, deadline = Date.now() + Math.min(Math.max(timeoutMs, 1), 20000);
	await mkdir(dirname(path), { recursive: true, mode: 0o700 });
	let lock;
	while (!lock) {
		try { lock = await open(lockPath, 'wx', 0o600); }
		catch (cause) {
			if (!cause || typeof cause !== 'object' || !('code' in cause) || cause.code !== 'EEXIST') throw new CliError('Could not lock the saved session privately.');
			const remaining = deadline - Date.now();
			if (remaining <= 0) throw new CliError(`Another CLI command holds ${lockPath}. Retry after it finishes. If it exited, confirm no A2A command is running, remove that lock file, and run login again.`);
			await new Promise(resolve => setTimeout(resolve, Math.min(50, remaining)));
		}
	}
	try {
		await lock.writeFile(JSON.stringify({ pid: process.pid }), 'utf8');
		return await operation();
	} finally {
		await lock.close();
		try { await unlink(lockPath); } catch (cause) { if (!isMissing(cause)) throw new CliError('The saved session lock could not be released. Confirm no A2A command is running before removing it.'); }
	}
}
async function browser(url: string): Promise<void> {
	const command = process.platform === 'darwin' ? 'open' : process.platform === 'linux' ? 'xdg-open' : null;
	if (!command) throw new CliError('Automatic browser opening is supported on macOS and Linux.');
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, [url], { stdio: 'ignore', shell: false });
		child.once('error', () => reject(new CliError('Could not open a browser for sign-in.')));
		child.once('spawn', () => { child.unref(); resolve(); });
	});
}
async function closeServer(server: Server): Promise<void> {
	await new Promise<void>(resolve => {
		server.close(() => resolve());
		server.closeAllConnections();
	});
}
function statesMatch(actual: string | null, expected: string): boolean {
	if (actual === null) return false;
	const a = Buffer.from(actual), b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

/** The loopback receiver exists only for the bounded sign-in attempt. */
async function receiveCode(authorizeUrl: URL, state: string, opener: (url: string) => Promise<void>, timeoutMs: number): Promise<string> {
	let resolveCode!: (code: string) => void, rejectCode!: (error: Error) => void;
	const code = new Promise<string>((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
	// A rejection may precede completion of browser opening. Attach a handler now.
	void code.catch(() => {});
	let accepted = false;
	const server = createServer((request, response) => {
		response.setHeader('cache-control', 'no-store');
		response.setHeader('content-type', 'text/plain; charset=utf-8');
		response.setHeader('referrer-policy', 'no-referrer');
		response.setHeader('content-security-policy', "default-src 'none'");
		let url: URL;
		try { url = new URL(request.url ?? '/', REDIRECT_URI); } catch { response.writeHead(400).end('Invalid callback.'); return; }
		if (request.method !== 'GET' || request.headers.host !== '127.0.0.1:42678' || url.pathname !== '/callback') { response.writeHead(404).end('Unavailable'); return; }
		if (accepted || !statesMatch(url.searchParams.get('state'), state)) { response.writeHead(400).end('Sign-in state did not match.'); return; }
		if (url.searchParams.has('error')) { accepted = true; response.writeHead(400).end('Sign-in was not approved.'); rejectCode(new CliError('Identity sign-in was not approved.')); return; }
		const value = url.searchParams.get('code');
		if (!value || value.length > 4096) { response.writeHead(400).end('Authorization code is missing.'); return; }
		accepted = true;
		response.writeHead(200).end('Sign-in received. You can return to the terminal.');
		resolveCode(value);
	});
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await new Promise<void>((resolve, reject) => {
			server.once('error', () => reject(new CliError('Cannot start sign-in callback on 127.0.0.1:42678. Close another sign-in attempt and retry.')));
			server.listen(42678, '127.0.0.1', () => resolve());
		});
		timer = setTimeout(() => rejectCode(new CliError('Sign-in timed out after two minutes. Run login to try again.')), Math.min(Math.max(timeoutMs, 1), 120000));
		void Promise.resolve().then(() => opener(authorizeUrl.href)).catch(() => rejectCode(new CliError('Could not open a browser for sign-in.')));
		return await code;
	} finally {
		if (timer) clearTimeout(timer);
		await closeServer(server);
	}
}

export async function runCli(argv: string[], options: CliOptions = {}): Promise<number> {
	const out = options.out ?? (value => process.stdout.write(`${value}\n`));
	const err = options.err ?? (value => process.stderr.write(`${value}\n`));
	const request = options.fetch ?? globalThis.fetch;
	const env = options.env ?? process.env;
	const sessionPath = options.sessionPath ?? join(homedir(), '.config', 'create-something', 'a2a', 'session.json');
	const now = options.now ?? Date.now;
	let reconciliationKey: string | undefined;
	try {
		const parsed = parse(argv), { command, flags } = parsed;
		if (parsed.help || command === 'help') { out(HELP); return 0; }
		const base = baseUrl(flags.get('base-url') ?? DEFAULT_BASE_URL, flags.has('base-url'));
		async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
			let response: Response;
			try { response = await request(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(15000) }); }
			catch { throw new CliError('Network request failed. Check connectivity before reconciling or retrying.'); }
			if (!response.ok) {
				let code = '';
				try { const data = await response.json() as { error?: { code?: unknown } | string; code?: unknown }; const value = typeof data.error === 'object' ? data.error?.code : data.error ?? data.code; if (typeof value === 'string' && /^[a-z_]{1,64}$/.test(value)) code = `, ${value}`; } catch { /* No response bodies or credentials in errors. */ }
				throw new CliError(`Request failed (${response.status}${code}). Recovery: ${JSON.stringify(recoveryAction({status:response.status,write:init?.method==='POST',uncertain:response.status>=500,retryAfter:response.headers.get('retry-after')}))}`);
			}
			if (response.status === 204) return { ok: true };
			try { return await response.json(); } catch { throw new CliError('Service returned an invalid JSON response.'); }
		}
		if(command==='diagnose'){allowFlags(flags,[]);out(JSON.stringify(await fetchJson(`${base}/.well-known/a2a-connection`),null,2));return 0;}
		async function exchange(fields: Record<string, string>): Promise<TokenResponse> {
			const raw = await fetchJson(`${ISSUER}/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) }) as Partial<TokenResponse>;
			if (!raw || typeof raw.access_token !== 'string' || !raw.access_token || typeof raw.expires_in !== 'number' || !Number.isFinite(raw.expires_in) || raw.expires_in <= 0 || (raw.refresh_token !== undefined && typeof raw.refresh_token !== 'string')) throw new CliError('Identity returned an invalid token response. Run login again.');
			return raw as TokenResponse;
		}
		if (command === 'logout') {
			allowFlags(flags, []);
			await withSessionLock(sessionPath, options.sessionLockTimeoutMs ?? 20000, async () => {
				try { await unlink(sessionPath); } catch (cause) { if (!isMissing(cause)) throw new CliError('Local session could not be removed.'); }
			});
			out(env.A2A_TOKEN ? 'Local session removed. A2A_TOKEN remains set in your environment.' : 'Local session removed.'); return 0;
		}
		if (command === 'login') {
			allowFlags(flags, []);
			const config = await fetchJson(`${base}/api/v1/config`) as Partial<PublicConfig>;
			if (!config || config.issuer !== ISSUER || config.resource !== RESOURCE || config.cliRedirectUri !== REDIRECT_URI || typeof config.clientId !== 'string' || !config.clientId || config.clientId === 'pending-registration') throw new CliError('Service Identity configuration is unavailable or does not match the pilot.');
			const verifier = randomBytes(32).toString('base64url'), state = randomBytes(32).toString('base64url');
			const authorization = new URL(`${ISSUER}/oauth/authorize`);
			authorization.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: REDIRECT_URI, resource: RESOURCE, scope: OWNER_SCOPES, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
			out('Opening CREATE SOMETHING Identity for owner consent…');
			const code = await receiveCode(authorization, state, options.openBrowser ?? browser, options.loginTimeoutMs ?? 120000);
			await withSessionLock(sessionPath, options.sessionLockTimeoutMs ?? 20000, async () => {
				const tokens = await exchange({ grant_type: 'authorization_code', code, client_id: config.clientId!, redirect_uri: REDIRECT_URI, resource: RESOURCE, code_verifier: verifier });
				await saveSession(sessionPath, { version: 1, baseUrl: base, issuer: ISSUER, resource: RESOURCE, clientId: config.clientId!, accessToken: tokens.access_token, ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}), expiresAt: now() + tokens.expires_in * 1000 });
			});
			out('Signed in. Credentials saved privately on this device.'); return 0;
		}

		let route = '', method = 'GET';
		let body: unknown;
		switch (command) {
			case 'status': allowFlags(flags, []); route = '/connection'; break;
			case 'whoami': allowFlags(flags, []); route = '/me'; break;
			case 'agents': allowFlags(flags, []); route = '/agents'; break;
			case 'register': allowFlags(flags, ['name']); route = '/agents'; method = 'POST'; body = { name: requireFlag(flags, 'name') }; break;
			case 'allow': allowFlags(flags, ['agent', 'sender']); route = '/grants'; method = 'POST'; body = { agentId: requireFlag(flags, 'agent'), senderAgentId: requireFlag(flags, 'sender') }; break;
			case 'revoke': allowFlags(flags, ['grant']); route = `/grants/${id(requireFlag(flags, 'grant'))}`; method = 'DELETE'; break;
			case 'pause': case 'resume': allowFlags(flags, ['agent']); route = `/agents/${id(requireFlag(flags, 'agent'))}`; method = 'PATCH'; body = { paused: command === 'pause' }; break;
			case 'send':
				allowFlags(flags, ['from', 'to', 'text', 'thread', 'key']);
				body = { fromAgentId: requireFlag(flags, 'from'), toAgentId: requireFlag(flags, 'to'), text: requireFlag(flags, 'text'), ...(flags.has('thread') ? { threadId: requireFlag(flags, 'thread') } : {}), idempotencyKey: flags.has('key') ? requireFlag(flags, 'key') : randomUUID() };
				reconciliationKey = (body as { idempotencyKey: string }).idempotencyKey; route = '/messages'; method = 'POST'; break;
			case 'inbox': {
				allowFlags(flags, ['agent', 'after']);
				const query = new URLSearchParams({ agentId: requireFlag(flags, 'agent') });
				if (flags.has('after')) { const after = requireFlag(flags, 'after'); if (!/^\d+$/.test(after) || !Number.isSafeInteger(Number(after))) throw new CliError('--after must be a nonnegative integer cursor.'); query.set('after', after); }
				route = `/messages?${query}`; break;
			}
			case 'read': case 'claim': allowFlags(flags, ['message']); route = `/messages/${id(requireFlag(flags, 'message'))}${command === 'claim' ? '/claim' : ''}`; if (command === 'claim') method = 'POST'; break;
			case 'finish': {
				allowFlags(flags, ['message', 'claim-token', 'state']); const state = requireFlag(flags, 'state');
				if (!['completed', 'rejected', 'approval_required'].includes(state)) throw new CliError('--state must be completed, rejected, or approval_required.');
				route = `/messages/${id(requireFlag(flags, 'message'))}/finish`; method = 'POST'; body = { claimToken: requireFlag(flags, 'claim-token'), state }; break;
			}
			case 'subscriptions': case 'deliveries': allowFlags(flags, ['agent']); route = `/${command}?${new URLSearchParams({ agentId: requireFlag(flags, 'agent') })}`; break;
			case 'unsubscribe': allowFlags(flags, ['subscription']); route = `/subscriptions/${id(requireFlag(flags, 'subscription'))}`; method = 'DELETE'; break;
			case 'replay': allowFlags(flags, ['delivery']); route = `/deliveries/${id(requireFlag(flags, 'delivery'))}/replay`; method = 'POST'; break;
			default: throw new CliError('Unknown command. Use --help for command syntax.');
		}
		let token = env.A2A_TOKEN;
		if (!token) {
			let session = await readSession(sessionPath, base);
			if (session.expiresAt <= now() + 60000) {
				session = await withSessionLock(sessionPath, options.sessionLockTimeoutMs ?? 20000, async () => {
					const current = await readSession(sessionPath, base);
					if (current.expiresAt > now() + 60000) return current;
					if (!current.refreshToken) throw new CliError('Session expired. Run login again.');
					// A lost response may already have consumed this one-use grant.
					// Remove it from disk before exchange so a later command cannot replay it.
					await saveSession(sessionPath, { ...current, refreshToken: undefined });
					try {
						const refreshed = await exchange({ grant_type: 'refresh_token', refresh_token: current.refreshToken, client_id: current.clientId, resource: RESOURCE });
						const replacement = { ...current, accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token, expiresAt: now() + refreshed.expires_in * 1000 };
						await saveSession(sessionPath, replacement);
						return replacement;
					} catch { throw new CliError('Session refresh could not be confirmed. Run login again.'); }
				});
			}
			token = session.accessToken;
		}
		const headers: Record<string, string> = { authorization: `Bearer ${token}` };
		if (body !== undefined) headers['content-type'] = 'application/json';
		const result = await fetchJson(`${base}/api/v1${route}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
		out(JSON.stringify(reconciliationKey ? { ...(result as object), idempotencyKey: reconciliationKey } : result, null, 2));
		return 0;
	} catch (cause) {
		err(cause instanceof CliError ? cause.message : 'Command failed. No credentials were printed.');
		if (reconciliationKey) err(`Reconciliation key: ${reconciliationKey}. Retain it and reuse the identical send request after checking its outcome.`);
		return 1;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await runCli(process.argv.slice(2));
