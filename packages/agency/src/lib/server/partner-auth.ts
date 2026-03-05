import { Composio } from '@composio/core';

export const HALF_DOZEN_PARTNER_KEY = 'half-dozen';

export class PartnerAuthHttpError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = 'PartnerAuthHttpError';
		this.status = status;
		this.code = code;
	}
}

export interface PartnerAuthClientRow {
	id: string;
	partner_key: string;
	slug: string;
	display_name: string | null;
	workspace_account_id: string;
	identity_account_id: string | null;
	identity_user_id: string | null;
	identity_tenant_id: string | null;
	owner_email: string | null;
	status: 'initialized' | 'active' | 'paused' | 'sunset' | 'disabled';
	required_toolkits_json: string;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

export interface PartnerAuthConsentRow {
	id: string;
	partner_client_id: string;
	consent_version: string;
	consent_granted_by: string;
	consent_channel: string;
	consent_reference: string | null;
	granted_at: string;
	expires_at: string | null;
	revoked_at: string | null;
	metadata_json: string;
	created_at: string;
}

type PlatformEnv = App.Platform['env'];

let composioCache:
	| {
		cacheKey: string;
		client: Composio;
	}
	| undefined;

export function normalizePartnerSlug(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);
}

export function normalizeToolkitSlug(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 64);
}

export function parseToolkitList(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const normalized = raw
		.filter((value): value is string => typeof value === 'string')
		.map((value) => normalizeToolkitSlug(value))
		.filter(Boolean);
	return [...new Set(normalized)];
}

export function parseJsonArray(raw: string | null | undefined): string[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		return parseToolkitList(parsed);
	} catch {
		return [];
	}
}

export function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		return {};
	} catch {
		return {};
	}
}

export function parseBearerToken(authorizationHeader: string | null): string | null {
	if (!authorizationHeader) return null;
	const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
	if (!match) return null;
	return match[1]!.trim();
}

export function requirePartnerAdmin(request: Request, env: PlatformEnv): string {
	const expected = env.PARTNER_PORTAL_ADMIN_KEY?.trim();
	if (!expected) {
		throw new PartnerAuthHttpError(503, 'admin_key_not_configured', 'PARTNER_PORTAL_ADMIN_KEY is not configured');
	}

	const provided =
		request.headers.get('X-Partner-Admin-Key')?.trim() ??
		parseBearerToken(request.headers.get('Authorization'));

	if (!provided || !constantTimeEqual(expected, provided)) {
		throw new PartnerAuthHttpError(401, 'unauthorized', 'Missing or invalid partner admin credential');
	}

	const actorHeader = request.headers.get('X-Partner-Actor')?.trim();
	return actorHeader && actorHeader.length > 0 ? actorHeader.slice(0, 128) : 'partner_admin';
}

export async function getPartnerClientBySlug(
	db: D1Database,
	partnerKey: string,
	slug: string
): Promise<PartnerAuthClientRow | null> {
	return db
		.prepare(
			`SELECT * FROM partner_auth_clients
       WHERE partner_key = ? AND slug = ?
       LIMIT 1`
		)
		.bind(partnerKey, slug)
		.first<PartnerAuthClientRow>();
}

export async function getLatestActiveConsent(
	db: D1Database,
	partnerClientId: string
): Promise<PartnerAuthConsentRow | null> {
	return db
		.prepare(
			`SELECT * FROM partner_auth_consents
       WHERE partner_client_id = ?
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY granted_at DESC
       LIMIT 1`
		)
		.bind(partnerClientId)
		.first<PartnerAuthConsentRow>();
}

export async function insertPartnerAccessDelivery(
	db: D1Database,
	input: {
		id: string;
		partnerClientId: string;
		deliveryType: 'strict_session_bundle' | 'legacy_key_bundle';
		deliveryChannel: 'portal' | 'secure_note' | 'email' | 'manual';
		deliveredBy: string;
		recipient: string | null;
		artifactRef: string | null;
		expiresAt: string | null;
		metadata: Record<string, unknown>;
	}
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO partner_access_deliveries (
         id, partner_client_id, delivery_type, delivery_channel, delivered_by, recipient, artifact_ref, expires_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			input.id,
			input.partnerClientId,
			input.deliveryType,
			input.deliveryChannel,
			input.deliveredBy,
			input.recipient,
			input.artifactRef,
			input.expiresAt,
			JSON.stringify(input.metadata)
		)
		.run();
}

export function getComposioClient(env: PlatformEnv): Composio {
	const apiKey = env.COMPOSIO_API_KEY?.trim();
	if (!apiKey) {
		throw new PartnerAuthHttpError(503, 'composio_not_configured', 'COMPOSIO_API_KEY is not configured');
	}
	const baseURL = env.COMPOSIO_BASE_URL?.trim();
	const cacheKey = `${apiKey}::${baseURL ?? ''}`;

	if (composioCache?.cacheKey === cacheKey) {
		return composioCache.client;
	}

	const client = new Composio({
		apiKey,
		...(baseURL ? { baseURL } : {}),
	});
	composioCache = { cacheKey, client };
	return client;
}

export function getAuthConfigMap(env: PlatformEnv): Record<string, string> {
	const raw = env.COMPOSIO_AUTH_CONFIG_MAP_JSON?.trim();
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

		const normalized: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value !== 'string' || !value.trim()) continue;
			normalized[normalizeToolkitSlug(key)] = value.trim();
		}
		return normalized;
	} catch {
		return {};
	}
}

export function resolveAuthConfigId(env: PlatformEnv, toolkit: string): string | null {
	const map = getAuthConfigMap(env);
	return map[normalizeToolkitSlug(toolkit)] ?? null;
}

export async function postIdentityAdmin<TResponse>(
	env: PlatformEnv,
	path: string,
	body: Record<string, unknown>
): Promise<TResponse> {
	const baseUrl = (env.IDENTITY_WORKER_URL ?? 'https://id.createsomething.space').replace(/\/+$/, '');
	const apiKey = env.IDENTITY_WORKER_ADMIN_API_KEY?.trim();
	if (!apiKey) {
		throw new PartnerAuthHttpError(
			503,
			'identity_admin_key_not_configured',
			'IDENTITY_WORKER_ADMIN_API_KEY is not configured',
		);
	}

	const response = await fetch(`${baseUrl}${path}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': apiKey,
		},
		body: JSON.stringify(body),
	});

	const payload = await response.json().catch(() => null);
	if (!response.ok) {
		const message =
			payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
				? payload.message
				: `Identity worker request failed (${response.status})`;
		throw new PartnerAuthHttpError(response.status, 'identity_request_failed', message);
	}

	return payload as TResponse;
}

export function randomId(prefix: string): string {
	return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function tokenPreview(value: string): string {
	return value.slice(0, 10);
}

export function defaultWorkspaceAccountId(slug: string): string {
	return `acct_${slug.replace(/[^a-z0-9]/g, '_')}`;
}

export function normalizeEmail(raw: string | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim().toLowerCase();
	if (!value) return null;
	return value.slice(0, 255);
}

export function parseOptionalIsoTimestamp(raw: string | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim();
	if (!value) return null;
	const date = new Date(value);
	if (!Number.isFinite(date.getTime())) return null;
	return date.toISOString();
}

function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i += 1) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}
