import {
	getComposioClient,
	normalizeToolkitSlug,
	parseJsonObject,
	type PartnerAuthToolkitAccountRow,
} from './partner-auth.js';
import {
	attachProspectToolkitAccounts,
	type ProspectWithToolkitAccounts,
} from './partner-prospect-toolkit-status-core.js';

interface ConnectedAccountShape {
	id?: string;
	nanoid?: string;
	status?: string;
	userId?: string;
	entityId?: string;
	authConfigId?: string;
	toolkit?: {
		slug?: string;
		name?: string;
	};
	appName?: string;
	app?: string;
	createdAt?: string;
	updatedAt?: string;
}

async function listToolkitAccounts(
	db: D1Database,
	partnerClientId: string,
): Promise<PartnerAuthToolkitAccountRow[]> {
	const result = await db
		.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
       WHERE partner_client_id = ?
       ORDER BY toolkit ASC, account_slug ASC`,
		)
		.bind(partnerClientId)
		.all<PartnerAuthToolkitAccountRow>();
	return result.results ?? [];
}

async function listToolkitAccountsForClientIds(
	db: D1Database,
	partnerClientIds: string[],
): Promise<PartnerAuthToolkitAccountRow[]> {
	if (partnerClientIds.length === 0) {
		return [];
	}

	const placeholders = partnerClientIds.map(() => '?').join(', ');
	const result = await db
		.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
	       WHERE partner_client_id IN (${placeholders})
	       ORDER BY partner_client_id ASC, toolkit ASC, account_slug ASC`,
		)
		.bind(...partnerClientIds)
		.all<PartnerAuthToolkitAccountRow>();
	return result.results ?? [];
}

async function updateToolkitAccountSyncState(
	db: D1Database,
	input: {
		id: string;
		connectedAccountId: string | null;
		connectionStatus: string;
		lastCheckedAt: string;
		connectedAt: string | null;
	},
): Promise<void> {
	await db
		.prepare(
			`UPDATE partner_auth_toolkit_accounts
       SET connected_account_id = ?,
           connection_status = ?,
           last_checked_at = ?,
           connected_at = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
		)
		.bind(
			input.connectedAccountId,
			input.connectionStatus,
			input.lastCheckedAt,
			input.connectedAt,
			input.id,
		)
		.run();
}

function createConnectedAccountLister(env: App.Platform['env'] | undefined) {
	if (!env?.DB || !env.COMPOSIO_API_KEY?.trim()) {
		return undefined;
	}

	return async (userIds: string[]): Promise<ConnectedAccountShape[]> => {
		if (userIds.length === 0) {
			return [];
		}

		const composio = getComposioClient(env);
		const response = await composio.connectedAccounts.list({ userIds });
		const items = Array.isArray((response as { items?: unknown[] }).items)
			? (response as { items: unknown[] }).items
			: Array.isArray(response)
				? response
				: [];
		return items.filter((item): item is ConnectedAccountShape => Boolean(item && typeof item === 'object'));
	};
}

export async function attachProspectToolkitAccountsForAgencyUser<TProspect extends { client: { id: string }; prospect_claim: { state: 'claimable' | 'claimed_by_you' | 'claimed_by_other'; can_claim_now: boolean } }>(
	input: {
		db: D1Database;
		env?: App.Platform['env'];
		prospects: TProspect[];
	},
): Promise<Array<ProspectWithToolkitAccounts<TProspect>>> {
		return attachProspectToolkitAccounts(
			{
				listToolkitAccounts,
				listToolkitAccountsForClientIds,
				listConnectedAccounts: createConnectedAccountLister(input.env),
				normalizeToolkitSlug,
			parseJsonObject,
			updateToolkitAccountSyncState,
		},
		{
			db: input.db,
			prospects: input.prospects,
		},
	);
}
