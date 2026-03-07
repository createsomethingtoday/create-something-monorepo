type AccessAssignmentInput = {
	email: string;
	accountId: string | null;
	tenantId: string | null;
	workspaceAccountId?: string | null;
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
};

function normalizeKey(value: string | null | undefined): string {
	return (value ?? '')
		.trim()
		.toLowerCase()
		.replace(/^acct_/, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function resolveLaneKey(email: string, accountId: string | null): string | null {
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

export function resolveMcpAccessAssignment(input: AccessAssignmentInput): McpAccessAssignment | null {
	const laneKey = resolveLaneKey(input.email, input.accountId);
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
