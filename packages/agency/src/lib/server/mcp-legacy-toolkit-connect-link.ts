import type { McpAccessAssignment } from './mcp-access-assignments.js';
import { listMcpAccessAssignments } from './mcp-access-assignments.js';
import {
	buildLegacyToolkitBindingId,
	buildLegacyToolkitBindingSlug,
	normalizeLegacyLaneKey,
} from './mcp-legacy-toolkit-bindings.js';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from './mcp-token.js';
import {
	defaultToolkitComposioUserId,
	getComposioClient,
	normalizePartnerSlug,
	normalizeToolkitSlug,
	parseJsonObject,
	randomId,
	resolveAuthConfigId,
	type PartnerAuthHttpError,
	type PartnerAuthToolkitAccountRow,
} from './partner-auth.js';
import { createLegacyMcpToolkitConnectLinkPostHandler } from './mcp-legacy-toolkit-connect-link-core.js';

async function resolveAccessAssignment(input: {
	db: D1Database;
	laneKey: string;
	platform: App.Platform | undefined;
	user: { id: string; email: string };
}): Promise<McpAccessAssignment | null> {
	const { row } = await ensureAgencyMcpEntitlement({
		platform: input.platform,
		user: input.user,
	});
	const assignments = await listMcpAccessAssignments(input.db, {
		email: input.user.email,
		accountId: row.account_id,
		tenantId: row.tenant_id,
		workspaceAccountId: row.workspace_account_id,
		authSubject: input.user.id,
	});
	const laneKey = normalizeLegacyLaneKey(input.laneKey);
	return assignments.find((assignment) => normalizeLegacyLaneKey(assignment.laneKey) === laneKey) ?? null;
}

async function findToolkitAccount(
	db: D1Database,
	input: { bindingId: string; toolkit: string; accountSlug: string },
): Promise<PartnerAuthToolkitAccountRow | null> {
	return db
		.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
       WHERE partner_client_id = ? AND toolkit = ? AND account_slug = ?
       LIMIT 1`,
		)
		.bind(input.bindingId, input.toolkit, input.accountSlug)
		.first<PartnerAuthToolkitAccountRow>();
}

async function upsertToolkitAccount(
	db: D1Database,
	input: {
		id?: string;
		bindingId: string;
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
			input.bindingId,
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
		bindingId: string;
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
			input.bindingId,
			input.toolkit,
			input.accountSlug,
			input.eventType,
			input.actor,
			JSON.stringify(input.metadata),
		)
		.run();
}

export function createLegacyMcpToolkitConnectLinkPostHandlerWithDefaults() {
	return createLegacyMcpToolkitConnectLinkPostHandler({
		buildBindingId: buildLegacyToolkitBindingId,
		buildBindingSlug: buildLegacyToolkitBindingSlug,
		defaultToolkitComposioUserId,
		findToolkitAccount,
		getComposioClient,
		insertToolkitEvent,
		normalizeAccountSlug: normalizePartnerSlug,
		normalizeLegacyLaneKey,
		normalizeToolkitSlug,
		parseJsonObject,
		randomId,
		requireAgencySessionUser: ({ cookies, platform }) =>
			requireAgencySessionUser({
				cookies: cookies as Parameters<typeof requireAgencySessionUser>[0]['cookies'],
				platform,
			}),
		resolveAccessAssignment,
		resolveAuthConfigId,
		upsertToolkitAccount,
		isHttpError: (error): error is PartnerAuthHttpError =>
			Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error),
	});
}
