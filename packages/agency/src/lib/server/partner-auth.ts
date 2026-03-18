import { Composio } from '@composio/core';
import {
	evaluateAuthorizationRequest,
	getPolicyManifest,
	type AuthorizationAccessType,
	type AuthorizationDecision,
	type HybridEvaluatorConfig,
} from '@create-something/mcp-authz';
import {
	getPartnerProspectIssuanceBlocker,
	isPartnerProspectGraduated,
	isPartnerProspectRecord,
	type PartnerCredentialIssuanceSurface,
} from './partner-prospect-issuance.js';

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

export interface PartnerAuthAccessLaneRow {
	id: string;
	partner_client_id: string;
	slug: string;
	display_name: string;
	identity_user_id: string | null;
	owner_email: string | null;
	hub_url: string;
	host_key: string;
	status: 'initialized' | 'active' | 'paused' | 'sunset' | 'disabled';
	toolkit_profile_json: string;
	allowed_tool_prefixes_json: string;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

export interface PartnerAuthAccessLaneAssignmentRow extends PartnerAuthAccessLaneRow {
	partner_key: string;
	client_slug: string;
	client_display_name: string | null;
	workspace_account_id: string;
	identity_account_id: string | null;
	identity_tenant_id: string | null;
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

export interface PartnerAuthNotionAccountRow {
	id: string;
	partner_client_id: string;
	account_slug: string;
	display_label: string | null;
	composio_user_id: string;
	auth_config_id: string | null;
	connected_account_id: string | null;
	connection_status: string;
	status: 'active' | 'disabled' | 'revoked';
	sync_enabled: number;
	last_checked_at: string | null;
	connected_at: string | null;
	disabled_at: string | null;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

export interface PartnerAuthNotionPinRow {
	id: string;
	partner_client_id: string;
	tool_name: string;
	account_slug: string;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

export interface PartnerAuthToolkitAccountRow {
	id: string;
	partner_client_id: string;
	toolkit: string;
	account_slug: string;
	display_label: string | null;
	composio_user_id: string;
	auth_config_id: string | null;
	connected_account_id: string | null;
	connection_status: string;
	status: 'active' | 'disabled' | 'revoked';
	sync_enabled: number;
	last_checked_at: string | null;
	connected_at: string | null;
	disabled_at: string | null;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

export interface PartnerAuthToolkitPinRow {
	id: string;
	partner_client_id: string;
	toolkit: string;
	tool_name: string;
	account_slug: string;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

export type PartnerToolkitAdminActionName =
	| 'view_toolkit_auth'
	| 'upsert_toolkit_account'
	| 'create_toolkit_connect_link'
	| 'pin_toolkit_account'
	| 'disable_toolkit_account';

export interface PartnerToolkitPolicyDecision {
	policy_id: string;
	decision: AuthorizationDecision['decision'];
	evaluation_path: AuthorizationDecision['evaluationPath'];
	policy_hash: string | null;
	fallback_used: boolean;
	rollout_mode: AuthorizationDecision['rolloutMode'];
	canary_percent: number;
	reason: string;
}

type PlatformEnv = App.Platform['env'];

const PARTNER_AUTH_GOVERNANCE_POLICY_ID = 'policy.partner-auth-governance.v1';

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

export function normalizePartnerAccessLaneSlug(raw: string): string {
	return normalizePartnerSlug(raw);
}

export function normalizeToolkitSlug(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 64);
}

export function defaultToolkitComposioUserId(clientSlug: string, toolkit: string, accountSlug: string): string {
	return `hd_${normalizeToolkitSlug(toolkit)}_${clientSlug.replace(/-/g, '_')}_${accountSlug.replace(/-/g, '_')}`;
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

export function parseJsonStringArray(raw: string | null | undefined): string[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((value): value is string => typeof value === 'string')
			.map((value) => value.trim())
			.filter(Boolean);
	} catch {
		return [];
	}
}

export function normalizeAllowedToolPrefixes(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const normalized = raw
		.filter((value): value is string => typeof value === 'string')
		.map((value) => value.trim())
		.filter(Boolean);
	return [...new Set(normalized)].slice(0, 500);
}

export function buildComposioAllowedToolPrefixes(toolkits: string[]): string[] {
	return parseToolkitList(toolkits).map((toolkit) => `composio-toolkit-${toolkit}__`);
}

export function resolveAllowedToolPrefixes(
	toolkits: string[],
	explicitPrefixes: string[] = [],
): string[] {
	return [...new Set([...normalizeAllowedToolPrefixes(explicitPrefixes), ...buildComposioAllowedToolPrefixes(toolkits)])];
}

export function buildPartnerLaneHubUrl(laneSlug: string): string {
	return `https://${normalizePartnerAccessLaneSlug(laneSlug)}.mcp.createsomething.agency/mcp`;
}

export function buildPartnerLaneNotionBridgeUrl(clientSlug: string): string {
	return `https://${normalizePartnerSlug(clientSlug)}-notion.mcp.workway.co/mcp`;
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

export function getPartnerReviewStep(request: Request): string | null {
	const reviewHeader =
		request.headers.get('X-Partner-Review-Step')?.trim() ??
		request.headers.get('X-Partner-Review-Trace')?.trim() ??
		request.headers.get('X-Partner-Approval-Ref')?.trim();
	return reviewHeader && reviewHeader.length > 0 ? reviewHeader.slice(0, 255) : null;
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

export async function getPartnerAccessLaneBySlug(
	db: D1Database,
	partnerClientId: string,
	laneSlug: string,
): Promise<PartnerAuthAccessLaneRow | null> {
	return db
		.prepare(
			`SELECT * FROM partner_auth_access_lanes
       WHERE partner_client_id = ? AND slug = ?
       LIMIT 1`
		)
		.bind(partnerClientId, normalizePartnerAccessLaneSlug(laneSlug))
		.first<PartnerAuthAccessLaneRow>();
}

export async function listPartnerAccessLanes(
	db: D1Database,
	partnerClientId: string,
): Promise<PartnerAuthAccessLaneRow[]> {
	const result = await db
		.prepare(
			`SELECT * FROM partner_auth_access_lanes
       WHERE partner_client_id = ?
       ORDER BY
         CASE status
           WHEN 'active' THEN 0
           WHEN 'paused' THEN 1
           WHEN 'initialized' THEN 2
           WHEN 'sunset' THEN 3
           ELSE 4
         END,
         updated_at DESC`
		)
		.bind(partnerClientId)
		.all<PartnerAuthAccessLaneRow>();
	return result.results ?? [];
}

export async function findPartnerAccessLaneForIdentity(
	db: D1Database,
	input: {
		authSubject?: string | null;
		email?: string | null;
		accountId?: string | null;
	},
): Promise<PartnerAuthAccessLaneAssignmentRow | null> {
	const normalizedEmail = normalizeEmail(input.email ?? undefined);
	const authSubject = input.authSubject?.trim() || null;

	const query = `SELECT
      lane.*,
      client.partner_key,
      client.slug AS client_slug,
      client.display_name AS client_display_name,
      client.workspace_account_id,
      client.identity_account_id,
      client.identity_tenant_id
     FROM partner_auth_access_lanes lane
     INNER JOIN partner_auth_clients client
       ON client.id = lane.partner_client_id
     WHERE (
         (? IS NOT NULL AND lane.identity_user_id = ?)
         OR (? IS NOT NULL AND lower(COALESCE(lane.owner_email, '')) = ?)
       )
     ORDER BY
       CASE lane.status
         WHEN 'active' THEN 0
         WHEN 'paused' THEN 1
         WHEN 'initialized' THEN 2
         WHEN 'sunset' THEN 3
         ELSE 4
       END,
       lane.updated_at DESC
     LIMIT 1`;

	return db
		.prepare(query)
		.bind(authSubject, authSubject, normalizedEmail, normalizedEmail)
		.first<PartnerAuthAccessLaneAssignmentRow>();
}

export async function listPartnerClients(
	db: D1Database,
	partnerKey: string,
	options: { limit?: number; search?: string } = {}
): Promise<PartnerAuthClientRow[]> {
	const limit = Math.max(1, Math.min(250, options.limit ?? 100));
	const search = options.search?.trim();
	if (search) {
		const pattern = `%${search.toLowerCase()}%`;
		const result = await db
			.prepare(
				`SELECT * FROM partner_auth_clients
         WHERE partner_key = ?
           AND (
             lower(slug) LIKE ?
             OR lower(COALESCE(display_name, '')) LIKE ?
             OR lower(COALESCE(owner_email, '')) LIKE ?
             OR lower(COALESCE(identity_user_id, '')) LIKE ?
             OR lower(COALESCE(identity_account_id, '')) LIKE ?
           )
         ORDER BY updated_at DESC
         LIMIT ?`
			)
			.bind(partnerKey, pattern, pattern, pattern, pattern, pattern, limit)
			.all<PartnerAuthClientRow>();
		return result.results ?? [];
	}

	const result = await db
		.prepare(
			`SELECT * FROM partner_auth_clients
       WHERE partner_key = ?
       ORDER BY updated_at DESC
       LIMIT ?`
		)
		.bind(partnerKey, limit)
		.all<PartnerAuthClientRow>();
	return result.results ?? [];
}

export async function upsertPartnerAccessLane(
	db: D1Database,
	input: {
		id: string;
		partnerClientId: string;
		slug: string;
		displayName: string;
		identityUserId: string | null;
		ownerEmail: string | null;
		hubUrl: string;
		hostKey: string;
		status: PartnerAuthAccessLaneRow['status'];
		toolkitProfile: string[];
		allowedToolPrefixes: string[];
		metadata: Record<string, unknown>;
	},
): Promise<PartnerAuthAccessLaneRow> {
	await db
		.prepare(
			`INSERT INTO partner_auth_access_lanes (
         id, partner_client_id, slug, display_name, identity_user_id, owner_email, hub_url, host_key, status,
         toolkit_profile_json, allowed_tool_prefixes_json, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(partner_client_id, slug) DO UPDATE SET
         display_name = excluded.display_name,
         identity_user_id = excluded.identity_user_id,
         owner_email = excluded.owner_email,
         hub_url = excluded.hub_url,
         host_key = excluded.host_key,
         status = excluded.status,
         toolkit_profile_json = excluded.toolkit_profile_json,
         allowed_tool_prefixes_json = excluded.allowed_tool_prefixes_json,
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')`
		)
		.bind(
			input.id,
			input.partnerClientId,
			normalizePartnerAccessLaneSlug(input.slug),
			input.displayName,
			input.identityUserId,
			normalizeEmail(input.ownerEmail ?? undefined),
			input.hubUrl,
			input.hostKey,
			input.status,
			JSON.stringify(parseToolkitList(input.toolkitProfile)),
			JSON.stringify(normalizeAllowedToolPrefixes(input.allowedToolPrefixes)),
			JSON.stringify(input.metadata),
		)
		.run();

	return (await getPartnerAccessLaneBySlug(db, input.partnerClientId, input.slug))!;
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

function parseIntegerEnv(raw: string | undefined, fallback: number, min: number, max: number): number {
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(min, Math.min(max, parsed));
}

function parseBooleanEnv(raw: string | undefined, fallback = false): boolean {
	if (!raw) return fallback;
	const value = raw.trim().toLowerCase();
	if (!value) return fallback;
	if (['1', 'true', 'yes', 'on'].includes(value)) return true;
	if (['0', 'false', 'no', 'off'].includes(value)) return false;
	return fallback;
}

function partnerAuthzHybridConfig(env: PlatformEnv): HybridEvaluatorConfig {
	const osoUrl = env.OSO_URL?.trim();
	const osoApiKey = env.OSO_API_KEY?.trim();
	if (!osoUrl || !osoApiKey) {
		return { mode: 'legacy' };
	}

	return {
		mode: 'hybrid',
		fallbackEnabled: true,
		oso: {
			url: osoUrl,
			apiKey: osoApiKey,
			fetchTimeoutMillis: parseIntegerEnv(env.OSO_FETCH_TIMEOUT_MS, 5000, 100, 30000),
			bootstrapPolicy: parseBooleanEnv(env.OSO_BOOTSTRAP_POLICY, false),
		},
	};
}

function toPartnerPolicyDecision(decision: AuthorizationDecision): PartnerToolkitPolicyDecision {
	return {
		policy_id: PARTNER_AUTH_GOVERNANCE_POLICY_ID,
		decision: decision.decision,
		evaluation_path: decision.evaluationPath,
		policy_hash: decision.policyHash,
		fallback_used: Boolean(decision.fallbackReason),
		rollout_mode: decision.rolloutMode,
		canary_percent: decision.canaryPercent,
		reason: decision.reason,
	};
}

export async function authorizePartnerToolkitAdminAction(params: {
	request: Request;
	env: PlatformEnv;
	client: PartnerAuthClientRow;
	actor: string;
	actionName: PartnerToolkitAdminActionName;
	accessType: AuthorizationAccessType;
	toolkit: string;
	accountSlug?: string | null;
}): Promise<{
	consent: PartnerAuthConsentRow | null;
	reviewStep: string | null;
	policy: PartnerToolkitPolicyDecision;
}> {
	const { request, env, client, actor, actionName, accessType, toolkit, accountSlug } = params;
	const consent = await getLatestActiveConsent(env.DB, client.id);
	const reviewStep = getPartnerReviewStep(request);
	const manifest = getPolicyManifest(PARTNER_AUTH_GOVERNANCE_POLICY_ID);
	const evaluation = await evaluateAuthorizationRequest(
		PARTNER_AUTH_GOVERNANCE_POLICY_ID,
		{
			actor: {
				accountId: client.identity_account_id ?? client.workspace_account_id,
				tenantId: client.identity_tenant_id ?? null,
				userId: client.identity_user_id ?? null,
				actorId: actor,
				role: 'partner_admin',
				readOnly: false,
				toolMode: 'read_write',
				identitySource: 'partner_admin_key',
			},
			action: {
				name: actionName,
				writeIntent: accessType !== 'read',
				humanReviewStep: Boolean(reviewStep),
				introspectionOk: Boolean(consent),
			},
			resource: {
				kind: 'partner_toolkit_account',
				id: `${client.id}:${normalizeToolkitSlug(toolkit)}:${accountSlug ?? '*'}`,
				toolName: actionName,
				accessType,
				oauthRequired: actionName === 'create_toolkit_connect_link',
				tags: [
					`partner:${HALF_DOZEN_PARTNER_KEY}`,
					`toolkit:${normalizeToolkitSlug(toolkit)}`,
					...(accountSlug ? [`account:${normalizePartnerSlug(accountSlug)}`] : []),
				],
				metadata: {
					client_slug: client.slug,
					workspace_account_id: client.workspace_account_id,
					consent_record_id: consent?.id ?? null,
					review_step: reviewStep,
				},
			},
		},
		{
			mode: manifest.rolloutDefaults?.mode ?? 'legacy_enforce',
			canaryPercent: manifest.rolloutDefaults?.canaryPercent ?? 0,
		},
		partnerAuthzHybridConfig(env),
	);

	const policy = toPartnerPolicyDecision(evaluation.final);
	if (evaluation.final.decision === 'block') {
		throw new PartnerAuthHttpError(403, 'policy_blocked', policy.reason);
	}
	if (evaluation.final.decision === 'require_human_review') {
		throw new PartnerAuthHttpError(
			409,
			'human_review_required',
			`${policy.reason} Add X-Partner-Review-Step with an approval or review reference and retry.`,
		);
	}

	return {
		consent,
		reviewStep,
		policy,
	};
}

export async function insertPartnerAccessDelivery(
	db: D1Database,
	input: {
		id: string;
		partnerClientId: string;
		deliveryType: 'strict_session_bundle' | 'legacy_key_bundle' | 'managed_bearer_bundle';
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

export type { PartnerCredentialIssuanceSurface } from './partner-prospect-issuance.js';
export { isPartnerProspectGraduated, isPartnerProspectRecord } from './partner-prospect-issuance.js';

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

export function assertPartnerCredentialIssuanceAllowed(input: {
	clientMetadata: Record<string, unknown>;
	laneMetadata?: Record<string, unknown>;
	surface: PartnerCredentialIssuanceSurface;
}): void {
	const blocker = getPartnerProspectIssuanceBlocker(input);
	if (!blocker) {
		return;
	}

	throw new PartnerAuthHttpError(
		409,
		'prospect_not_ready',
		blocker,
	);
}

function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i += 1) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}
