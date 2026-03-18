interface ProspectLike {
	client: {
		id: string;
	};
	prospect_claim: {
		state: 'claimable' | 'claimed_by_you' | 'claimed_by_other';
		can_claim_now: boolean;
	};
}

interface ToolkitAccountRowLike {
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
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

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

interface NormalizedConnectedAccount {
	connected_account_id: string | null;
	user_id: string | null;
	toolkit: string | null;
	status: string;
	auth_config_id: string | null;
	created_at: string | null;
	updated_at: string | null;
}

export interface ProspectToolkitAccountStatus {
	id: string;
	toolkit: string;
	account_slug: string;
	display_label: string | null;
	composio_user_id: string;
	auth_config_id: string | null;
	connected_account_id: string | null;
	connection_status: string;
	connected: boolean;
	status: ToolkitAccountRowLike['status'];
	sync_enabled: boolean;
	last_checked_at: string | null;
	connected_at: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

export type ProspectWithToolkitAccounts<TProspect extends ProspectLike = ProspectLike> = TProspect & {
	toolkit_accounts: ProspectToolkitAccountStatus[];
};

export interface PartnerProspectToolkitStatusDeps {
	listToolkitAccounts: (
		db: D1Database,
		partnerClientId: string,
	) => Promise<ToolkitAccountRowLike[]>;
	listConnectedAccounts?: (userIds: string[]) => Promise<ConnectedAccountShape[]>;
	normalizeToolkitSlug: (value: string) => string;
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	updateToolkitAccountSyncState?: (
		db: D1Database,
		input: {
			id: string;
			connectedAccountId: string | null;
			connectionStatus: string;
			lastCheckedAt: string;
			connectedAt: string | null;
		},
	) => Promise<void>;
	now?: () => string;
}

const TOOLKIT_STATUS_REFRESH_MS = 5 * 60 * 1000;

export async function attachProspectToolkitAccounts<TProspect extends ProspectLike>(
	deps: PartnerProspectToolkitStatusDeps,
	input: {
		db: D1Database;
		prospects: TProspect[];
	},
): Promise<Array<ProspectWithToolkitAccounts<TProspect>>> {
	const now = deps.now?.() ?? new Date().toISOString();
	const claimedProspects = input.prospects.filter(
		(prospect) => prospect.prospect_claim.state === 'claimed_by_you',
	);
	if (claimedProspects.length === 0) {
		return input.prospects.map((prospect) => ({ ...prospect, toolkit_accounts: [] }));
	}

	const toolkitAccountsByClient = new Map<string, ToolkitAccountRowLike[]>();
	await Promise.all(
		claimedProspects.map(async (prospect) => {
			const accounts = await deps.listToolkitAccounts(input.db, prospect.client.id);
			toolkitAccountsByClient.set(prospect.client.id, accounts);
		}),
	);

	const refreshableRows = [...toolkitAccountsByClient.values()]
		.flat()
		.filter((row) => shouldRefreshToolkitAccount(row, now));
	const remoteAccounts = deps.listConnectedAccounts
		? await listConnectedAccountsSafely(deps, refreshableRows)
		: [];

	const accountsByClient = new Map<string, ProspectToolkitAccountStatus[]>();
	for (const [clientId, rows] of toolkitAccountsByClient) {
		const hydrated = await Promise.all(
			rows.map((row) => hydrateToolkitAccount(row, remoteAccounts, input.db, deps, now)),
		);
		accountsByClient.set(clientId, hydrated);
	}

	return input.prospects.map((prospect) => ({
		...prospect,
		toolkit_accounts: accountsByClient.get(prospect.client.id) ?? [],
	}));
}

async function listConnectedAccountsSafely(
	deps: PartnerProspectToolkitStatusDeps,
	rows: ToolkitAccountRowLike[],
): Promise<NormalizedConnectedAccount[]> {
	if (!deps.listConnectedAccounts || rows.length === 0) {
		return [];
	}

	const userIds = [...new Set(rows.map((row) => row.composio_user_id).filter(Boolean))];
	if (userIds.length === 0) {
		return [];
	}

	try {
		const remoteAccounts = await deps.listConnectedAccounts(userIds);
		return remoteAccounts
			.map((account) => normalizeConnectedAccount(account, deps))
			.filter((account): account is NormalizedConnectedAccount => Boolean(account));
	} catch {
		return [];
	}
}

async function hydrateToolkitAccount(
	row: ToolkitAccountRowLike,
	remoteAccounts: NormalizedConnectedAccount[],
	db: D1Database,
	deps: PartnerProspectToolkitStatusDeps,
	now: string,
): Promise<ProspectToolkitAccountStatus> {
	const remoteMatch = findBestConnectedAccountMatch(row, remoteAccounts);
	const lastCheckedAt = shouldRefreshToolkitAccount(row, now) ? now : row.last_checked_at;
	const connectionStatus = remoteMatch?.status ?? row.connection_status;
	const connectedAccountId = remoteMatch?.connected_account_id ?? row.connected_account_id;
	const connectedAt =
		connectionStatus === 'ACTIVE'
			? row.connected_at ?? remoteMatch?.created_at ?? now
			: row.connected_at;

	if (
		deps.updateToolkitAccountSyncState &&
		shouldPersistToolkitAccountSync(row, {
			connectedAccountId,
			connectionStatus,
			lastCheckedAt,
			connectedAt,
		})
	) {
		await deps.updateToolkitAccountSyncState(db, {
			id: row.id,
			connectedAccountId,
			connectionStatus,
			lastCheckedAt: lastCheckedAt ?? now,
			connectedAt,
		});
	}

	return {
		id: row.id,
		toolkit: row.toolkit,
		account_slug: row.account_slug,
		display_label: row.display_label,
		composio_user_id: row.composio_user_id,
		auth_config_id: remoteMatch?.auth_config_id ?? row.auth_config_id,
		connected_account_id: connectedAccountId,
		connection_status: connectionStatus,
		connected: connectionStatus === 'ACTIVE',
		status: row.status,
		sync_enabled: Boolean(row.sync_enabled),
		last_checked_at: lastCheckedAt,
		connected_at: connectedAt,
		metadata: deps.parseJsonObject(row.metadata_json),
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

function shouldRefreshToolkitAccount(row: ToolkitAccountRowLike, now: string): boolean {
	if (row.status !== 'active' || !row.sync_enabled || !row.composio_user_id) {
		return false;
	}
	if (!row.last_checked_at) {
		return true;
	}
	if (String(row.connection_status).toUpperCase() === 'INITIATED') {
		return true;
	}
	const checkedAt = Date.parse(row.last_checked_at);
	const nowMs = Date.parse(now);
	if (!Number.isFinite(checkedAt) || !Number.isFinite(nowMs)) {
		return true;
	}
	return nowMs - checkedAt >= TOOLKIT_STATUS_REFRESH_MS;
}

function normalizeConnectedAccount(
	account: ConnectedAccountShape,
	deps: Pick<PartnerProspectToolkitStatusDeps, 'normalizeToolkitSlug'>,
): NormalizedConnectedAccount | null {
	if (!account || typeof account !== 'object') {
		return null;
	}
	const toolkit = deps.normalizeToolkitSlug(
		account.toolkit?.slug ?? account.appName ?? account.app ?? account.toolkit?.name ?? '',
	);
	const connectedAccountId = (account.id ?? account.nanoid ?? '').trim() || null;
	const userId = (account.userId ?? account.entityId ?? '').trim() || null;
	if (!connectedAccountId && !userId) {
		return null;
	}
	return {
		connected_account_id: connectedAccountId,
		user_id: userId,
		toolkit: toolkit || null,
		status: String(account.status ?? 'UNKNOWN').toUpperCase(),
		auth_config_id: account.authConfigId ?? null,
		created_at: account.createdAt ?? null,
		updated_at: account.updatedAt ?? null,
	};
}

function findBestConnectedAccountMatch(
	row: ToolkitAccountRowLike,
	remoteAccounts: NormalizedConnectedAccount[],
): NormalizedConnectedAccount | null {
	const candidates = remoteAccounts.filter((account) => {
		const connectedAccountMatches =
			Boolean(row.connected_account_id) && account.connected_account_id === row.connected_account_id;
		const userIdMatches = Boolean(account.user_id) && account.user_id === row.composio_user_id;
		return connectedAccountMatches || userIdMatches;
	});
	if (candidates.length === 0) {
		return null;
	}

	const ranked = [...candidates].sort((left, right) => {
		const scoreDifference = connectedAccountMatchScore(row, right) - connectedAccountMatchScore(row, left);
		if (scoreDifference !== 0) {
			return scoreDifference;
		}
		return compareIsoDate(right.updated_at ?? right.created_at, left.updated_at ?? left.created_at);
	});
	const best = ranked[0]!;
	return isReliableConnectedAccountMatch(row, best, candidates.length) ? best : null;
}

function connectedAccountMatchScore(
	row: ToolkitAccountRowLike,
	account: NormalizedConnectedAccount,
): number {
	let score = 0;
	if (row.connected_account_id && account.connected_account_id === row.connected_account_id) {
		score += 100;
	}
	if (account.status === 'ACTIVE') {
		score += 25;
	}
	if (row.auth_config_id && account.auth_config_id === row.auth_config_id) {
		score += 10;
	}
	if (account.toolkit && account.toolkit === row.toolkit) {
		score += 5;
	}
	if (row.account_slug === 'primary') {
		score += 2;
	}
	return score;
}

function isReliableConnectedAccountMatch(
	row: ToolkitAccountRowLike,
	account: NormalizedConnectedAccount,
	candidateCount: number,
): boolean {
	if (row.connected_account_id && account.connected_account_id === row.connected_account_id) {
		return true;
	}
	if (row.auth_config_id && account.auth_config_id === row.auth_config_id) {
		return true;
	}
	if (account.toolkit && account.toolkit === row.toolkit) {
		return true;
	}
	return candidateCount === 1 && !row.auth_config_id && !account.auth_config_id;
}

function compareIsoDate(left: string | null | undefined, right: string | null | undefined): number {
	const leftMs = left ? Date.parse(left) : Number.NaN;
	const rightMs = right ? Date.parse(right) : Number.NaN;
	if (!Number.isFinite(leftMs) && !Number.isFinite(rightMs)) {
		return 0;
	}
	if (!Number.isFinite(leftMs)) {
		return -1;
	}
	if (!Number.isFinite(rightMs)) {
		return 1;
	}
	return leftMs - rightMs;
}

function shouldPersistToolkitAccountSync(
	row: ToolkitAccountRowLike,
	input: {
		connectedAccountId: string | null;
		connectionStatus: string;
		lastCheckedAt: string | null;
		connectedAt: string | null;
	},
): boolean {
	return (
		row.connected_account_id !== input.connectedAccountId ||
		row.connection_status !== input.connectionStatus ||
		row.last_checked_at !== input.lastCheckedAt ||
		row.connected_at !== input.connectedAt
	);
}
