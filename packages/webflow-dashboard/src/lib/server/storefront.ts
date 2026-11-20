/**
 * Server-side client for the creator-storefront service
 * (packages/creator-storefront, docs/creator-storefront/CONTRACT.md).
 *
 * The browser never sees the service URL or key. Outgoing headers are built
 * from scratch: the browser's Authorization or X-Storefront-* headers are
 * never forwarded. The actor email always comes from the session
 * (locals.user), and the service resolves the Creator itself, rejecting
 * ambiguous matches. When one email matches several Creators, the browser may
 * name one by record ID; the ID is format-checked here and forwarded in a
 * freshly built header, and the service accepts it only if it is one of the
 * Creators the session email matched.
 */

export interface StorefrontEnv {
	CREATOR_STOREFRONT_ENABLED?: string;
	CREATOR_STOREFRONT_SERVICE_URL?: string;
	CREATOR_STOREFRONT_OWNER_KEY?: string;
	/** Optional closed-beta allowlist (comma-separated emails). */
	CREATOR_STOREFRONT_ALLOWED_EMAILS?: string;
	ENVIRONMENT?: string;
}

export type StorefrontConfig =
	| { enabled: true; serviceUrl: string; ownerKey: string; allowedEmails: Set<string> | null }
	| { enabled: false; reason: 'flag_off' | 'not_configured' };

const MIN_KEY_LENGTH = 32;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/;
const CREATOR_ID = /^rec[A-Za-z0-9]{14}$/;
const TIMEOUT_MS = 10_000;

function serviceOrigin(value: string, environment: string | undefined): string | null {
	try {
		const url = new URL(value);
		if (url.username || url.password || url.pathname !== '/' || url.search) return null;
		if (url.protocol === 'https:') return url.origin;
		const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
		return url.protocol === 'http:' && loopback && (environment ?? 'production') !== 'production' ? url.origin : null;
	} catch {
		return null;
	}
}

/** Fails closed: any missing or malformed setting disables the feature. */
export function storefrontConfig(env: StorefrontEnv | undefined): StorefrontConfig {
	if (env?.CREATOR_STOREFRONT_ENABLED !== 'true') return { enabled: false, reason: 'flag_off' };
	const serviceUrl = env.CREATOR_STOREFRONT_SERVICE_URL
		? serviceOrigin(env.CREATOR_STOREFRONT_SERVICE_URL, env.ENVIRONMENT)
		: null;
	const ownerKey = env.CREATOR_STOREFRONT_OWNER_KEY ?? '';
	if (!serviceUrl || ownerKey.length < MIN_KEY_LENGTH) return { enabled: false, reason: 'not_configured' };
	const allowed = (env.CREATOR_STOREFRONT_ALLOWED_EMAILS ?? '')
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	return { enabled: true, serviceUrl, ownerKey, allowedEmails: allowed.length ? new Set(allowed) : null };
}

export function storefrontEnabledFor(config: StorefrontConfig, email: string): boolean {
	if (!config.enabled) return false;
	return !config.allowedEmails || config.allowedEmails.has(email.trim().toLowerCase());
}

export function isValidIdempotencyKey(value: string | null): value is string {
	return Boolean(value && IDEMPOTENCY_KEY.test(value));
}

export function isValidCreatorId(value: unknown): value is string {
	return typeof value === 'string' && CREATOR_ID.test(value);
}

export interface ServiceCall {
	method: 'GET' | 'PUT' | 'POST';
	path: string;
	actorEmail: string;
	/** Which of the email's matched Creators to act for. Checked by the service, not trusted here. */
	creatorId?: string;
	body?: unknown;
	idempotencyKey?: string;
}

/** Calls the service with freshly built headers. Never throws on HTTP errors. */
export async function callStorefrontService(
	config: Extract<StorefrontConfig, { enabled: true }>,
	call: ServiceCall,
	fetchImpl: typeof fetch = fetch
): Promise<{ status: number; body: unknown }> {
	const headers = new Headers({
		Authorization: `Bearer ${config.ownerKey}`,
		'X-Storefront-Actor-Email': call.actorEmail.trim().toLowerCase(),
		Accept: 'application/json'
	});
	if (call.creatorId && isValidCreatorId(call.creatorId)) headers.set('X-Storefront-Creator-Id', call.creatorId);
	if (call.body !== undefined) headers.set('Content-Type', 'application/json');
	if (call.idempotencyKey) headers.set('Idempotency-Key', call.idempotencyKey);

	let response: Response;
	try {
		response = await fetchImpl(`${config.serviceUrl}${call.path}`, {
			method: call.method,
			headers,
			body: call.body === undefined ? undefined : JSON.stringify(call.body),
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch {
		return { status: 503, body: { error: 'service_unavailable', message: 'Storefront service is unreachable' } };
	}
	const body = await response.json().catch(() => null);
	return { status: response.status, body };
}

// ------------------------------------------------------------- sanitizers
// Allow-lists keep anything the service might add (or a misconfigured
// upstream might return) from reaching the browser.

type Json = Record<string, unknown>;

function obj(value: unknown): Json {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
}

function arr(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function pick<T extends string>(value: unknown, keys: readonly T[]): Partial<Record<T, unknown>> {
	const source = obj(value);
	const out: Partial<Record<T, unknown>> = {};
	for (const key of keys) if (key in source) out[key] = source[key];
	return out;
}

const FIELD_KEYS = ['positioning', 'coverUrl', 'coverAlt', 'portfolioUrl', 'supportText', 'supportUrl'] as const;
const RECEIPT_KEYS = ['publicationRevision', 'op', 'status', 'publishedDraftVersion', 'publishedAt', 'readModel', 'state'] as const;

export function sanitizeReceipt(value: unknown): unknown {
	return value ? pick(value, RECEIPT_KEYS) : null;
}

export function sanitizeOwnerView(value: unknown): Json {
	const view = obj(value);
	const draft = obj(view.draft);
	return {
		draft: {
			...pick(draft, ['exists', 'draftVersion', 'status', 'publishedDraftVersion', 'publishedAt'] as const),
			fields: pick(draft.fields, FIELD_KEYS),
			selections: arr(draft.selections).map((s) => pick(s, ['assetId', 'position', 'note'] as const))
		},
		pending: view.pending === true,
		lastReceipt: sanitizeReceipt(view.lastReceipt),
		candidates: arr(view.candidates).map((c) => pick(c, ['assetId', 'name', 'templateSlug'] as const))
	};
}

export function sanitizePreview(value: unknown): Json {
	const preview = obj(value);
	const s = obj(preview.storefront);
	return {
		storefront: {
			...pick(s, ['creatorSlug', 'positioning', 'cover', 'support'] as const),
			links: arr(s.links).map((l) => pick(l, ['href', 'label'] as const)),
			selections: arr(s.selections).map((x) => pick(x, ['templateSlug', 'note'] as const))
		},
		issues: arr(preview.issues).map((i) => pick(i, ['assetId', 'reason'] as const)),
		blockers: arr(preview.blockers).filter((b) => typeof b === 'string')
	};
}

/** Only a genuine ambiguity carries choices, and only record ID and slug of each. */
function sanitizeChoices(error: string, status: number, details: Json): Array<{ id: string; slug: string | null }> {
	if (error !== 'ambiguous_creator' || status !== 409) return [];
	return arr(details.choices)
		.map((c) => obj(c))
		.filter((c) => isValidCreatorId(c.id))
		.map((c) => ({ id: c.id as string, slug: typeof c.slug === 'string' ? c.slug : null }));
}

export function sanitizeError(value: unknown, status: number): Json {
	const body = obj(value);
	const error = typeof body.error === 'string' ? body.error : status >= 500 ? 'service_unavailable' : 'request_failed';
	const message = typeof body.message === 'string' ? body.message : 'Storefront request failed';
	const details = obj(body.details);
	const issues = arr(details.issues).map((i) => pick(i, ['field', 'issue', 'assetId', 'reason'] as const));
	const choices = sanitizeChoices(error, status, details);
	const safeDetails = {
		...(issues.length ? { issues } : {}),
		...(typeof details.currentDraftVersion === 'number' ? { currentDraftVersion: details.currentDraftVersion } : {}),
		...(choices.length ? { choices } : {})
	};
	return { error, message, ...(Object.keys(safeDetails).length ? { details: safeDetails } : {}) };
}
