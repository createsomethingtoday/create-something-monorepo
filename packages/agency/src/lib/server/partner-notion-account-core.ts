interface NotionAccountRowLike {
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

interface NotionAccountUpsertRowLike {
	display_label: string | null;
	composio_user_id: string;
	sync_enabled: number;
	status: 'active' | 'disabled' | 'revoked';
	metadata_json: string;
}

export interface PartnerNotionAccountStatus {
	id: string;
	account_slug: string;
	display_label: string | null;
	composio_user_id: string;
	auth_config_id: string | null;
	connected_account_id: string | null;
	connection_status: string;
	connected: boolean;
	status: NotionAccountRowLike['status'];
	sync_enabled: boolean;
	last_checked_at: string | null;
	connected_at: string | null;
	disabled_at: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

export interface PartnerNotionAccountStatusDeps {
	listConnectedAccounts?: (userIds: string[]) => Promise<ConnectedAccountShape[]>;
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	updateNotionAccountSyncState?: (
		db: D1Database,
		input: {
			id: string;
			authConfigId: string | null;
			connectedAccountId: string | null;
			connectionStatus: string;
			lastCheckedAt: string;
			connectedAt: string | null;
		},
	) => Promise<void>;
	now?: () => string;
}

export interface ResolveNotionAccountUpsertInput {
	existing?: NotionAccountUpsertRowLike | null;
	accountSlug: string;
	clientSlug: string;
	actor: string;
	authConfigId: string;
	displayLabel?: string | null;
	syncEnabled?: boolean;
	metadata?: Record<string, unknown>;
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
}

export interface ResolvedNotionAccountUpsert {
	displayLabel: string;
	syncEnabled: boolean;
	composioUserId: string;
	metadata: Record<string, unknown>;
	reactivated: boolean;
	status: 'active';
}

const NOTION_STATUS_REFRESH_MS = 5 * 60 * 1000;

export async function hydrateNotionAccounts(
	deps: PartnerNotionAccountStatusDeps,
	input: {
		db: D1Database;
		accounts: NotionAccountRowLike[];
	},
): Promise<PartnerNotionAccountStatus[]> {
	if (input.accounts.length === 0) {
		return [];
	}

	const now = deps.now?.() ?? new Date().toISOString();
	const refreshableRows = input.accounts.filter((row) => shouldRefreshNotionAccount(row, now));
	const remoteAccounts = deps.listConnectedAccounts
		? await listConnectedAccountsSafely(deps, refreshableRows)
		: [];

	return Promise.all(
		input.accounts.map((row) => hydrateNotionAccount(deps, { db: input.db, account: row, now, remoteAccounts })),
	);
}

export async function hydrateNotionAccount(
	deps: PartnerNotionAccountStatusDeps,
	input: {
		db: D1Database;
		account: NotionAccountRowLike;
		now?: string;
		remoteAccounts?: NormalizedConnectedAccount[];
	},
): Promise<PartnerNotionAccountStatus> {
	const now = input.now ?? deps.now?.() ?? new Date().toISOString();
	const remoteAccounts =
		input.remoteAccounts ??
		(deps.listConnectedAccounts && shouldRefreshNotionAccount(input.account, now)
			? await listConnectedAccountsSafely(deps, [input.account])
			: []);

	const remoteMatch = findBestConnectedAccountMatch(input.account, remoteAccounts);
	const lastCheckedAt = shouldRefreshNotionAccount(input.account, now) ? now : input.account.last_checked_at;
	const connectionStatus = remoteMatch?.status ?? input.account.connection_status;
	const connectedAccountId = remoteMatch?.connected_account_id ?? input.account.connected_account_id;
	const connectedAt =
		connectionStatus === 'ACTIVE'
			? input.account.connected_at ?? remoteMatch?.created_at ?? now
			: input.account.connected_at;
	const authConfigId = remoteMatch?.auth_config_id ?? input.account.auth_config_id;

	if (
		deps.updateNotionAccountSyncState &&
		shouldPersistNotionAccountSync(input.account, {
			authConfigId,
			connectedAccountId,
			connectionStatus,
			lastCheckedAt,
			connectedAt,
		})
	) {
		await deps.updateNotionAccountSyncState(input.db, {
			id: input.account.id,
			authConfigId,
			connectedAccountId,
			connectionStatus,
			lastCheckedAt: lastCheckedAt ?? now,
			connectedAt,
		});
	}

	return {
		id: input.account.id,
		account_slug: input.account.account_slug,
		display_label: input.account.display_label,
		composio_user_id: input.account.composio_user_id,
		auth_config_id: authConfigId,
		connected_account_id: connectedAccountId,
		connection_status: connectionStatus,
		connected: connectionStatus === 'ACTIVE',
		status: input.account.status,
		sync_enabled: Boolean(input.account.sync_enabled),
		last_checked_at: lastCheckedAt,
		connected_at: connectedAt,
		disabled_at: input.account.disabled_at,
		metadata: deps.parseJsonObject(input.account.metadata_json),
		created_at: input.account.created_at,
		updated_at: input.account.updated_at,
	};
}

export function defaultNotionComposioUserId(clientSlug: string, accountSlug: string): string {
	return `hd_notion_${clientSlug.replace(/-/g, '_')}_${accountSlug.replace(/-/g, '_')}`;
}

export function resolveNotionAccountUpsert(input: ResolveNotionAccountUpsertInput): ResolvedNotionAccountUpsert {
	const displayLabel =
		input.displayLabel?.trim() || input.existing?.display_label?.trim() || input.accountSlug;
	const syncEnabled =
		typeof input.syncEnabled === 'boolean' ? input.syncEnabled : Boolean(input.existing?.sync_enabled ?? 1);
	const metadata = {
		...input.parseJsonObject(input.existing?.metadata_json),
		...(input.metadata ?? {}),
		last_updated_by: input.actor,
	};

	return {
		displayLabel,
		syncEnabled,
		composioUserId: input.existing?.composio_user_id || defaultNotionComposioUserId(input.clientSlug, input.accountSlug),
		metadata,
		reactivated: Boolean(input.existing && input.existing.status !== 'active'),
		status: 'active',
	};
}

async function listConnectedAccountsSafely(
	deps: Pick<PartnerNotionAccountStatusDeps, 'listConnectedAccounts'>,
	rows: NotionAccountRowLike[],
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
			.map(normalizeConnectedAccount)
			.filter(
				(account): account is NormalizedConnectedAccount =>
					account !== null && account.toolkit === 'notion',
			);
	} catch {
		return [];
	}
}

function shouldRefreshNotionAccount(row: NotionAccountRowLike, now: string): boolean {
	if (row.status !== 'active' || !row.composio_user_id) {
		return false;
	}
	if (!row.last_checked_at) {
		return true;
	}

	const status = String(row.connection_status).toUpperCase();
	if (status !== 'ACTIVE') {
		return true;
	}

	const checkedAt = Date.parse(row.last_checked_at);
	const nowMs = Date.parse(now);
	if (!Number.isFinite(checkedAt) || !Number.isFinite(nowMs)) {
		return true;
	}

	return nowMs - checkedAt >= NOTION_STATUS_REFRESH_MS;
}

function normalizeConnectedAccount(account: ConnectedAccountShape): NormalizedConnectedAccount | null {
	if (!account || typeof account !== 'object') {
		return null;
	}

	const toolkit = normalizeToolkitSlug(
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

function normalizeToolkitSlug(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 64);
}

function findBestConnectedAccountMatch(
	row: NotionAccountRowLike,
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
		const scoreDifference = notionAccountMatchScore(row, right) - notionAccountMatchScore(row, left);
		if (scoreDifference !== 0) {
			return scoreDifference;
		}
		return compareIsoDate(right.updated_at ?? right.created_at, left.updated_at ?? left.created_at);
	});

	const best = ranked[0]!;
	return isReliableConnectedAccountMatch(row, best, candidates.length) ? best : null;
}

function notionAccountMatchScore(
	row: Pick<NotionAccountRowLike, 'connected_account_id' | 'auth_config_id'>,
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
	return score;
}

function isReliableConnectedAccountMatch(
	row: Pick<NotionAccountRowLike, 'connected_account_id' | 'auth_config_id'>,
	account: NormalizedConnectedAccount,
	candidateCount: number,
): boolean {
	if (row.connected_account_id && account.connected_account_id === row.connected_account_id) {
		return true;
	}
	if (candidateCount === 1) {
		return true;
	}
	return Boolean(row.auth_config_id && account.auth_config_id === row.auth_config_id && account.status === 'ACTIVE');
}

function compareIsoDate(left: string | null, right: string | null): number {
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

function shouldPersistNotionAccountSync(
	row: NotionAccountRowLike,
	input: {
		authConfigId: string | null;
		connectedAccountId: string | null;
		connectionStatus: string;
		lastCheckedAt: string | null;
		connectedAt: string | null;
	},
): boolean {
	return (
		row.auth_config_id !== input.authConfigId ||
		row.connected_account_id !== input.connectedAccountId ||
		row.connection_status !== input.connectionStatus ||
		row.last_checked_at !== input.lastCheckedAt ||
		row.connected_at !== input.connectedAt
	);
}
