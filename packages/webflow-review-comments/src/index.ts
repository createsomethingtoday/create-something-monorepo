/**
 * webflow-review-comments: review feedback threads for Marketplace assets,
 * stored per version. Replaces the Zendesk ticket per version.
 *
 * Server-to-server only. Each caller (the review MCPs, the Asset Dashboard,
 * later the Creator Hub in webflow/webflow) has its own key in the
 * `CALLER_KEYS` secret, and each key carries one fixed role:
 *
 *   [{ "name": "template-review-mcp", "role": "reviewer", "scope": "template", "key": "…" },
 *    { "name": "app-review-mcp",      "role": "reviewer", "scope": "app",      "key": "…" },
 *    { "name": "asset-dashboard",     "role": "creator",  "key": "…" }]
 *
 * `scope` is optional. A scoped key reaches only the threads opened under its
 * scope, so one review program cannot read or change another's. Give every
 * reviewer key a scope; leave the creator surface unscoped.
 *
 * Callers send `Authorization: Bearer <key>` and the person they act for in
 * `X-Actor-Email`. `X-Actor-Role` is optional; when sent, it must match the
 * key's role. The caller must already have verified that person's session
 * and, for creators, that they own the asset. Only a reviewer opens a thread
 * on a version; creators reply to, and read, threads that already exist.
 *
 * Endpoints:
 *   GET    /v1/versions/:versionRef/comments        thread for one version (creators add ?assetRef=)
 *   POST   /v1/versions/:versionRef/comments        add a comment
 *   POST   /v1/versions/:versionRef/release         release drafts and email the creator (reviewer);
 *                                                   with `expected`, only when the drafts are still the ones the reviewer read
 *   GET    /v1/assets/:assetRef/comments            all versions of an asset
 *   PATCH  /v1/comments/:id                         edit own unreleased comment (reviewer)
 *   DELETE /v1/comments/:id                         delete own unreleased comment (reviewer)
 *   POST   /v1/comments/:id/resolution              set resolution (reviewer)
 *   GET    /                                        health
 */

import {
	CommentError,
	createComment,
	deleteComment,
	editComment,
	isActorRole,
	isRef,
	isScope,
	listByAsset,
	listByVersion,
	parseActor,
	parseEdit,
	parseNewComment,
	parseResolution,
	releaseVersion,
	expectedDraftsGuard,
	parseExpectedDrafts,
	requireCreatorVersionAccess,
	setResolution
} from './comments';
import type { Actor, ActorRole } from './comments';
import { deliverPending, notifyConfig, parseNotice, queueStatement } from './notify';
import type { NotificationResult } from './notify';

export interface Env {
	DB: D1Database;
	/** JSON array of { name, role, key }. Missing or malformed fails closed. */
	CALLER_KEYS?: string;
	/** Knock secret key. With ASSET_DASHBOARD_URL it turns on the "feedback is ready" email. */
	KNOCK_API_KEY?: string;
	/** Knock workflow to trigger. Defaults to marketplace-review-feedback-released. */
	KNOCK_FEEDBACK_WORKFLOW_KEY?: string;
	/** https address of the Asset Dashboard; the email links to the asset's thread there. */
	ASSET_DASHBOARD_URL?: string;
}

interface Caller {
	name: string;
	role: ActorRole;
	scope: string | null;
}

const MAX_BODY_BYTES = 64 * 1024;
const MIN_KEY_LENGTH = 32;

function ok(data: unknown, status = 200): Response {
	return Response.json({ success: true, data }, { status });
}

function fail(status: number, error: string, correlationId?: string): Response {
	return Response.json({ success: false, error, ...(correlationId ? { correlationId } : {}) }, { status });
}

function timingSafeEqual(a: string, b: string): boolean {
	const encoder = new TextEncoder();
	const left = encoder.encode(a);
	const right = encoder.encode(b);
	if (left.byteLength !== right.byteLength) return false;
	let diff = 0;
	for (let i = 0; i < left.byteLength; i++) diff |= left[i] ^ right[i];
	return diff === 0;
}

/** Valid entries only; a short key, unknown role or malformed scope is skipped, never trusted. */
function parseCallerKeys(raw: string | undefined): Array<Caller & { key: string }> {
	if (!raw) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed)) return [];
	return parsed.flatMap((entry) => {
		const { name, role, key, scope } = (entry ?? {}) as Record<string, unknown>;
		if (typeof name !== 'string' || !name || !isActorRole(role)) return [];
		if (typeof key !== 'string' || key.length < MIN_KEY_LENGTH) return [];
		// A scope that fails to parse must not widen the key to every thread.
		if (scope !== undefined && scope !== null && !isScope(scope)) return [];
		return [{ name, role, key, scope: (scope as string | undefined) ?? null }];
	});
}

function resolveCaller(request: Request, env: Env): Caller | null {
	const header = request.headers.get('Authorization') ?? '';
	let match: Caller | null = null;
	// Compare against every key so timing does not reveal which entry matched.
	for (const entry of parseCallerKeys(env.CALLER_KEYS)) {
		if (timingSafeEqual(header, `Bearer ${entry.key}`) && !match) {
			match = { name: entry.name, role: entry.role, scope: entry.scope };
		}
	}
	return match;
}

async function readJson(request: Request): Promise<unknown> {
	const raw = await request.text();
	if (raw.length > MAX_BODY_BYTES) throw new CommentError(400, 'request body too large');
	if (!raw) return {};
	try {
		return JSON.parse(raw);
	} catch {
		throw new CommentError(400, 'request body must be JSON');
	}
}

function requireReviewer(actor: Actor): void {
	if (actor.role !== 'reviewer') throw new CommentError(403, 'reviewer role required');
}

/**
 * Release the drafts and email the creator. The email is queued in the same
 * transaction as the release, then sent. A send that fails is reported in
 * `notification` and retried when the caller repeats the release.
 */
async function release(request: Request, env: Env, versionRef: string, actor: Actor) {
	const config = notifyConfig(env);
	const input = await readJson(request);
	const notice = parseNotice(input);
	const expected = parseExpectedDrafts(input);
	const now = new Date();

	const guard = expected ? expectedDraftsGuard(versionRef, actor, expected) : undefined;
	const queued = config && notice ? queueStatement(env.DB, versionRef, notice, actor, now.toISOString(), guard) : undefined;
	const { released } = await releaseVersion(env.DB, versionRef, actor, now.toISOString(), queued, expected);

	let notification: NotificationResult;
	if (!config) {
		notification = { status: 'none', reason: 'not_configured' };
	} else {
		try {
			const delivery = await deliverPending(env.DB, config, versionRef, actor, now);
			if (delivery.pending > 0) {
				notification = { status: 'failed', sent: delivery.sent, pending: delivery.pending, error: delivery.error ?? 'send failed' };
			} else if (delivery.sent > 0) {
				notification = { status: 'sent', sent: delivery.sent };
			} else if (delivery.inProgress > 0) {
				notification = { status: 'none', reason: 'send_in_progress' };
			} else {
				notification = { status: 'none', reason: released > 0 ? 'no_recipient' : 'nothing_released' };
			}
		} catch (cause) {
			// The drafts are released. A fault in the email step must not turn that into an error.
			console.error(
				JSON.stringify({
					level: 'error',
					message: 'review notification delivery failed',
					error: cause instanceof Error ? cause.message : String(cause)
				})
			);
			notification = { status: 'failed', sent: 0, pending: 0, error: 'email step failed' };
		}
	}
	return { released, notification };
}

async function route(request: Request, env: Env, actor: Actor): Promise<Response> {
	const { pathname, searchParams } = new URL(request.url);
	const [, version, collection, ref, action, ...rest] = pathname.split('/');
	if (version !== 'v1' || !isRef(ref) || rest.length) return fail(404, 'not found');

	if (collection === 'versions' && action === 'comments') {
		if (request.method === 'GET') {
			if (actor.role === 'creator') await requireCreatorVersionAccess(env.DB, ref, searchParams.get('assetRef'));
			return ok(await listByVersion(env.DB, ref, actor));
		}
		if (request.method === 'POST') {
			const input = parseNewComment(await readJson(request), actor);
			return ok(await createComment(env.DB, ref, input, actor), 201);
		}
	}

	if (collection === 'versions' && action === 'release' && request.method === 'POST') {
		requireReviewer(actor);
		return ok(await release(request, env, ref, actor));
	}

	if (collection === 'assets' && action === 'comments' && request.method === 'GET') {
		return ok(await listByAsset(env.DB, ref, actor));
	}

	if (collection === 'comments' && action === undefined) {
		if (request.method === 'PATCH') {
			requireReviewer(actor);
			return ok(await editComment(env.DB, ref, parseEdit(await readJson(request)), actor));
		}
		if (request.method === 'DELETE') {
			requireReviewer(actor);
			return ok(await deleteComment(env.DB, ref, actor));
		}
	}

	if (collection === 'comments' && action === 'resolution' && request.method === 'POST') {
		requireReviewer(actor);
		return ok(await setResolution(env.DB, ref, parseResolution(await readJson(request)), actor));
	}

	return fail(404, 'not found');
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url);
		if (pathname === '/') return ok({ service: 'webflow-review-comments' });

		const caller = resolveCaller(request, env);
		if (!caller) return fail(401, 'unauthorized');

		const claimedRole = request.headers.get('X-Actor-Role');
		if (claimedRole && claimedRole !== caller.role) return fail(403, 'X-Actor-Role does not match this key');

		const actor = parseActor(request.headers.get('X-Actor-Email'), caller.role, caller.scope);
		if (!actor) return fail(400, 'X-Actor-Email is required');

		try {
			return await route(request, env, actor);
		} catch (error) {
			if (error instanceof CommentError) return fail(error.status, error.message);
			const correlationId = `cs-${crypto.randomUUID()}`;
			// No actor email or comment body in logs: both are creator data.
			console.error(
				JSON.stringify({
					level: 'error',
					message: 'review comment request failed',
					correlationId,
					caller: caller.name,
					path: pathname,
					error: error instanceof Error ? error.message : String(error)
				})
			);
			return fail(500, 'internal error', correlationId);
		}
	}
} satisfies ExportedHandler<Env>;
