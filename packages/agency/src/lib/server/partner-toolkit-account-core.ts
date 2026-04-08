import {
	attachProspectToolkitAccounts,
	type PartnerProspectToolkitStatusDeps,
	type ProspectToolkitAccountStatus,
} from './partner-prospect-toolkit-status-core.js';

interface ToolkitAccountUpsertRowLike {
	display_label: string | null;
	sync_enabled: number;
	status: 'active' | 'disabled' | 'revoked';
	metadata_json: string;
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

export interface PartnerToolkitAccountStatusDeps {
	listToolkitAccounts: (
		db: D1Database,
		partnerClientId: string,
		toolkit: string,
	) => Promise<any[]>;
	listConnectedAccounts?: (userIds: string[]) => Promise<ConnectedAccountShape[]>;
	normalizeToolkitSlug: (value: string) => string;
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	updateToolkitAccountSyncState?: PartnerProspectToolkitStatusDeps['updateToolkitAccountSyncState'];
	now?: () => string;
}

export interface ResolveToolkitAccountUpsertInput {
	existing?: ToolkitAccountUpsertRowLike | null;
	accountSlug: string;
	actor: string;
	displayLabel?: string | null;
	syncEnabled?: boolean;
	metadata?: Record<string, unknown>;
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
}

export interface ResolvedToolkitAccountUpsert {
	displayLabel: string;
	syncEnabled: boolean;
	metadata: Record<string, unknown>;
	reactivated: boolean;
	status: 'active';
}

export async function hydrateToolkitAccounts(
	deps: PartnerToolkitAccountStatusDeps,
	input: {
		db: D1Database;
		partnerClientId: string;
		toolkit: string;
	},
): Promise<ProspectToolkitAccountStatus[]> {
	const prospects = await attachProspectToolkitAccounts(
		{
			listToolkitAccounts: (db, partnerClientId) =>
				deps.listToolkitAccounts(db, partnerClientId, input.toolkit),
			listConnectedAccounts: deps.listConnectedAccounts,
			normalizeToolkitSlug: deps.normalizeToolkitSlug,
			parseJsonObject: deps.parseJsonObject,
			updateToolkitAccountSyncState: deps.updateToolkitAccountSyncState,
			now: deps.now,
		},
		{
			db: input.db,
			prospects: [
				{
					client: { id: input.partnerClientId },
					prospect_claim: { state: 'claimed_by_you' as const, can_claim_now: true },
				},
			],
		},
	);

	return prospects[0]?.toolkit_accounts ?? [];
}

export async function hydrateToolkitAccount(
	deps: PartnerToolkitAccountStatusDeps,
	input: {
		db: D1Database;
		partnerClientId: string;
		toolkit: string;
		accountSlug: string;
	},
): Promise<ProspectToolkitAccountStatus | null> {
	const accounts = await hydrateToolkitAccounts(deps, input);
	return accounts.find((account) => account.account_slug === input.accountSlug) ?? null;
}

export function resolveToolkitAccountUpsert(input: ResolveToolkitAccountUpsertInput): ResolvedToolkitAccountUpsert {
	return {
		displayLabel: input.displayLabel?.trim() || input.existing?.display_label?.trim() || input.accountSlug,
		syncEnabled:
			typeof input.syncEnabled === 'boolean' ? input.syncEnabled : Boolean(input.existing?.sync_enabled ?? 1),
		metadata: {
			...input.parseJsonObject(input.existing?.metadata_json),
			...(input.metadata ?? {}),
			last_updated_by: input.actor,
		},
		reactivated: Boolean(input.existing && input.existing.status !== 'active'),
		status: 'active',
	};
}
