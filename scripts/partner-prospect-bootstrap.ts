#!/usr/bin/env tsx

import {
	nowIso,
	parseCliArgs,
	parseCsv,
	postJson,
	printJson,
	requireInput,
	resolveInput,
} from './partner-cli-utils';

type ProspectBootstrapResponse = {
	client: Record<string, unknown>;
	lane: Record<string, unknown>;
	issuance_state: Record<string, unknown>;
};

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const baseUrl = resolveInput(args, 'base-url', 'PARTNER_API_BASE_URL', 'https://createsomething.agency')!;
	const adminKey = requireInput(args, 'admin-key', 'PARTNER_ADMIN_KEY', 'partner admin key');
	const slug = requireInput(args, 'slug', 'PARTNER_PROSPECT_SLUG', 'prospect slug');
	const actor = resolveInput(args, 'actor', 'PARTNER_ACTOR', 'partner_cli');

	const requiredToolkits = parseCsv(resolveInput(args, 'required-toolkits', 'PARTNER_REQUIRED_TOOLKITS'));
	const toolkitProfile = parseCsv(resolveInput(args, 'toolkit-profile', 'PARTNER_TOOLKIT_PROFILE'));
	const allowedToolPrefixes = parseCsv(resolveInput(args, 'allowed-tool-prefixes', 'PARTNER_ALLOWED_TOOL_PREFIXES'));
	const metadata = parseOptionalJsonObject(resolveInput(args, 'metadata-json', 'PARTNER_PROSPECT_METADATA_JSON'));
	const laneMetadata = parseOptionalJsonObject(resolveInput(args, 'lane-metadata-json', 'PARTNER_PROSPECT_LANE_METADATA_JSON'));

	const body: Record<string, unknown> = {
		display_name: resolveInput(args, 'display-name', 'PARTNER_PROSPECT_DISPLAY_NAME'),
		workspace_account_id: resolveInput(args, 'workspace-account-id', 'PARTNER_WORKSPACE_ACCOUNT_ID'),
		owner_email: resolveInput(args, 'owner-email', 'PARTNER_PROSPECT_OWNER_EMAIL'),
		required_toolkits: requiredToolkits.length > 0 ? requiredToolkits : undefined,
		lane_slug: resolveInput(args, 'lane-slug', 'PARTNER_PROSPECT_LANE_SLUG'),
		lane_display_name: resolveInput(args, 'lane-display-name', 'PARTNER_PROSPECT_LANE_DISPLAY_NAME'),
		toolkit_profile: toolkitProfile.length > 0 ? toolkitProfile : undefined,
		allowed_tool_prefixes: allowedToolPrefixes.length > 0 ? allowedToolPrefixes : undefined,
		metadata,
		lane_metadata: laneMetadata,
	};

	const response = await postJson<ProspectBootstrapResponse>(
		`${baseUrl.replace(/\/+$/, '')}/api/partners/half-dozen/prospects/${encodeURIComponent(slug)}/bootstrap`,
		{
			'X-Partner-Admin-Key': adminKey,
			'X-Partner-Actor': actor!,
		},
		body,
	);

	printJson({
		audit: {
			command: 'partner:prospect:bootstrap',
			timestamp: nowIso(),
			prospect_slug: slug,
			actor,
		},
		response,
	});
}

function parseOptionalJsonObject(raw: string | undefined): Record<string, unknown> | undefined {
	if (!raw) return undefined;
	const parsed = JSON.parse(raw) as unknown;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('Metadata flags must be JSON objects.');
	}
	return parsed as Record<string, unknown>;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
