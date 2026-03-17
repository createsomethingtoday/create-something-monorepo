import {
	buildPartnerLaneNotionBridgeUrl,
	findPartnerAccessLaneForIdentity,
	parseJsonObject,
	type PartnerAuthAccessLaneAssignmentRow,
} from '$lib/server/partner-auth';

type AccessAssignmentInput = {
	email: string;
	accountId: string | null;
	tenantId: string | null;
	workspaceAccountId?: string | null;
	authSubject?: string | null;
};

export type McpAccessAssignment = {
	laneKey: string;
	displayName: string;
	hubUrl: string;
	bridgeUrl: string;
	bridgeUsername: string;
	credentialSource: string;
	accountId: string | null;
	tenantId: string | null;
	workspaceAccountId: string | null;
};

type LaneConfig = {
	displayName: string;
	hubSubdomain: string;
	bridgeSubdomain: string;
	bridgeUsername: string;
};

const DEFAULT_CREDENTIAL_SOURCE = 'Vault + private operator handoff';
const DEFAULT_LANE_CREDENTIAL_SOURCE = 'Partner-managed named lane';

const LANE_CONFIGS: Record<string, LaneConfig> = {
	mj: {
		displayName: 'MJ',
		hubSubdomain: 'mj',
		bridgeSubdomain: 'mj-notion',
		bridgeUsername: 'acct_mj',
	},
	lainy: {
		displayName: 'Lainy',
		hubSubdomain: 'lainy',
		bridgeSubdomain: 'lainy-notion',
		bridgeUsername: 'acct_lainy',
	},
	august: {
		displayName: 'August',
		hubSubdomain: 'august',
		bridgeSubdomain: 'august-notion',
		bridgeUsername: 'acct_august',
	},
	fillip: {
		displayName: 'Fillip',
		hubSubdomain: 'fillip',
		bridgeSubdomain: 'fillip-notion',
		bridgeUsername: 'acct_fillip',
	},
	leah: {
		displayName: 'Leah',
		hubSubdomain: 'leah',
		bridgeSubdomain: 'leah-notion',
		bridgeUsername: 'acct_leah',
	},
	danny: {
		displayName: 'Danny',
		hubSubdomain: 'danny',
		bridgeSubdomain: 'danny-notion',
		bridgeUsername: 'acct_danny',
	},
	dm: {
		displayName: 'Danny',
		hubSubdomain: 'danny',
		bridgeSubdomain: 'danny-notion',
		bridgeUsername: 'acct_danny',
	},
	wf_natalia: {
		displayName: 'Natalia Ledford',
		hubSubdomain: 'wf-template-review-natalia',
		bridgeSubdomain: 'wf-template-review-natalia',
		bridgeUsername: 'acct_wf_natalia',
	},
	wf_sudiksha: {
		displayName: 'Sudiksha Khanduja',
		hubSubdomain: 'wf-template-review-sudiksha',
		bridgeSubdomain: 'wf-template-review-sudiksha',
		bridgeUsername: 'acct_wf_sudiksha',
	},
	wf_eric: {
		displayName: 'Eric Unger',
		hubSubdomain: 'wf-template-review-eric',
		bridgeSubdomain: 'wf-template-review-eric',
		bridgeUsername: 'acct_wf_eric',
	},
	wf_vicki: {
		displayName: 'Vicki Chen',
		hubSubdomain: 'wf-template-review-vicki',
		bridgeSubdomain: 'wf-template-review-vicki',
		bridgeUsername: 'acct_wf_vicki',
	},
	wf_mariana: {
		displayName: 'Mariana Segura',
		hubSubdomain: 'wf-template-review-mariana',
		bridgeSubdomain: 'wf-template-review-mariana',
		bridgeUsername: 'acct_wf_mariana',
	},
	wf_micah: {
		displayName: 'Micah Johnson',
		hubSubdomain: 'wf-template-review-micah',
		bridgeSubdomain: 'wf-template-review-micah',
		bridgeUsername: 'acct_wf_micah',
	},
};

function normalizeKey(value: string | null | undefined): string {
	return (value ?? '')
		.trim()
		.toLowerCase()
		.replace(/^acct_/, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function resolveLegacyLaneKey(email: string, accountId: string | null): string | null {
	const normalizedAccount = normalizeKey(accountId);
	if (normalizedAccount && normalizedAccount in LANE_CONFIGS) {
		return normalizedAccount;
	}

	const emailLocal = normalizeKey(email.split('@')[0] ?? '');
	if (emailLocal === 'dm') return 'danny';
	if (emailLocal && emailLocal in LANE_CONFIGS) {
		return emailLocal;
	}

	return null;
}

function buildLegacyAssignment(input: AccessAssignmentInput): McpAccessAssignment | null {
	const laneKey = resolveLegacyLaneKey(input.email, input.accountId);
	if (!laneKey) return null;

	const lane = LANE_CONFIGS[laneKey];
	return {
		laneKey,
		displayName: lane.displayName,
		hubUrl: `https://${lane.hubSubdomain}.mcp.createsomething.agency/mcp`,
		bridgeUrl: `https://${lane.bridgeSubdomain}.mcp.createsomething.agency/mcp`,
		bridgeUsername: lane.bridgeUsername,
		credentialSource: DEFAULT_CREDENTIAL_SOURCE,
		accountId: input.accountId,
		tenantId: input.tenantId,
		workspaceAccountId: input.workspaceAccountId ?? input.accountId,
	};
}

function buildLaneAssignment(
	lane: PartnerAuthAccessLaneAssignmentRow,
	input: AccessAssignmentInput,
): McpAccessAssignment {
	const metadata = parseJsonObject(lane.metadata_json);
	const notionBridgeUrl =
		typeof metadata.notion_bridge_url === 'string' && metadata.notion_bridge_url.trim().length > 0
			? metadata.notion_bridge_url.trim()
			: buildPartnerLaneNotionBridgeUrl(lane.client_slug);
	const bridgeUsername =
		typeof metadata.bridge_username === 'string' && metadata.bridge_username.trim().length > 0
			? metadata.bridge_username.trim()
			: lane.host_key;
	const credentialSource =
		typeof metadata.credential_source === 'string' && metadata.credential_source.trim().length > 0
			? metadata.credential_source.trim()
			: DEFAULT_LANE_CREDENTIAL_SOURCE;

	return {
		laneKey: lane.slug,
		displayName: lane.display_name,
		hubUrl: lane.hub_url,
		bridgeUrl: notionBridgeUrl,
		bridgeUsername,
		credentialSource,
		accountId: lane.identity_account_id ?? input.accountId,
		tenantId: lane.identity_tenant_id ?? input.tenantId,
		workspaceAccountId: lane.workspace_account_id ?? input.workspaceAccountId ?? input.accountId,
	};
}

export async function resolveMcpAccessAssignment(
	db: D1Database | null | undefined,
	input: AccessAssignmentInput,
): Promise<McpAccessAssignment | null> {
	if (db) {
		const lane = await findPartnerAccessLaneForIdentity(db, {
			authSubject: input.authSubject ?? null,
			email: input.email,
			accountId: input.accountId,
		});
		if (lane) {
			return buildLaneAssignment(lane, input);
		}
	}

	return buildLegacyAssignment(input);
}
