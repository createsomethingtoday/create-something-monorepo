import {
	getComposioClient,
	normalizePartnerSlug,
	normalizeToolkitSlug,
	parseJsonObject,
	randomId,
	resolveAuthConfigId,
	defaultToolkitComposioUserId,
	type PartnerAuthClientRow,
	type PartnerAuthHttpError,
	type PartnerAuthToolkitAccountRow,
} from './partner-auth.js';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from './mcp-token.js';
import { listMcpAccessAssignments, type McpAccessAssignment } from './mcp-access-assignments.js';
import { isToolkitAuthorized } from './mcp-tools.js';
import { createLegacyLaneToolkitConnectLinkPostHandler } from './legacy-lane-toolkit-connect-link-core.js';

const LEGACY_MCP_ACCESS_PARTNER_KEY = 'agency-legacy';

async function findPartnerClientByWorkspaceAccountId(
	db: D1Database,
	workspaceAccountId: string,
): Promise<PartnerAuthClientRow | null> {
	return db
		.prepare(
			`SELECT * FROM partner_auth_clients
       WHERE workspace_account_id = ?
       LIMIT 1`,
		)
		.bind(workspaceAccountId)
		.first<PartnerAuthClientRow>();
}

async function ensureLegacyClientBinding(
	db: D1Database,
	input: {
		assignment: McpAccessAssignment;
		user: { id: string; email: string };
	},
): Promise<PartnerAuthClientRow> {
	const workspaceAccountId = input.assignment.workspaceAccountId ?? input.assignment.accountId;
	if (!workspaceAccountId) {
		throw new Error('Legacy access lane is missing a workspace account binding');
	}

	const existing = await findPartnerClientByWorkspaceAccountId(db, workspaceAccountId);
	if (existing) {
		if (existing.partner_key === LEGACY_MCP_ACCESS_PARTNER_KEY) {
			const metadata = {
				...parseJsonObject(existing.metadata_json),
				legacy_shared_auth_lane: true,
				legacy_lane_key: input.assignment.laneKey,
				host_key: input.assignment.hostKey,
				bridge_url: input.assignment.bridgeUrl,
				bridge_username: input.assignment.bridgeUsername,
				credential_source: input.assignment.credentialSource,
				toolkit_profile: input.assignment.toolkitProfile,
				allowed_tool_prefixes: input.assignment.allowedToolPrefixes,
				last_updated_by: `agency:${input.user.id}`,
				updated_via: 'legacy_shared_auth_self_service',
			};
			await db
				.prepare(
					`UPDATE partner_auth_clients
           SET display_name = ?, identity_account_id = ?, identity_user_id = ?, identity_tenant_id = ?,
               owner_email = ?, status = 'active', required_toolkits_json = ?, metadata_json = ?,
               updated_at = datetime('now')
           WHERE id = ?`,
				)
				.bind(
					input.assignment.displayName,
					input.assignment.accountId ?? workspaceAccountId,
					input.user.id,
					input.assignment.tenantId ?? input.assignment.laneKey,
					input.user.email,
					JSON.stringify(input.assignment.toolkitProfile),
					JSON.stringify(metadata),
					existing.id,
				)
				.run();
			return (await findPartnerClientByWorkspaceAccountId(db, workspaceAccountId)) ?? existing;
		}

		return existing;
	}

	const slug = normalizePartnerSlug(`legacy-${input.assignment.laneKey}-${workspaceAccountId}`) || `legacy-${input.assignment.laneKey}`;
	const metadata = {
		legacy_shared_auth_lane: true,
		legacy_lane_key: input.assignment.laneKey,
		host_key: input.assignment.hostKey,
		bridge_url: input.assignment.bridgeUrl,
		bridge_username: input.assignment.bridgeUsername,
		credential_source: input.assignment.credentialSource,
		toolkit_profile: input.assignment.toolkitProfile,
		allowed_tool_prefixes: input.assignment.allowedToolPrefixes,
		created_via: 'legacy_shared_auth_self_service',
		last_updated_by: `agency:${input.user.id}`,
	};

	await db
		.prepare(
			`INSERT INTO partner_auth_clients (
         id, partner_key, slug, display_name, workspace_account_id, identity_account_id,
         identity_user_id, identity_tenant_id, owner_email, status, required_toolkits_json, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
		)
		.bind(
			randomId('pacli'),
			LEGACY_MCP_ACCESS_PARTNER_KEY,
			slug,
			input.assignment.displayName,
			workspaceAccountId,
			input.assignment.accountId ?? workspaceAccountId,
			input.user.id,
			input.assignment.tenantId ?? input.assignment.laneKey,
			input.user.email,
			JSON.stringify(input.assignment.toolkitProfile),
			JSON.stringify(metadata),
		)
		.run();

	return (await findPartnerClientByWorkspaceAccountId(db, workspaceAccountId))!;
}

async function findToolkitAccount(
	db: D1Database,
	input: { partnerClientId: string; toolkit: string; accountSlug: string },
): Promise<PartnerAuthToolkitAccountRow | null> {
	return db
		.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
       WHERE partner_client_id = ? AND toolkit = ? AND account_slug = ?
       LIMIT 1`,
		)
		.bind(input.partnerClientId, input.toolkit, input.accountSlug)
		.first<PartnerAuthToolkitAccountRow>();
}

async function upsertToolkitAccount(
	db: D1Database,
	input: {
		id?: string;
		partnerClientId: string;
		toolkit: string;
		accountSlug: string;
		displayLabel: string;
		composioUserId: string;
		authConfigId: string;
		connectedAccountId: string | null;
		connectionStatus: string;
		syncEnabled: boolean;
		metadata: Record<string, unknown>;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO partner_auth_toolkit_accounts (
         id, partner_client_id, toolkit, account_slug, display_label, composio_user_id, auth_config_id,
         connected_account_id, connection_status, status, sync_enabled, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
       ON CONFLICT(partner_client_id, toolkit, account_slug) DO UPDATE SET
         display_label = excluded.display_label,
         composio_user_id = excluded.composio_user_id,
         auth_config_id = excluded.auth_config_id,
         connected_account_id = COALESCE(excluded.connected_account_id, partner_auth_toolkit_accounts.connected_account_id),
         connection_status = excluded.connection_status,
         sync_enabled = excluded.sync_enabled,
         metadata_json = excluded.metadata_json,
         updated_at = datetime('now')`,
		)
		.bind(
			input.id,
			input.partnerClientId,
			input.toolkit,
			input.accountSlug,
			input.displayLabel,
			input.composioUserId,
			input.authConfigId,
			input.connectedAccountId,
			input.connectionStatus,
			input.syncEnabled ? 1 : 0,
			JSON.stringify(input.metadata),
		)
		.run();
}

async function insertToolkitEvent(
	db: D1Database,
	input: {
		partnerClientId: string;
		toolkit: string;
		accountSlug: string;
		eventType: string;
		actor: string;
		metadata: Record<string, unknown>;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO partner_auth_toolkit_events (
         id, partner_client_id, toolkit, account_slug, event_type, actor, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			randomId('patoolevent'),
			input.partnerClientId,
			input.toolkit,
			input.accountSlug,
			input.eventType,
			input.actor,
			JSON.stringify(input.metadata),
		)
		.run();
}

export function createLegacyLaneToolkitConnectLinkPostHandlerWithDefaults() {
	return createLegacyLaneToolkitConnectLinkPostHandler({
		defaultToolkitComposioUserId,
		ensureAgencyMcpEntitlement: ({ platform, user }) =>
			ensureAgencyMcpEntitlement({
				platform,
				user,
			}),
		ensureLegacyClientBinding,
		findToolkitAccount,
		getComposioClient,
		insertToolkitEvent,
		isToolkitAuthorized,
		listMcpAccessAssignments: (db, input) => listMcpAccessAssignments(db, input),
		normalizePartnerSlug,
		normalizeToolkitSlug,
		parseJsonObject,
		randomId,
		requireAgencySessionUser: ({ cookies, platform }) =>
			requireAgencySessionUser({
				cookies: cookies as Parameters<typeof requireAgencySessionUser>[0]['cookies'],
				platform,
			}),
		resolveAuthConfigId,
		upsertToolkitAccount,
		isHttpError: (error): error is PartnerAuthHttpError =>
			Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error),
	});
}
