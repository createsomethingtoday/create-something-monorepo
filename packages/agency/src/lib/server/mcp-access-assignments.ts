import {
	buildComposioAllowedToolPrefixes,
	buildPartnerLaneNotionBridgeUrl,
	findPartnerAccessLaneForIdentity,
	listPartnerAccessLanesForIdentity,
	parseJsonArray,
	parseJsonObject,
	parseJsonStringArray,
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
	source: 'partner_lane' | 'legacy';
	partnerClientId: string | null;
	clientSlug: string | null;
	laneKey: string;
	displayName: string;
	hubUrl: string;
	bridgeUrl: string;
	bridgeUsername: string;
	credentialSource: string;
	hostKey: string | null;
	accountId: string | null;
	tenantId: string | null;
	workspaceAccountId: string | null;
	toolkitProfile: string[];
	allowedToolPrefixes: string[];
};

type LaneConfig = {
	displayName: string;
	hubSubdomain: string;
	bridgeSubdomain: string;
	bridgeUsername: string;
	defaultToolkitProfile: string[];
	defaultAllowedToolPrefixes?: string[];
};

type BoundClientRow = {
	id: string;
	slug: string;
};

const DEFAULT_CREDENTIAL_SOURCE = 'Vault + private operator handoff';
const DEFAULT_LANE_CREDENTIAL_SOURCE = 'Partner-managed named lane';
const LEGACY_SHARED_AUTH_TOOLKITS = [
	'dropbox',
	'gmail',
	'youtube',
	'googlesheets',
	'googledrive',
	'zoom',
	'slack',
	'quickbooks',
	'linkedin',
	'notion',
];
const LEGACY_WEBFLOW_REVIEWER_TOOLKITS: string[] = [];
const WEBFLOW_TEMPLATE_REVIEW_PHASE_A_ALLOWED_TOOL_PREFIXES = [
	'webflow-template-review-mcp__template_review_health',
	'webflow-template-review-mcp__template_review_get_metrics',
	'webflow-template-review-mcp__template_review_list_queue',
	'webflow-template-review-mcp__template_review_my_queue',
	'webflow-template-review-mcp__template_review_search_assets',
	'webflow-template-review-mcp__template_review_search_versions',
	'webflow-template-review-mcp__template_review_get_asset',
	'webflow-template-review-mcp__template_review_list_versions',
	'webflow-template-review-mcp__template_review_get_version',
	'webflow-template-review-mcp__template_review_get_review_context',
	'webflow-template-review-mcp__template_review_get_comprehensive_review_contract',
	'webflow-template-review-mcp__template_review_format_agent_review_feedback',
	'webflow-template-review-mcp__template_review_prepare_published_site_sandbox',
	'webflow-template-review-mcp__template_review_list_releases',
	'webflow-template-review-mcp__template_review_get_field_map',
	'webflow-template-review-mcp__template_review_run_published_site_validation',
	'webflow-template-review-mcp__template_review_assign_self',
	'webflow-template-review-mcp__template_review_unassign_self',
	'webflow-template-review-mcp__template_review_request_changes',
	'webflow-template-review-mcp__template_review_set_review_status',
	'webflow-template-review-mcp__template_review_save_agent_feedback',
	'webflow-template-review-mcp__template_review_save_draft_feedback',
	'webflow-reviewer-exceptions-mcp__reviewer_exceptions_',
];

const LANE_CONFIGS: Record<string, LaneConfig> = {
	mj: {
		displayName: 'MJ',
		hubSubdomain: 'mj',
		bridgeSubdomain: 'mj-notion',
		bridgeUsername: 'acct_mj',
		defaultToolkitProfile: LEGACY_SHARED_AUTH_TOOLKITS,
	},
	lainy: {
		displayName: 'Lainy',
		hubSubdomain: 'lainy',
		bridgeSubdomain: 'lainy-notion',
		bridgeUsername: 'acct_lainy',
		defaultToolkitProfile: LEGACY_SHARED_AUTH_TOOLKITS,
	},
	august: {
		displayName: 'August',
		hubSubdomain: 'august',
		bridgeSubdomain: 'august-notion',
		bridgeUsername: 'acct_august',
		defaultToolkitProfile: LEGACY_SHARED_AUTH_TOOLKITS,
	},
	fillip: {
		displayName: 'Fillip',
		hubSubdomain: 'fillip',
		bridgeSubdomain: 'fillip-notion',
		bridgeUsername: 'acct_fillip',
		defaultToolkitProfile: LEGACY_SHARED_AUTH_TOOLKITS,
	},
	leah: {
		displayName: 'Leah',
		hubSubdomain: 'leah',
		bridgeSubdomain: 'leah-notion',
		bridgeUsername: 'acct_leah',
		defaultToolkitProfile: LEGACY_SHARED_AUTH_TOOLKITS,
	},
	danny: {
		displayName: 'Danny',
		hubSubdomain: 'danny',
		bridgeSubdomain: 'danny-notion',
		bridgeUsername: 'acct_danny',
		defaultToolkitProfile: LEGACY_SHARED_AUTH_TOOLKITS,
	},
	dm: {
		displayName: 'Danny',
		hubSubdomain: 'danny',
		bridgeSubdomain: 'danny-notion',
		bridgeUsername: 'acct_danny',
		defaultToolkitProfile: LEGACY_SHARED_AUTH_TOOLKITS,
	},
	wf_natalia: {
		displayName: 'Natalia Ledford',
		hubSubdomain: 'wf-template-review-natalia',
		bridgeSubdomain: 'wf-template-review-natalia',
		bridgeUsername: 'acct_wf_natalia',
		defaultToolkitProfile: LEGACY_WEBFLOW_REVIEWER_TOOLKITS,
		defaultAllowedToolPrefixes: WEBFLOW_TEMPLATE_REVIEW_PHASE_A_ALLOWED_TOOL_PREFIXES,
	},
	wf_eric: {
		displayName: 'Eric Unger',
		hubSubdomain: 'wf-template-review-eric',
		bridgeSubdomain: 'wf-template-review-eric',
		bridgeUsername: 'acct_wf_eric',
		defaultToolkitProfile: LEGACY_WEBFLOW_REVIEWER_TOOLKITS,
		defaultAllowedToolPrefixes: WEBFLOW_TEMPLATE_REVIEW_PHASE_A_ALLOWED_TOOL_PREFIXES,
	},
	wf_vicki: {
		displayName: 'Vicki Chen',
		hubSubdomain: 'wf-template-review-vicki',
		bridgeSubdomain: 'wf-template-review-vicki',
		bridgeUsername: 'acct_wf_vicki',
		defaultToolkitProfile: LEGACY_WEBFLOW_REVIEWER_TOOLKITS,
		defaultAllowedToolPrefixes: WEBFLOW_TEMPLATE_REVIEW_PHASE_A_ALLOWED_TOOL_PREFIXES,
	},
	wf_mariana: {
		displayName: 'Mariana Segura',
		hubSubdomain: 'wf-template-review-mariana',
		bridgeSubdomain: 'wf-template-review-mariana',
		bridgeUsername: 'acct_wf_mariana',
		defaultToolkitProfile: LEGACY_WEBFLOW_REVIEWER_TOOLKITS,
		defaultAllowedToolPrefixes: WEBFLOW_TEMPLATE_REVIEW_PHASE_A_ALLOWED_TOOL_PREFIXES,
	},
	wf_micah: {
		displayName: 'Micah Johnson',
		hubSubdomain: 'wf-template-review-micah',
		bridgeSubdomain: 'wf-template-review-micah',
		bridgeUsername: 'acct_wf_micah',
		defaultToolkitProfile: LEGACY_WEBFLOW_REVIEWER_TOOLKITS,
		defaultAllowedToolPrefixes: WEBFLOW_TEMPLATE_REVIEW_PHASE_A_ALLOWED_TOOL_PREFIXES,
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

async function findClientBindingByWorkspaceAccountId(
	db: D1Database,
	workspaceAccountId: string,
): Promise<BoundClientRow | null> {
	return db
		.prepare(
			`SELECT id, slug
			 FROM partner_auth_clients
			 WHERE workspace_account_id = ?
			 LIMIT 1`,
		)
		.bind(workspaceAccountId)
		.first<BoundClientRow>();
}

async function buildLegacyAssignment(
	db: D1Database | null | undefined,
	input: AccessAssignmentInput,
): Promise<McpAccessAssignment | null> {
	const laneKey = resolveLegacyLaneKey(input.email, input.accountId);
	if (!laneKey) return null;

	const lane = LANE_CONFIGS[laneKey];
	const toolkitProfile = [...lane.defaultToolkitProfile];
	const workspaceAccountId = input.workspaceAccountId ?? input.accountId;
	const boundClient =
		db && workspaceAccountId ? await findClientBindingByWorkspaceAccountId(db, workspaceAccountId) : null;

	return {
		source: 'legacy',
		partnerClientId: boundClient?.id ?? null,
		clientSlug: boundClient?.slug ?? null,
		laneKey,
		displayName: lane.displayName,
		hubUrl: `https://${lane.hubSubdomain}.mcp.createsomething.agency/mcp`,
		bridgeUrl: `https://${lane.bridgeSubdomain}.mcp.createsomething.agency/mcp`,
		bridgeUsername: lane.bridgeUsername,
		credentialSource: DEFAULT_CREDENTIAL_SOURCE,
		hostKey: lane.bridgeUsername,
		accountId: input.accountId,
		tenantId: input.tenantId,
		workspaceAccountId,
		toolkitProfile,
		allowedToolPrefixes: lane.defaultAllowedToolPrefixes
			? [...lane.defaultAllowedToolPrefixes]
			: buildComposioAllowedToolPrefixes(toolkitProfile),
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
		source: 'partner_lane',
		partnerClientId: lane.partner_client_id,
		clientSlug: lane.client_slug,
		laneKey: lane.slug,
		displayName: lane.display_name,
		hubUrl: lane.hub_url,
		bridgeUrl: notionBridgeUrl,
		bridgeUsername,
		credentialSource,
		hostKey: lane.host_key,
		accountId: lane.identity_account_id ?? input.accountId,
		tenantId: lane.identity_tenant_id ?? input.tenantId,
		workspaceAccountId: lane.workspace_account_id ?? input.workspaceAccountId ?? input.accountId,
		toolkitProfile: parseJsonArray(lane.toolkit_profile_json),
		allowedToolPrefixes: normalizeAllowedToolPrefixesForAssignment(lane),
	};
}

function normalizeAllowedToolPrefixesForAssignment(
	lane: Pick<PartnerAuthAccessLaneAssignmentRow, 'toolkit_profile_json' | 'allowed_tool_prefixes_json'>,
): string[] {
	const explicit = parseJsonStringArray(lane.allowed_tool_prefixes_json);
	if (explicit.length > 0) return explicit;
	return buildComposioAllowedToolPrefixes(parseJsonArray(lane.toolkit_profile_json));
}

export async function listMcpAccessAssignments(
	db: D1Database | null | undefined,
	input: AccessAssignmentInput,
): Promise<McpAccessAssignment[]> {
	if (db) {
		const lanes = await listPartnerAccessLanesForIdentity(
			db,
			{
				authSubject: input.authSubject ?? null,
				email: input.email,
			},
			{ limit: 20 },
		);

		if (lanes.length > 0) {
			return lanes.map((lane) => buildLaneAssignment(lane, input));
		}
	}

	const legacyAssignment = await buildLegacyAssignment(db, input);
	return legacyAssignment ? [legacyAssignment] : [];
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

	return buildLegacyAssignment(db, input);
}
