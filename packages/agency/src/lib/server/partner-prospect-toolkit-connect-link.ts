import {
	HALF_DOZEN_PARTNER_KEY,
	defaultToolkitComposioUserId,
	getComposioClient,
	getPartnerAccessLaneBySlug,
	getPartnerClientBySlug,
	isPartnerProspectGraduated,
	isPartnerProspectRecord,
	normalizePartnerAccessLaneSlug,
	normalizePartnerSlug,
	normalizeToolkitSlug,
	parseJsonArray,
	parseJsonObject,
	randomId,
	resolveAuthConfigId,
	type PartnerAuthHttpError,
	type PartnerAuthToolkitAccountRow,
} from './partner-auth.js';
import { requireAgencySessionUser } from './mcp-token.js';
import { createPartnerProspectToolkitConnectLinkPostHandler } from './partner-prospect-toolkit-connect-link-core.js';

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

export function createPartnerProspectToolkitConnectLinkPostHandlerWithDefaults() {
	return createPartnerProspectToolkitConnectLinkPostHandler({
		partnerKey: HALF_DOZEN_PARTNER_KEY,
		defaultToolkitComposioUserId,
		findToolkitAccount,
		getComposioClient,
		getPartnerAccessLaneBySlug,
		getPartnerClientBySlug,
		insertToolkitEvent,
		isProspectGraduated: isPartnerProspectGraduated,
		isProspectRecord: isPartnerProspectRecord,
		normalizePartnerAccessLaneSlug,
		normalizePartnerSlug,
		normalizeToolkitSlug,
		parseJsonArray,
		parseJsonObject,
		randomId,
		requireAgencySessionUser,
		resolveAuthConfigId,
		upsertToolkitAccount,
		isHttpError: (error): error is PartnerAuthHttpError =>
			Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error),
	});
}
