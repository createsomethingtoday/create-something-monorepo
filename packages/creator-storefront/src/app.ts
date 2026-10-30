/**
 * HTTP surface (CONTRACT.md §6).
 *
 *   GET  /health                                      liveness only
 *   GET  /health/ready                                configuration readiness (names only)
 *   GET  /v1/storefronts/:creatorSlug                 public, read model + live inventory, no-store
 *   GET  /v1/owner/storefront                         owner
 *   PUT  /v1/owner/storefront                         owner, Idempotency-Key
 *   PUT  /v1/owner/storefront/selections              owner, Idempotency-Key
 *   GET  /v1/owner/storefront/preview                 owner
 *   POST /v1/owner/storefront/publish                 owner, Idempotency-Key
 *   POST /v1/owner/storefront/unpublish               owner, Idempotency-Key
 *   POST /v1/staff/creators/:creatorId/suspend        staff, Idempotency-Key
 *   POST /v1/staff/creators/:creatorId/clear-suspension
 *   POST /v1/staff/creators/:creatorId/move-slug
 *
 * Owner calls carry OWNER_API_KEY plus the dashboard-authenticated email in
 * X-Storefront-Actor-Email. The service resolves the Creator itself (exactly
 * one match, else 404/409); an owner caller can never name a creator ID.
 * Staff calls carry STAFF_API_KEY. Neither key works on the other's routes.
 */
import { readiness, requireAuthoringConfig, requirePublicConfig } from './config';
import type { Env } from './config';
import type { WriterOp } from './dispatch';
import { StorefrontError, isStorefrontError } from './errors';
import type { AuthoringStore, ReadModel, TemplateInventory } from './ports';
import { toPublicDto } from './public-dto';
import type { CreatorRef } from './types';

export interface AppServices {
	readModel(env: Env): ReadModel;
	/** Public-read inventory check: short timeout, fails closed. */
	publicInventory(env: Env): TemplateInventory;
	store(env: Env): AuthoringStore;
	/** Runs an operation in the Creator's single serialized writer. Throws StorefrontError. */
	runWriter(env: Env, op: WriterOp, creator: CreatorRef, input: WriterInput): Promise<unknown>;
}

export interface WriterInput {
	idempotencyKey: string | null;
	expectedDraftVersion?: unknown;
	fields?: unknown;
	selections?: unknown;
}

const PRIVATE_HEADERS = {
	'Content-Type': 'application/json; charset=utf-8',
	'Cache-Control': 'no-store, private',
	'X-Content-Type-Options': 'nosniff'
};

/** No edge or downstream cache in this slice, so a committed read model is immediately public. */
const PUBLIC_HEADERS = {
	'Content-Type': 'application/json; charset=utf-8',
	'Cache-Control': 'no-store',
	'Access-Control-Allow-Origin': '*',
	'X-Content-Type-Options': 'nosniff'
};

const SLUG = /^[a-z0-9][a-z0-9-]{0,127}$/;
const RECORD_ID = /^rec[A-Za-z0-9]{14}$/;
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const MAX_BODY_BYTES = 16 * 1024;

function json(body: unknown, status = 200, headers: Record<string, string> = PRIVATE_HEADERS): Response {
	return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(error: unknown): Response {
	if (isStorefrontError(error)) return json(error.toJSON(), error.status);
	console.error('[creator-storefront] unexpected error', error instanceof Error ? error.message : 'unknown');
	return json({ error: 'internal_error', message: 'Unexpected error' }, 500);
}

async function digest(value: string): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

/** Constant-time comparison of SHA-256 digests. */
async function keyMatches(presented: string, expected: string): Promise<boolean> {
	const [a, b] = await Promise.all([digest(presented), digest(expected)]);
	let diff = 0;
	for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
	return diff === 0;
}

function bearer(request: Request): string | null {
	const header = request.headers.get('Authorization') ?? '';
	const match = /^Bearer\s+(\S+)$/.exec(header);
	return match ? match[1] : null;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
	const text = await request.text();
	if (text.length > MAX_BODY_BYTES) throw new StorefrontError('invalid_request', 'Request body is too large');
	if (!text) return {};
	try {
		const parsed = JSON.parse(text) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
		return parsed as Record<string, unknown>;
	} catch {
		throw new StorefrontError('invalid_request', 'Request body must be a JSON object');
	}
}

async function resolveOwner(request: Request, env: Env, services: AppServices): Promise<CreatorRef> {
	const config = requireAuthoringConfig(env);
	const presented = bearer(request);
	if (!presented) throw new StorefrontError('unauthorized', 'Missing service credential');
	if (!(await keyMatches(presented, config.ownerApiKey))) {
		// The staff key is a different scope, not a superset.
		throw new StorefrontError(
			(await keyMatches(presented, config.staffApiKey)) ? 'forbidden' : 'unauthorized',
			'Owner routes require the owner credential'
		);
	}
	const email = request.headers.get('X-Storefront-Actor-Email')?.trim().toLowerCase() ?? '';
	if (!EMAIL.test(email)) throw new StorefrontError('unauthorized', 'Missing authenticated actor');

	const matches = await services.store(env).findCreatorsByEmail(email);
	if (matches.length === 0) throw new StorefrontError('creator_not_found', 'No Creator matches this account');
	if (matches.length > 1) {
		throw new StorefrontError('ambiguous_creator', 'More than one Creator matches this account; contact Marketplace support');
	}
	return matches[0];
}

async function resolveStaffTarget(request: Request, env: Env, services: AppServices, creatorId: string): Promise<CreatorRef> {
	const config = requireAuthoringConfig(env);
	const presented = bearer(request);
	if (!presented) throw new StorefrontError('unauthorized', 'Missing service credential');
	if (!(await keyMatches(presented, config.staffApiKey))) {
		throw new StorefrontError(
			(await keyMatches(presented, config.ownerApiKey)) ? 'forbidden' : 'unauthorized',
			'Staff routes require the staff credential'
		);
	}
	if (!RECORD_ID.test(creatorId)) throw new StorefrontError('invalid_request', 'Invalid creator ID');
	const creator = await services.store(env).readCreator(creatorId);
	return { id: creator.id, slug: creator.slug };
}

/**
 * Reads the durable read model (never Airtable), then re-checks the pinned
 * templates against current template-search inventory and drops any that are
 * no longer listed. If inventory cannot answer, the read fails closed (503)
 * rather than serving unverified pins.
 */
async function publicStorefront(env: Env, services: AppServices, slug: string): Promise<Response> {
	requirePublicConfig(env);
	if (!SLUG.test(slug)) return json({ error: 'not_found' }, 404, PUBLIC_HEADERS);
	const row = await services.readModel(env).get(slug);
	if (!row || row.state !== 'live' || !row.snapshot) return json({ error: 'not_found' }, 404, PUBLIC_HEADERS);

	const dto = toPublicDto(row);
	if (dto.selections.length) {
		let present: Set<string>;
		try {
			present = await services.publicInventory(env).presentSlugs(dto.selections.map((s) => s.templateSlug));
		} catch (error) {
			const failure = isStorefrontError(error)
				? error
				: new StorefrontError('upstream_unavailable', 'Template inventory check failed', { cause: error });
			return json({ error: 'inventory_unavailable', message: failure.message }, 503, PUBLIC_HEADERS);
		}
		dto.selections = dto.selections.filter((s) => present.has(s.templateSlug));
	}
	return json(dto, 200, { ...PUBLIC_HEADERS, ETag: `W/"${row.revision}"` });
}

export async function handleRequest(request: Request, env: Env, services: AppServices): Promise<Response> {
	const url = new URL(request.url);
	const path = url.pathname.replace(/\/+$/, '') || '/';
	const method = request.method;

	try {
		if (path === '/health' && method === 'GET') return json({ ok: true });
		if (path === '/health/ready' && method === 'GET') {
			const report = readiness(env);
			const ready = report.public.length === 0 && report.authoring.length === 0;
			return json({ ready, public: report.public, authoring: report.authoring }, ready ? 200 : 503);
		}

		const publicMatch = /^\/v1\/storefronts\/([^/]+)$/.exec(path);
		if (publicMatch) {
			if (method !== 'GET') return json({ error: 'method_not_allowed' }, 405, PUBLIC_HEADERS);
			return await publicStorefront(env, services, decodeURIComponent(publicMatch[1]).toLowerCase());
		}

		const idempotencyKey = request.headers.get('Idempotency-Key');

		if (path.startsWith('/v1/owner/storefront')) {
			const sub = path.slice('/v1/owner/storefront'.length);
			const routes: Record<string, WriterOp> = {
				'GET ': 'view',
				'PUT ': 'saveDraft',
				'PUT /selections': 'replaceSelections',
				'GET /preview': 'preview',
				'POST /publish': 'publish',
				'POST /unpublish': 'unpublish'
			};
			const op = routes[`${method} ${sub}`];
			if (!op) return json({ error: 'not_found' }, 404);
			const creator = await resolveOwner(request, env, services);
			const body = method === 'GET' ? {} : await readBody(request);
			const value = await services.runWriter(env, op, creator, {
				idempotencyKey,
				expectedDraftVersion: body.expectedDraftVersion,
				fields: body.fields,
				selections: body.selections
			});
			return json(value, statusFor(value));
		}

		const staffMatch = /^\/v1\/staff\/creators\/([^/]+)\/(suspend|clear-suspension|move-slug)$/.exec(path);
		if (staffMatch) {
			if (method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
			const ops: Record<string, WriterOp> = {
				suspend: 'suspend',
				'clear-suspension': 'clearSuspension',
				'move-slug': 'moveSlug'
			};
			const creator = await resolveStaffTarget(request, env, services, staffMatch[1]);
			const value = await services.runWriter(env, ops[staffMatch[2]], creator, { idempotencyKey });
			return json(value, statusFor(value));
		}

		return json({ error: 'not_found' }, 404);
	} catch (error) {
		return errorResponse(error);
	}
}

/** Publication receipts that are still propagating return 202. */
function statusFor(value: unknown): number {
	if (value && typeof value === 'object' && 'state' in value && (value as { state: string }).state === 'propagating') {
		return 202;
	}
	return 200;
}
