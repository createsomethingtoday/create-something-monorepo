import { diffInventories } from './diff';
import { lookupScopeEndpoints } from './endpoints';
import { fetchRecentCommits, fetchScopesFile } from './github';
import { ParseError, parseScopesFile } from './parser';
import { captureConsent } from './probe';
import {
	formatMessage,
	isSlackConfigured,
	postImageToSlack,
	postToSlack,
	type SlackDelivery,
} from './slack';
import type { Inventory } from './types';

export interface Env {
	STATE: KVNamespace;
	GITHUB_TOKEN: string;
	ADMIN_TOKEN: string;
	SLACK_BOT_TOKEN?: string;
	SLACK_CHANNEL_ID?: string;
	SLACK_WEBHOOK_URL?: string;
	GITHUB_REPO: string;
	GITHUB_REF: string;
	SCOPES_PATH: string;
	CF_ACCOUNT_ID: string;
	BROWSER_RENDERING_TOKEN?: string;
	PROBE_CLIENT_ID?: string;
	PROBE_SESSION_COOKIE?: string;
}

const STATE_KEY = 'state:inventory';

function slackDelivery(env: Env): SlackDelivery {
	return {
		botToken: env.SLACK_BOT_TOKEN,
		channelId: env.SLACK_CHANNEL_ID,
		webhookUrl: env.SLACK_WEBHOOK_URL,
	};
}
/** Overlap added to the commit-context window so a commit is never missed at the boundary. */
const COMMIT_WINDOW_OVERLAP_MS = 6 * 60 * 60 * 1000;
/** GitHub code search allows ~10 req/min — bound per-run endpoint lookups. */
const MAX_ENDPOINT_LOOKUPS = 8;

interface CheckResult {
	ok: boolean;
	seeded?: boolean;
	error?: string;
	fileSha?: string;
	scopeCount?: number;
	categoryCount?: number;
	changes?: unknown[];
	commits?: unknown[];
	text?: string;
	posted?: boolean;
	note?: string;
}

async function runCheck(env: Env, opts: { dryRun: boolean; trigger: string }): Promise<CheckResult> {
	const { content, sha } = await fetchScopesFile(env);

	let parsed: ReturnType<typeof parseScopesFile>;
	try {
		parsed = parseScopesFile(content);
	} catch (err) {
		if (!(err instanceof ParseError)) throw err;
		// Alert once per file version, then stay quiet until the parser is fixed —
		// never diff a half-parsed file (it would read as mass scope removal).
		const alertKey = `alert:parse-failure:${sha}`;
		if (!opts.dryRun && !(await env.STATE.get(alertKey))) {
			await postToSlack(
				slackDelivery(env),
				`:warning: webflow-scope-watcher could not parse scopes.ts (${err.message}). ` +
					'Scope-change detection is paused until the parser is updated.'
			);
			await env.STATE.put(alertKey, new Date().toISOString(), {
				expirationTtl: 60 * 60 * 24 * 30,
			});
		}
		return { ok: false, error: `parse failure: ${err.message}`, fileSha: sha };
	}

	const now = new Date().toISOString();
	const scopeCount = Object.keys(parsed.scopes).length;
	const categoryCount = Object.keys(parsed.categories).length;
	const next: Inventory = { ...parsed, fileSha: sha, checkedAt: now };

	const prevRaw = await env.STATE.get(STATE_KEY);
	if (!prevRaw) {
		// First run seeds silently — announcing 47 pre-existing scopes would be noise.
		if (!opts.dryRun) {
			await env.STATE.put(STATE_KEY, JSON.stringify(next));
			await env.STATE.put(
				`history:${now}`,
				JSON.stringify({ type: 'seeded', at: now, scopeCount, categoryCount, fileSha: sha })
			);
		}
		return { ok: true, seeded: true, fileSha: sha, scopeCount, categoryCount };
	}

	const prev = JSON.parse(prevRaw) as Inventory;
	if (prev.fileSha === sha) {
		if (!opts.dryRun) {
			await env.STATE.put(STATE_KEY, JSON.stringify({ ...prev, checkedAt: now }));
		}
		return { ok: true, fileSha: sha, scopeCount, categoryCount, changes: [] };
	}

	const changes = diffInventories(prev, next);
	if (changes.length === 0) {
		if (!opts.dryRun) await env.STATE.put(STATE_KEY, JSON.stringify(next));
		return {
			ok: true,
			fileSha: sha,
			scopeCount,
			categoryCount,
			changes: [],
			note: 'file changed but no scope-level differences',
		};
	}

	const since = new Date(
		new Date(prev.checkedAt).getTime() - COMMIT_WINDOW_OVERLAP_MS
	).toISOString();
	const commits = await fetchRecentCommits(env, since);

	// Enrich new/un-gated scopes with the endpoints they guard. Capped because
	// GitHub code search allows ~10 requests/min; overflow scopes still alert,
	// just without the endpoint map.
	const enrichable = changes.filter(
		(c) => (c.type === 'scope_added' || c.type === 'scope_ungated') && c.scope
	);
	for (const change of enrichable.slice(0, MAX_ENDPOINT_LOOKUPS)) {
		change.endpoints = await lookupScopeEndpoints(env, change.scope!.constant);
	}

	const text = formatMessage(changes, commits, next.categories, env.GITHUB_REPO, env.SCOPES_PATH);

	let posted = false;
	if (!opts.dryRun) {
		const result = await postToSlack(slackDelivery(env), text);
		posted = result.posted;
		await env.STATE.put(
			`history:${now}`,
			JSON.stringify({
				type: 'changes',
				at: now,
				trigger: opts.trigger,
				changes,
				commits,
				posted,
				postError: result.error ?? null,
				slackConfigured: isSlackConfigured(slackDelivery(env)),
				text,
			})
		);
		await env.STATE.put(STATE_KEY, JSON.stringify(next));
	}
	return { ok: true, fileSha: sha, scopeCount, categoryCount, changes, commits, text, posted };
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body, null, 2), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

function isAuthorized(request: Request, env: Env): boolean {
	return request.headers.get('Authorization') === `Bearer ${env.ADMIN_TOKEN}`;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Consent captures are served publicly at unguessable 32-hex ids so Slack
		// image blocks can fetch them; everything else under /api/* stays authed.
		const consentMatch = url.pathname.match(/^\/consent\/([0-9a-f]{32})\.png$/);
		if (consentMatch && request.method === 'GET') {
			const png = await env.STATE.get(`consent:${consentMatch[1]}`, { type: 'arrayBuffer' });
			if (!png) return json({ error: 'not found' }, 404);
			return new Response(png, {
				headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
			});
		}

		if (url.pathname === '/' && request.method === 'GET') {
			const raw = await env.STATE.get(STATE_KEY);
			const state = raw ? (JSON.parse(raw) as Inventory) : null;
			return json({
				ok: true,
				service: 'webflow-scope-watcher',
				seeded: Boolean(state),
				scopeCount: state ? Object.keys(state.scopes).length : 0,
				categoryCount: state ? Object.keys(state.categories).length : 0,
				lastChecked: state?.checkedAt ?? null,
				slackConfigured: isSlackConfigured(slackDelivery(env)),
			});
		}

		if (!isAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);

		if (url.pathname === '/api/check' && request.method === 'POST') {
			const dryRun = url.searchParams.get('dryRun') === '1';
			return json(await runCheck(env, { dryRun, trigger: 'manual' }));
		}

		if (url.pathname === '/api/scopes' && request.method === 'GET') {
			const raw = await env.STATE.get(STATE_KEY);
			return raw
				? new Response(raw, { headers: { 'Content-Type': 'application/json' } })
				: json({ error: 'not seeded yet — POST /api/check first' }, 404);
		}

		if (url.pathname === '/api/history' && request.method === 'GET') {
			const list = await env.STATE.list({ prefix: 'history:' });
			const keys = list.keys.map((k) => k.name).sort().reverse().slice(0, 20);
			const entries = await Promise.all(
				keys.map(async (name) => {
					const value = await env.STATE.get(name);
					return value ? JSON.parse(value) : null;
				})
			);
			return json({ entries: entries.filter(Boolean) });
		}

		if (url.pathname === '/api/probe-capture' && request.method === 'POST') {
			const scopes = (url.searchParams.get('scopes') ?? '')
				.split(/[,\s]+/)
				.map((s) => s.trim())
				.filter(Boolean);
			const capture = await captureConsent(env, {
				scopes,
				clientId: url.searchParams.get('client_id') ?? undefined,
			});
			const imageUrl = capture.imageId
				? `${url.origin}/consent/${capture.imageId}.png`
				: undefined;

			let posted: { posted: boolean; error?: string } | undefined;
			if (url.searchParams.get('post') === '1' && capture.ok && imageUrl) {
				if (capture.loginDetected) {
					// Never post a login page as if it were a consent screen.
					posted = {
						posted: false,
						error:
							'login page detected — PROBE_SESSION_COOKIE is missing or expired; refresh it and retry',
					};
				} else {
					const label = scopes.length > 0 ? scopes.join(', ') : 'the app’s configured scopes';
					posted = await postImageToSlack(
						slackDelivery(env),
						`:frame_with_picture: Consent screen for ${scopes.length > 0 ? '`' + label + '`' : label} (Scope Probe)`,
						imageUrl,
						`OAuth consent screen for ${label}`
					);
				}
			}
			return json({ ...capture, imageUrl, ...(posted ? { slack: posted } : {}) });
		}

		if (url.pathname === '/api/scope-endpoints' && request.method === 'GET') {
			const constant = url.searchParams.get('constant') ?? '';
			if (!/^[A-Z][A-Z0-9_]*$/.test(constant)) {
				return json({ error: 'pass ?constant=<SCOPES constant>, e.g. AI_WRITE' }, 400);
			}
			return json(await lookupScopeEndpoints(env, constant));
		}

		if (url.pathname === '/api/announce' && request.method === 'POST') {
			const body = (await request.json().catch(() => null)) as { text?: string } | null;
			if (!body?.text) return json({ error: 'body must be {"text": "..."}' }, 400);
			const result = await postToSlack(slackDelivery(env), body.text);
			if (result.posted) {
				const now = new Date().toISOString();
				await env.STATE.put(
					`history:${now}`,
					JSON.stringify({ type: 'announcement', at: now, posted: true, text: body.text })
				);
			}
			return json({ ...result });
		}

		if (url.pathname === '/api/test-slack' && request.method === 'POST') {
			const result = await postToSlack(
				slackDelivery(env),
				':white_check_mark: webflow-scope-watcher connected — this channel now gets an alert ' +
					'whenever OAuth scopes are added, removed, or un-gated in the webflow/webflow registry ' +
					'(checked hourly). No more finding out from consent-screen screenshots.'
			);
			return json({ ...result, slackConfigured: isSlackConfigured(slackDelivery(env)) });
		}

		return json({ error: 'not found' }, 404);
	},

	async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(runCheck(env, { dryRun: false, trigger: 'cron' }));
	},
};
