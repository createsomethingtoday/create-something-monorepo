import { json, type RequestEvent } from '@sveltejs/kit';
import {
	getAirtableClient,
	type Asset,
	type AssetUpdateData,
	type CreatorPublicProfile
} from './airtable';
import {
	hashApiKey,
	isApiKeyExpired,
	isWellFormedApiKey,
	type ApiKeyScope
} from './api-keys';
import { applyTemplateViews } from './template-views';
import { sanitizeLongDescriptionHtml } from '@create-something/webflow-dashboard-core/long-description';
import { shouldCreateAssetVersionForChanges } from '$lib/utils/asset-version-changes';

/**
 * Creator API (v1): the shared layer behind /api/v1/creator/*.
 *
 * A request authenticates with a Bearer API key, never a session. Every piece
 * of state on the request path lives in D1 (verified keys, rate limits, usage,
 * response data), so API traffic reaches Airtable at most once per cache
 * lifetime per creator. D1 is strongly consistent, which makes a revoked key
 * stop working on the next request.
 */

export const CREATOR_API_VERSION = 'v1';

/** Requests one creator may make per clock hour, across all of their keys. */
export const CREATOR_API_QUOTA = { requests: 100, windowSeconds: 3600 } as const;

/**
 * Key lookups per hour one address may send to Airtable. Only requests whose
 * key is not cached count, so a working integration stays far below this; it
 * exists to stop a guessing client from spending the Airtable rate limit.
 */
const KEY_LOOKUP_QUOTA = { requests: 120, windowSeconds: 3600 } as const;

/**
 * Key lookups per second across all callers. Airtable allows the whole base 5
 * requests per second and locks it for 30 seconds when that is exceeded, so
 * this keeps most of that allowance for the dashboard even if many addresses
 * send unknown keys at once.
 */
const GLOBAL_KEY_LOOKUP_QUOTA = { requests: 2, windowSeconds: 1 } as const;

const VERIFIED_KEY_TTL_SECONDS = 300;
/**
 * A revoked key leaves a marker in place of its cached verification. A request
 * that verified the key just before the revoke cannot write over the marker,
 * so it cannot put the key back in the cache.
 */
const REVOKED_KEY_TTL_SECONDS = 3600;
const REVOKED_KEY_MARKER = '{"revoked":true}';
/** Rate-limit windows are kept this long; it must exceed every window length. */
const STALE_WINDOW_SECONDS = 24 * 60 * 60;
/** Documented in the API reference: responses can trail the dashboard by this long. */
export const CREATOR_API_DATA_TTL_SECONDS = 300;
/** D1 caps a value near 2 MB; larger bodies are served uncached. */
const MAX_CACHED_BODY_LENGTH = 1_500_000;

export const ASSET_STATUSES = [
	'Draft',
	'Scheduled',
	'Upcoming',
	'Published',
	'Rejected',
	'Delisted'
] as const satisfies readonly Asset['status'][];
export const ASSET_TYPES = ['Template', 'Library', 'App'] as const satisfies readonly Asset['type'][];

export const ASSET_LIST_DEFAULT_LIMIT = 50;
export const ASSET_LIST_MAX_LIMIT = 100;

export type CreatorApiErrorCode =
	| 'MISSING_AUTH_HEADER'
	| 'INVALID_KEY_FORMAT'
	| 'INVALID_KEY'
	| 'KEY_REVOKED'
	| 'KEY_EXPIRED'
	| 'INSUFFICIENT_SCOPE'
	| 'RATE_LIMIT_EXCEEDED'
	| 'TOO_MANY_KEY_LOOKUPS'
	| 'INVALID_PARAMETER'
	| 'INVALID_BODY'
	| 'ASSET_NOT_EDITABLE'
	| 'NAME_TAKEN'
	| 'ASSET_NOT_FOUND'
	| 'PROFILE_NOT_FOUND'
	| 'NOT_FOUND'
	| 'INTERNAL_ERROR'
	| 'SERVICE_UNAVAILABLE';

export interface RateLimitResult {
	allowed: boolean;
	limit: number;
	remaining: number;
	/** Unix seconds at which the current window ends. */
	resetAt: number;
	/** Seconds until the next request can succeed; 0 when allowed. */
	retryAfter: number;
}

type CachedKey = VerifiedKey | { revoked: true };

interface VerifiedKey {
	keyId: string;
	/** Creator records the key reads; the first is its profile and its quota owner. */
	creatorIds: string[];
	scopes: ApiKeyScope[];
	expiresAt?: string;
}

export interface CreatorApiContext {
	requestId: string;
	key: VerifiedKey;
	rateLimit: RateLimitResult;
}

export interface CreatorApiAsset {
	id: string;
	name: string;
	status: Asset['status'];
	type: Asset['type'];
	submittedDate: string | null;
	publishedDate: string | null;
	thumbnail: string | null;
	websiteUrl: string | null;
	marketplaceUrl: string | null;
	metrics: {
		/** null when view data is unavailable; never a guessed 0. */
		viewers: number | null;
		purchases: number;
		revenue: number;
	};
}

export interface CreatorApiProfile {
	id: string;
	name: string;
	slug: string | null;
	avatar: string | null;
	biography: string | null;
	personalSite: string | null;
}

type CreatorApiEnv = App.Platform['env'];

// ==================== RESPONSES ====================

function rateLimitHeaders(rateLimit: RateLimitResult): Record<string, string> {
	return {
		'X-RateLimit-Limit': String(rateLimit.limit),
		'X-RateLimit-Remaining': String(rateLimit.remaining),
		'X-RateLimit-Reset': String(rateLimit.resetAt)
	};
}

export function creatorApiError(
	status: number,
	code: CreatorApiErrorCode,
	message: string,
	requestId: string,
	headers: Record<string, string> = {}
): Response {
	return json(
		{ error: message, code, requestId },
		{ status, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId, ...headers } }
	);
}

/** An error after authentication: the caller still learns their remaining quota. */
export function creatorApiRequestError(
	status: number,
	code: CreatorApiErrorCode,
	message: string,
	context: CreatorApiContext
): Response {
	return creatorApiError(status, code, message, context.requestId, rateLimitHeaders(context.rateLimit));
}

export function creatorApiJson(body: unknown, context: CreatorApiContext): Response {
	return json(body, {
		headers: {
			'Cache-Control': 'no-store',
			'X-Request-Id': context.requestId,
			...rateLimitHeaders(context.rateLimit)
		}
	});
}

export function creatorApiMeta(cached: boolean) {
	return { timestamp: new Date().toISOString(), version: CREATOR_API_VERSION, cached };
}

// ==================== D1: RATE LIMITS, USAGE, CACHE ====================

/**
 * Counts one request against a fixed window and reports whether it fits.
 *
 * The increment and the limit check are one statement, so concurrent requests
 * cannot both take the last slot. A refused request is not counted, which
 * keeps the stored count at or below the limit.
 */
export async function consumeRateLimit(
	db: D1Database,
	subject: string,
	limit: number,
	windowSeconds: number,
	nowMs: number = Date.now()
): Promise<RateLimitResult> {
	const now = Math.floor(nowMs / 1000);
	const windowStart = now - (now % windowSeconds);
	const resetAt = windowStart + windowSeconds;

	const [counted] = await db.batch<{ request_count: number }>([
		db
			.prepare(
				`INSERT INTO api_rate_limits (subject, window_start, request_count) VALUES (?1, ?2, 1)
				 ON CONFLICT (subject, window_start) DO UPDATE SET request_count = request_count + 1
				 WHERE api_rate_limits.request_count < ?3
				 RETURNING request_count`
			)
			.bind(subject, windowStart, limit),
		// Finished windows are dead weight. Drop this subject's own at once, and
		// day-old windows of every subject, so addresses that never return cannot
		// grow the table.
		db
			.prepare('DELETE FROM api_rate_limits WHERE subject = ?1 AND window_start < ?2')
			.bind(subject, windowStart),
		db
			.prepare('DELETE FROM api_rate_limits WHERE window_start < ?1')
			.bind(now - STALE_WINDOW_SECONDS)
	]);

	const count = counted.results?.[0]?.request_count;
	if (typeof count !== 'number') {
		return { allowed: false, limit, remaining: 0, resetAt, retryAfter: Math.max(1, resetAt - now) };
	}

	return { allowed: true, limit, remaining: Math.max(0, limit - count), resetAt, retryAfter: 0 };
}

export async function recordApiKeyUse(db: D1Database, keyId: string, usedAt: string): Promise<void> {
	await db
		.prepare(
			`INSERT INTO api_key_usage (key_id, request_count, last_used_at) VALUES (?1, 1, ?2)
			 ON CONFLICT (key_id) DO UPDATE SET
			   request_count = request_count + 1,
			   last_used_at = excluded.last_used_at`
		)
		.bind(keyId, usedAt)
		.run();
}

export interface ApiKeyUsage {
	requestCount: number;
	lastUsedAt: string;
}

export async function getApiKeyUsage(
	db: D1Database,
	keyIds: readonly string[]
): Promise<Map<string, ApiKeyUsage>> {
	const usage = new Map<string, ApiKeyUsage>();

	// D1 allows 100 bound parameters per statement.
	for (let start = 0; start < keyIds.length; start += 90) {
		const chunk = keyIds.slice(start, start + 90);
		const placeholders = chunk.map((_, index) => `?${index + 1}`).join(', ');
		const { results } = await db
			.prepare(
				`SELECT key_id, request_count, last_used_at FROM api_key_usage WHERE key_id IN (${placeholders})`
			)
			.bind(...chunk)
			.all<{ key_id: string; request_count: number; last_used_at: string }>();

		for (const row of results) {
			usage.set(row.key_id, { requestCount: row.request_count, lastUsedAt: row.last_used_at });
		}
	}

	return usage;
}

async function readCache<T>(db: D1Database, cacheKey: string): Promise<{ value: T } | null> {
	const row = await db
		.prepare('SELECT body FROM api_cache WHERE cache_key = ?1 AND expires_at > ?2')
		.bind(cacheKey, Math.floor(Date.now() / 1000))
		.first<{ body: string }>();
	if (!row) return null;

	try {
		return { value: JSON.parse(row.body) as T };
	} catch {
		return null;
	}
}

/** Best-effort: a failed cache write only means the next request reloads. */
async function writeCache(
	db: D1Database,
	cacheKey: string,
	value: unknown,
	ttlSeconds: number
): Promise<void> {
	const body = JSON.stringify(value);
	if (body.length > MAX_CACHED_BODY_LENGTH) return;

	try {
		await db
			.prepare(
				`INSERT INTO api_cache (cache_key, body, expires_at) VALUES (?1, ?2, ?3)
				 ON CONFLICT (cache_key) DO UPDATE SET body = excluded.body, expires_at = excluded.expires_at`
			)
			.bind(cacheKey, body, Math.floor(Date.now() / 1000) + ttlSeconds)
			.run();
	} catch (err) {
		console.error('[Creator API] Cache write failed', {
			cacheKey: cacheKey.split(':')[0],
			error: err instanceof Error ? err.message : String(err)
		});
	}
}

async function readThrough<T>(
	db: D1Database,
	cacheKey: string,
	load: () => Promise<T>
): Promise<{ value: T; cached: boolean }> {
	const hit = await readCache<T>(db, cacheKey);
	if (hit) return { value: hit.value, cached: true };

	const value = await load();
	await writeCache(db, cacheKey, value, CREATOR_API_DATA_TTL_SECONDS);
	return { value, cached: false };
}

function creatorAssetsCacheKey(creatorIds: readonly string[]): string {
	return `assets:${creatorIds.join('+')}`;
}

/** After a write: the next read loads the list again. Best-effort, like the cache itself. */
async function forgetCreatorAssets(db: D1Database, creatorIds: readonly string[]): Promise<void> {
	try {
		await db
			.prepare('DELETE FROM api_cache WHERE cache_key = ?1')
			.bind(creatorAssetsCacheKey(creatorIds))
			.run();
	} catch (err) {
		console.error('[Creator API] Cache delete failed', {
			error: err instanceof Error ? err.message : String(err)
		});
	}
}

function verifiedKeyCacheKey(keyHash: string): string {
	return `key:${keyHash}`;
}

/**
 * Called on revoke: replaces the cached verification with a revoked marker, so
 * the key fails on its next request instead of at cache expiry. A failure here
 * must reach the caller, because until the marker is written the key still works.
 */
export async function markApiKeyRevoked(db: D1Database, keyHash: string): Promise<void> {
	await db
		.prepare(
			`INSERT INTO api_cache (cache_key, body, expires_at) VALUES (?1, ?2, ?3)
			 ON CONFLICT (cache_key) DO UPDATE SET body = excluded.body, expires_at = excluded.expires_at`
		)
		.bind(
			verifiedKeyCacheKey(keyHash),
			REVOKED_KEY_MARKER,
			Math.floor(Date.now() / 1000) + REVOKED_KEY_TTL_SECONDS
		)
		.run();
}

/**
 * Caches a verified key, unless a live revoked marker is in the way.
 * Returns false in that case: the key was revoked while this request was
 * verifying it, and the request must be refused.
 */
async function cacheVerifiedKey(db: D1Database, keyHash: string, key: VerifiedKey): Promise<boolean> {
	const now = Math.floor(Date.now() / 1000);
	const written = await db
		.prepare(
			`INSERT INTO api_cache (cache_key, body, expires_at) VALUES (?1, ?2, ?3)
			 ON CONFLICT (cache_key) DO UPDATE SET body = excluded.body, expires_at = excluded.expires_at
			 WHERE api_cache.body != ?4 OR api_cache.expires_at <= ?5
			 RETURNING cache_key`
		)
		.bind(
			verifiedKeyCacheKey(keyHash),
			JSON.stringify(key),
			now + VERIFIED_KEY_TTL_SECONDS,
			REVOKED_KEY_MARKER,
			now
		)
		.first();
	return written !== null;
}

/**
 * The address a lookup limit is counted against. An IPv6 caller is counted by
 * its /64, the block one subscriber controls, so rotating through addresses in
 * that block does not give a fresh allowance each time.
 */
export function rateLimitAddress(address: string): string {
	const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address)?.[1];
	if (mappedIpv4) return mappedIpv4;
	if (!address.includes(':')) return address;

	const [head, tail] = address.split('::');
	const headGroups = head ? head.split(':') : [];
	const tailGroups = tail ? tail.split(':') : [];
	const elided = tail === undefined ? 0 : Math.max(0, 8 - headGroups.length - tailGroups.length);
	const groups = [...headGroups, ...Array<string>(elided).fill('0'), ...tailGroups];

	return `${groups
		.slice(0, 4)
		.map((group) => group.toLowerCase().replace(/^0+(?=.)/, ''))
		.join(':')}::/64`;
}

// ==================== AUTHENTICATION ====================

type AuthResult = { ok: true; context: CreatorApiContext } | { ok: false; response: Response };

type CreatorApiEvent = Pick<RequestEvent, 'request' | 'platform' | 'getClientAddress'>;

function clientAddress(event: CreatorApiEvent): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'unknown';
	}
}

export async function authenticateCreatorApiRequest(
	event: CreatorApiEvent,
	requiredScope: ApiKeyScope
): Promise<AuthResult> {
	const requestId = crypto.randomUUID();
	const fail = (
		status: number,
		code: CreatorApiErrorCode,
		message: string,
		headers?: Record<string, string>
	): AuthResult => ({ ok: false, response: creatorApiError(status, code, message, requestId, headers) });
	const unavailable = (retryAfterSeconds = 30) =>
		fail(503, 'SERVICE_UNAVAILABLE', 'The API is temporarily unavailable. Try again shortly.', {
			'Retry-After': String(retryAfterSeconds)
		});

	const env = event.platform?.env;
	if (!env?.DB) return unavailable();

	const header = event.request.headers.get('authorization');
	if (!header) {
		return fail(
			401,
			'MISSING_AUTH_HEADER',
			'Send your API key in the Authorization header: "Authorization: Bearer <key>".'
		);
	}

	const presented = /^Bearer\s+(\S+)$/i.exec(header.trim())?.[1];
	if (!presented || !isWellFormedApiKey(presented)) {
		return fail(401, 'INVALID_KEY_FORMAT', 'The API key is not in the expected format.');
	}

	const keyHash = hashApiKey(presented);

	try {
		const revoked = () => fail(401, 'KEY_REVOKED', 'This API key was revoked.');
		const cached = (await readCache<CachedKey>(env.DB, verifiedKeyCacheKey(keyHash)))?.value ?? null;
		if (cached && 'revoked' in cached) return revoked();

		let key: VerifiedKey | null = cached;

		if (!key) {
			const lookups = await consumeRateLimit(
				env.DB,
				`ip:${rateLimitAddress(clientAddress(event))}`,
				KEY_LOOKUP_QUOTA.requests,
				KEY_LOOKUP_QUOTA.windowSeconds
			);
			if (!lookups.allowed) {
				return fail(
					429,
					'TOO_MANY_KEY_LOOKUPS',
					'Too many requests with keys we could not verify. Check the key, then try again later.',
					{ 'Retry-After': String(lookups.retryAfter) }
				);
			}

			const allLookups = await consumeRateLimit(
				env.DB,
				'key-lookups',
				GLOBAL_KEY_LOOKUP_QUOTA.requests,
				GLOBAL_KEY_LOOKUP_QUOTA.windowSeconds
			);
			if (!allLookups.allowed) return unavailable(allLookups.retryAfter);

			const record = await getAirtableClient(env).findApiKeyByHash(keyHash);
			if (!record || record.creatorIds.length === 0) {
				return fail(401, 'INVALID_KEY', 'This API key is not valid.');
			}
			if (record.status === 'Revoked') {
				// Remember it, so repeats of a revoked key stop reaching Airtable.
				await markApiKeyRevoked(env.DB, keyHash);
				return revoked();
			}
			if (record.status === 'Expired') return fail(401, 'KEY_EXPIRED', 'This API key has expired.');

			key = {
				keyId: record.id,
				creatorIds: record.creatorIds,
				scopes: record.scopes,
				expiresAt: record.expiresAt
			};
			if (!(await cacheVerifiedKey(env.DB, keyHash, key))) return revoked();
		} else if (isApiKeyExpired(key.expiresAt)) {
			return fail(401, 'KEY_EXPIRED', 'This API key has expired.');
		}

		if (!key.scopes.includes(requiredScope)) {
			return fail(
				403,
				'INSUFFICIENT_SCOPE',
				`This API key does not have the ${requiredScope} permission.`
			);
		}

		const rateLimit = await consumeRateLimit(
			env.DB,
			// Sorted, so every key of the same creators shares one allowance
			// whatever order its links were written in.
			`creator:${[...key.creatorIds].sort()[0]}`,
			CREATOR_API_QUOTA.requests,
			CREATOR_API_QUOTA.windowSeconds
		);
		if (!rateLimit.allowed) {
			return fail(
				429,
				'RATE_LIMIT_EXCEEDED',
				`You have used all ${rateLimit.limit} requests for this hour. Try again in ${rateLimit.retryAfter} seconds.`,
				{ ...rateLimitHeaders(rateLimit), 'Retry-After': String(rateLimit.retryAfter) }
			);
		}

		const recorded = recordApiKeyUse(env.DB, key.keyId, new Date().toISOString()).catch((err) => {
			console.error('[Creator API] Usage write failed', {
				requestId,
				error: err instanceof Error ? err.message : String(err)
			});
		});
		const waitUntil = event.platform?.context?.waitUntil;
		if (waitUntil) {
			waitUntil.call(event.platform?.context, recorded);
		} else {
			await recorded;
		}

		return { ok: true, context: { requestId, key, rateLimit } };
	} catch (err) {
		console.error('[Creator API] Authentication failed', {
			requestId,
			error: err instanceof Error ? err.message : String(err)
		});
		return unavailable();
	}
}

/**
 * Wraps a v1 endpoint: authenticate, check the scope, apply the quota, then
 * run the handler. A handler failure becomes a JSON 500 with the request ID.
 */
export function creatorApiRoute<E extends RequestEvent>(
	requiredScope: ApiKeyScope,
	handler: (event: E, context: CreatorApiContext, env: CreatorApiEnv) => Promise<Response>
): (event: E) => Promise<Response> {
	return async (event) => {
		const auth = await authenticateCreatorApiRequest(event, requiredScope);
		if (!auth.ok) return auth.response;

		try {
			// authenticateCreatorApiRequest has already confirmed platform.env exists.
			return await handler(event, auth.context, event.platform!.env);
		} catch (err) {
			console.error('[Creator API] Request failed', {
				requestId: auth.context.requestId,
				path: event.url.pathname,
				error: err instanceof Error ? err.message : String(err)
			});
			return creatorApiRequestError(
				500,
				'INTERNAL_ERROR',
				'Something went wrong on our side. Include the requestId if you report this.',
				auth.context
			);
		}
	};
}

// ==================== DATA ====================

export function toCreatorApiAsset(asset: Asset): CreatorApiAsset {
	return {
		id: asset.id,
		name: asset.name,
		status: asset.status,
		type: asset.type,
		submittedDate: asset.submittedDate ?? null,
		publishedDate: asset.publishedDate ?? null,
		thumbnail: asset.thumbnailUrl ?? null,
		websiteUrl: asset.websiteUrl ?? null,
		marketplaceUrl: asset.marketplaceUrl ?? null,
		metrics: {
			viewers: typeof asset.uniqueViewers === 'number' ? asset.uniqueViewers : null,
			purchases: asset.cumulativePurchases ?? 0,
			revenue: asset.cumulativeRevenue ?? 0
		}
	};
}

export function toCreatorApiProfile(profile: CreatorPublicProfile): CreatorApiProfile {
	return {
		id: profile.id,
		name: profile.name,
		slug: profile.slug,
		avatar: profile.avatarUrl,
		biography: profile.biography,
		personalSite: profile.websiteUrl
	};
}

/** Newest submission first; assets without a date go last. */
function bySubmittedDateDesc(a: CreatorApiAsset, b: CreatorApiAsset): number {
	return (b.submittedDate ?? '').localeCompare(a.submittedDate ?? '');
}

/**
 * The creator's full asset list, the single source for both asset endpoints.
 * Reading one asset from this list is also the ownership check: an ID that is
 * not in the creator's own list does not exist for this key.
 */
export async function loadCreatorAssets(
	env: CreatorApiEnv,
	creatorIds: readonly string[],
	waitUntil?: (promise: Promise<unknown>) => void
): Promise<{ value: CreatorApiAsset[]; cached: boolean }> {
	return readThrough(env.DB, creatorAssetsCacheKey(creatorIds), async () => {
		const assets = await applyTemplateViews(
			env,
			await getAirtableClient(env).getAssetsByCreatorIds(creatorIds),
			{ waitUntil }
		);
		return assets.map(toCreatorApiAsset).sort(bySubmittedDateDesc);
	});
}

export async function loadCreatorProfile(
	env: CreatorApiEnv,
	creatorId: string
): Promise<{ value: CreatorApiProfile | null; cached: boolean }> {
	return readThrough(env.DB, `profile:${creatorId}`, async () => {
		const profile = await getAirtableClient(env).getCreatorProfileById(creatorId);
		return profile ? toCreatorApiProfile(profile) : null;
	});
}

// ==================== LISTING UPDATE ====================

/** The listing text a key with `write:assets` can change on a published template. */
export interface ListingUpdate {
	name?: string;
	descriptionShort?: string;
	descriptionLong?: string;
	websiteUrl?: string;
	previewUrl?: string;
}

export const LISTING_UPDATE_LIMITS = {
	name: 128,
	descriptionShort: 2000,
	descriptionLong: 10000,
	websiteUrl: 2048,
	previewUrl: 2048
} as const satisfies Record<keyof ListingUpdate, number>;

const LISTING_URL_FIELDS: ReadonlySet<keyof ListingUpdate> = new Set(['websiteUrl', 'previewUrl']);

function isHttpsUrl(value: string): boolean {
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Reads a PATCH body. Unknown fields are refused, not ignored, so a caller
 * never believes a field was saved when the API does not support it.
 */
export function parseListingUpdate(
	body: unknown
): { ok: true; update: ListingUpdate } | { ok: false; message: string } {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return { ok: false, message: 'Send a JSON object with the fields to change.' };
	}

	const update: ListingUpdate = {};
	for (const [field, value] of Object.entries(body)) {
		if (!(field in LISTING_UPDATE_LIMITS)) {
			return {
				ok: false,
				message: `"${field}" cannot be changed through the API. Supported fields: ${Object.keys(LISTING_UPDATE_LIMITS).join(', ')}.`
			};
		}
		const key = field as keyof ListingUpdate;
		if (typeof value !== 'string') return { ok: false, message: `"${key}" must be a string.` };

		const text = key === 'descriptionLong' ? sanitizeLongDescriptionHtml(value) : value.trim();
		if (!text) return { ok: false, message: `"${key}" cannot be empty.` };
		if (text.length > LISTING_UPDATE_LIMITS[key]) {
			return {
				ok: false,
				message: `"${key}" is longer than ${LISTING_UPDATE_LIMITS[key]} characters.`
			};
		}
		if (LISTING_URL_FIELDS.has(key) && !isHttpsUrl(text)) {
			return { ok: false, message: `"${key}" must be an https URL.` };
		}
		update[key] = text;
	}

	if (Object.keys(update).length === 0) {
		return { ok: false, message: 'Send at least one field to change.' };
	}
	return { ok: true, update };
}

/**
 * Compares the request with the current listing. The change record uses the
 * dashboard editor's field names, so reviewers read one format for both paths.
 */
export function buildListingChange(
	asset: Asset,
	update: ListingUpdate
): { data: AssetUpdateData; changes: Record<string, { from: string; to: string }> } {
	const data: AssetUpdateData = {};
	const changes: Record<string, { from: string; to: string }> = {};
	const register = (field: string, from: string, to: string | undefined, apply: (to: string) => void) => {
		if (to === undefined || to === from) return;
		changes[field] = { from, to };
		apply(to);
	};

	register('Name', asset.name, update.name, (to) => (data.name = to));
	register('ℹ️Description (Short)', asset.descriptionShort || '', update.descriptionShort, (to) => {
		data.descriptionShort = to;
	});
	register(
		'ℹ️Description (Long).html',
		asset.descriptionLongHtml || asset.description || '',
		update.descriptionLong,
		(to) => (data.descriptionLongHtml = to)
	);
	register('🔗Website URL', asset.websiteUrl || '', update.websiteUrl, (to) => (data.websiteUrl = to));
	register('🔗Preview Site URL', asset.previewUrl || '', update.previewUrl, (to) => (data.previewUrl = to));

	return { data, changes };
}

export type ListingUpdateResult =
	| { outcome: 'not_found' }
	| { outcome: 'not_editable' }
	| { outcome: 'name_taken' }
	| { outcome: 'unchanged'; asset: Asset }
	| { outcome: 'updated'; asset: Asset; changedFields: string[]; reviewRecorded: boolean };

/**
 * Applies a listing update the way the dashboard editor does: write the asset,
 * then record a Meta Update version so the review team sees the change.
 *
 * Ownership is read fresh from Airtable, not from the response cache: a write
 * must not act on a list that is up to five minutes old.
 */
export async function updateCreatorListing(
	env: CreatorApiEnv,
	key: VerifiedKey,
	assetId: string,
	update: ListingUpdate
): Promise<ListingUpdateResult> {
	const airtable = getAirtableClient(env);
	const owned = await airtable.getAssetsByCreatorIds(key.creatorIds);
	if (!owned.some((candidate) => candidate.id === assetId)) return { outcome: 'not_found' };

	const original = await airtable.getAsset(assetId);
	if (!original) return { outcome: 'not_found' };
	if (original.type !== 'Template' || original.status !== 'Published') {
		return { outcome: 'not_editable' };
	}

	const { data, changes } = buildListingChange(original, update);
	if (Object.keys(changes).length === 0) return { outcome: 'unchanged', asset: original };

	if (data.name !== undefined) {
		const nameCheck = await airtable.checkAssetNameUniqueness(data.name, assetId);
		if (!nameCheck.unique) return { outcome: 'name_taken' };
	}

	const updated = await airtable.updateAssetWithImages(assetId, data);
	if (!updated) throw new Error('The listing update was not saved');

	// The review record names the key, never the secret: the key ID is the
	// Airtable record of the key, which the review team can look up.
	const version = shouldCreateAssetVersionForChanges(changes)
		? await airtable.createAssetVersionFromAsset(original, `api-key:${key.keyId}`, changes)
		: null;

	await forgetCreatorAssets(env.DB, key.creatorIds);

	return {
		outcome: 'updated',
		asset: updated,
		changedFields: Object.keys(changes),
		reviewRecorded: version !== null
	};
}

/** The listing text, returned after a write so the caller sees what is stored. */
export function toCreatorApiListing(asset: Asset) {
	return {
		name: asset.name,
		descriptionShort: asset.descriptionShort ?? null,
		descriptionLong: asset.descriptionLongHtml ?? asset.description ?? null,
		websiteUrl: asset.websiteUrl ?? null,
		previewUrl: asset.previewUrl ?? null
	};
}

// ==================== QUERY PARSING ====================

export interface AssetListQuery {
	status?: Asset['status'];
	type?: Asset['type'];
	limit: number;
	offset: number;
}

function parseWholeNumber(raw: string): number | null {
	return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

function matchOption<T extends string>(raw: string, options: readonly T[]): T | undefined {
	const wanted = raw.trim().toLowerCase();
	return options.find((option) => option.toLowerCase() === wanted);
}

export function parseAssetListQuery(
	params: URLSearchParams
): { ok: true; query: AssetListQuery } | { ok: false; message: string } {
	const query: AssetListQuery = { limit: ASSET_LIST_DEFAULT_LIMIT, offset: 0 };

	const limit = params.get('limit');
	if (limit !== null) {
		const parsed = parseWholeNumber(limit);
		if (parsed === null || parsed < 1) {
			return { ok: false, message: `limit must be a whole number from 1 to ${ASSET_LIST_MAX_LIMIT}.` };
		}
		query.limit = Math.min(parsed, ASSET_LIST_MAX_LIMIT);
	}

	const offset = params.get('offset');
	if (offset !== null) {
		const parsed = parseWholeNumber(offset);
		if (parsed === null) return { ok: false, message: 'offset must be a whole number, 0 or more.' };
		query.offset = parsed;
	}

	const status = params.get('status');
	if (status !== null) {
		query.status = matchOption(status, ASSET_STATUSES);
		if (!query.status) {
			return { ok: false, message: `status must be one of: ${ASSET_STATUSES.join(', ')}.` };
		}
	}

	const type = params.get('type');
	if (type !== null) {
		query.type = matchOption(type, ASSET_TYPES);
		if (!query.type) {
			return { ok: false, message: `type must be one of: ${ASSET_TYPES.join(', ')}.` };
		}
	}

	return { ok: true, query };
}
