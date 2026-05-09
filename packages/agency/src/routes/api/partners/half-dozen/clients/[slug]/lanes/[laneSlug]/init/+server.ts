import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	type PartnerAuthAccessLaneRow,
	PartnerAuthHttpError,
	buildPartnerLaneHubUrl,
	buildPartnerLaneNotionBridgeUrl,
	getPartnerClientBySlug,
	getPartnerAccessLaneBySlug,
	normalizeAllowedToolPrefixes,
	normalizeEmail,
	normalizePartnerAccessLaneSlug,
	normalizePartnerSlug,
	parseJsonArray,
	parseJsonObject,
	parseJsonStringArray,
	parseToolkitList,
	randomId,
	requirePartnerAdmin,
	resolveAllowedToolPrefixes,
	upsertPartnerAccessLane,
} from '$lib/server/partner-auth';
import { reconcileAgencyMcpEntitlement } from '$lib/server/mcp-entitlements';

interface InitLaneRequestBody {
	display_name?: string;
	identity_user_id?: string;
	owner_email?: string;
	hub_url?: string;
	host_key?: string;
	status?: PartnerAuthAccessLaneRow['status'];
	toolkit_profile?: string[];
	allowed_tool_prefixes?: string[];
	metadata?: Record<string, unknown>;
}

const ALLOWED_STATUSES = new Set(['initialized', 'active', 'paused', 'sunset', 'disabled']);
const REQUIRED_LANE_TOOLKITS = ['gmail'];

export const POST: RequestHandler = async ({ request, params, platform }) => {
	try {
		const env = platform?.env;
		if (!env?.DB) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const actor = requirePartnerAdmin(request, env);
		const clientSlug = normalizePartnerSlug(params.slug);
		const laneSlug = normalizePartnerAccessLaneSlug(params.laneSlug);
		if (!clientSlug || !laneSlug) {
			return json({ error: 'invalid_request', message: 'Client slug and lane slug are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, clientSlug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}

		const body = (await request.json().catch(() => null)) as InitLaneRequestBody | null;
		if (!body || typeof body !== 'object') {
			return json({ error: 'invalid_request', message: 'Invalid JSON body' }, { status: 400 });
		}

		const existing = await getPartnerAccessLaneBySlug(env.DB, client.id, laneSlug);
		const existingMetadata = parseJsonObject(existing?.metadata_json);
		const incomingMetadata =
			body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
		const clientMetadata = parseJsonObject(client.metadata_json);
		const clientRequiredToolkits = parseJsonArray(client.required_toolkits_json);
		const baselineToolkitProfile = parseToolkitList([...clientRequiredToolkits, ...REQUIRED_LANE_TOOLKITS]);
		const toolkitProfile =
			body.toolkit_profile !== undefined
				? parseToolkitList([...body.toolkit_profile, ...baselineToolkitProfile])
				: existing
					? parseToolkitList([...parseJsonArray(existing.toolkit_profile_json), ...baselineToolkitProfile])
					: baselineToolkitProfile;
		const notionServerName = `notion-halfdozen-${client.slug}`;
		const notionBridgeUrl =
			typeof incomingMetadata.notion_bridge_url === 'string' && incomingMetadata.notion_bridge_url.trim().length > 0
				? incomingMetadata.notion_bridge_url.trim()
				: buildPartnerLaneNotionBridgeUrl(client.slug);
		const existingAllowedToolPrefixes = existing ? parseJsonStringArray(existing.allowed_tool_prefixes_json) : [];
		const explicitAllowedToolPrefixes =
			body.allowed_tool_prefixes !== undefined
				? normalizeAllowedToolPrefixes(body.allowed_tool_prefixes)
				: existingAllowedToolPrefixes;
		const allowedToolPrefixes = resolveAllowedToolPrefixes(toolkitProfile, [
			`${notionServerName}__`,
			...explicitAllowedToolPrefixes,
		]);
		const displayName =
			body.display_name?.trim() || existing?.display_name || defaultLaneDisplayName(laneSlug, client.slug, client.display_name);
		const canonicalHubUrl = buildPartnerLaneHubUrl(laneSlug);
		if (body.hub_url?.trim() && body.hub_url.trim() !== canonicalHubUrl) {
			return json(
				{
					error: 'invalid_request',
					message: `hub_url must match the canonical named-lane URL: ${canonicalHubUrl}`,
				},
				{ status: 400 },
			);
		}
		const canonicalHostKey = laneSlug;
		if (body.host_key && normalizePartnerAccessLaneSlug(body.host_key) !== canonicalHostKey) {
			return json(
				{
					error: 'invalid_request',
					message: `host_key must match the lane slug: ${canonicalHostKey}`,
				},
				{ status: 400 },
			);
		}
		const hubUrl = canonicalHubUrl;
		const hostKey = canonicalHostKey;
		const status =
			body.status && ALLOWED_STATUSES.has(body.status) ? body.status : existing?.status ?? client.status ?? 'active';
		const ownerEmail = normalizeEmail(body.owner_email) ?? existing?.owner_email ?? client.owner_email ?? null;
		const identityUserId =
			normalizeOptionalId(body.identity_user_id) ?? existing?.identity_user_id ?? client.identity_user_id ?? null;
		const approvedException = mergeApprovedException(
			existingMetadata,
			incomingMetadata,
			laneSlug,
			displayName,
			hubUrl,
		);
		const metadata = {
			...clientMetadata,
			...existingMetadata,
			...incomingMetadata,
			credential_source: 'Partner-managed named lane',
			notion_server_name: notionServerName,
			notion_bridge_url: notionBridgeUrl,
			hub_worker_name: `cs-hub-${laneSlug}`,
			hub_url: hubUrl,
			host_key: hostKey,
			client_slug: client.slug,
			client_display_name: client.display_name,
			lane_slug: laneSlug,
			display_name: displayName,
			required_toolkits: REQUIRED_LANE_TOOLKITS,
			observability_baseline: {
				telemetry: true,
				braintrust: true,
			},
			approved_exception: approvedException,
			last_updated_by: actor,
		};

		const lane = await upsertPartnerAccessLane(env.DB, {
			id: existing?.id ?? randomId('palane'),
			partnerClientId: client.id,
			slug: laneSlug,
			displayName,
			identityUserId,
			ownerEmail,
			hubUrl,
			hostKey,
			status,
			toolkitProfile,
			allowedToolPrefixes,
			metadata,
		});

		if (identityUserId) {
			await reconcileAgencyMcpEntitlement(env.DB, {
				authSubject: identityUserId,
				authEmail: ownerEmail,
				accountId: client.identity_account_id ?? client.workspace_account_id,
				tenantId: client.identity_tenant_id ?? client.slug,
				workspaceAccountId: client.workspace_account_id,
				serviceTier: 'mcp_only',
				metadata: {
					approved_exception: approvedException,
					partner_access_lane_slug: lane.slug,
					partner_access_lane_url: lane.hub_url,
					partner_access_lane_host_key: lane.host_key,
				},
			});
		}

		return json({
			client_slug: client.slug,
			lane: serializeLane(lane),
		});
	} catch (error) {
		if (error instanceof PartnerAuthHttpError) {
			return json({ error: error.code, message: error.message }, { status: error.status });
		}

		return json(
			{
				error: 'internal_error',
				message: error instanceof Error ? error.message : 'Unexpected error',
			},
			{ status: 500 },
		);
	}
};

function normalizeOptionalId(raw: string | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim();
	return value ? value.slice(0, 255) : null;
}

function titleizeSlug(raw: string): string {
	return raw
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function defaultLaneDisplayName(laneSlug: string, clientSlug: string, clientDisplayName: string | null): string {
	const suffix = `-${clientSlug}`;
	const personSlug = laneSlug.endsWith(suffix) ? laneSlug.slice(0, -suffix.length) : laneSlug;
	const personLabel = titleizeSlug(personSlug);
	const clientLabel = clientDisplayName?.trim() || titleizeSlug(clientSlug);
	return `${personLabel} — ${clientLabel}`;
}

function mergeApprovedException(
	existingMetadata: Record<string, unknown>,
	incomingMetadata: Record<string, unknown>,
	laneSlug: string,
	displayName: string,
	hubUrl: string,
): Record<string, unknown> {
	const existing = asMetadataObject(existingMetadata.approved_exception);
	const incoming = asMetadataObject(incomingMetadata.approved_exception);
	return {
		exception_type: 'named_lane_mcp_only_pilot',
		approved_by: typeof incoming.approved_by === 'string' ? incoming.approved_by : existing.approved_by ?? 'mj',
		approved_at:
			typeof incoming.approved_at === 'string'
				? incoming.approved_at
				: typeof existing.approved_at === 'string'
					? existing.approved_at
					: new Date().toISOString(),
		reason:
			typeof incoming.reason === 'string'
				? incoming.reason
				: typeof existing.reason === 'string'
					? existing.reason
					: `Transparent named-lane readiness-map pilot for ${displayName}`,
		allowed_scope:
			typeof incoming.allowed_scope === 'string'
				? incoming.allowed_scope
				: `interactive_named_lane:${laneSlug}`,
		expiration_or_review_date:
			typeof incoming.expiration_or_review_date === 'string'
				? incoming.expiration_or_review_date
				: typeof existing.expiration_or_review_date === 'string'
					? existing.expiration_or_review_date
					: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
		graduation_target:
			typeof incoming.graduation_target === 'string'
				? incoming.graduation_target
				: typeof existing.graduation_target === 'string'
					? existing.graduation_target
					: 'policy_os_trial',
		lane_slug: laneSlug,
		hub_url: hubUrl,
	};
}

function asMetadataObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function serializeLane(lane: PartnerAuthAccessLaneRow) {
	return {
		id: lane.id,
		slug: lane.slug,
		display_name: lane.display_name,
		identity_user_id: lane.identity_user_id,
		owner_email: lane.owner_email,
		hub_url: lane.hub_url,
		host_key: lane.host_key,
		status: lane.status,
		toolkit_profile: parseJsonArray(lane.toolkit_profile_json),
		allowed_tool_prefixes: normalizeAllowedToolPrefixes(parseJsonStringArray(lane.allowed_tool_prefixes_json)),
		metadata: parseJsonObject(lane.metadata_json),
		created_at: lane.created_at,
		updated_at: lane.updated_at,
	};
}
