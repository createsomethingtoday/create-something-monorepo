#!/usr/bin/env tsx

import {
	nowIso,
	parseCliArgs,
	postJson,
	printJson,
	requireInput,
	resolveInput,
} from './partner-cli-utils';

type ProspectGraduateResponse = {
	client: Record<string, unknown>;
	lane: Record<string, unknown>;
	entitlement: Record<string, unknown>;
	issuance_state: Record<string, unknown>;
	consent_record_id?: string | null;
};

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const baseUrl = resolveInput(args, 'base-url', 'PARTNER_API_BASE_URL', 'https://createsomething.agency')!;
	const adminKey = requireInput(args, 'admin-key', 'PARTNER_ADMIN_KEY', 'partner admin key');
	const slug = requireInput(args, 'slug', 'PARTNER_PROSPECT_SLUG', 'prospect slug');
	const actor = resolveInput(args, 'actor', 'PARTNER_ACTOR', 'partner_cli');

	const metadata = parseOptionalJsonObject(resolveInput(args, 'metadata-json', 'PARTNER_PROSPECT_METADATA_JSON'));
	const laneMetadata = parseOptionalJsonObject(resolveInput(args, 'lane-metadata-json', 'PARTNER_PROSPECT_LANE_METADATA_JSON'));
	const consentGrantedBy = resolveInput(args, 'consent-granted-by', 'PARTNER_CONSENT_GRANTED_BY');

	const body: Record<string, unknown> = {
		display_name: resolveInput(args, 'display-name', 'PARTNER_PROSPECT_DISPLAY_NAME'),
		owner_email: resolveInput(args, 'owner-email', 'PARTNER_PROSPECT_OWNER_EMAIL'),
		identity_account_id: requireInput(args, 'identity-account-id', 'PARTNER_IDENTITY_ACCOUNT_ID', 'identity account id'),
		identity_user_id: requireInput(args, 'identity-user-id', 'PARTNER_IDENTITY_USER_ID', 'identity user id'),
		identity_tenant_id: requireInput(args, 'identity-tenant-id', 'PARTNER_IDENTITY_TENANT_ID', 'identity tenant id'),
		lane_slug: resolveInput(args, 'lane-slug', 'PARTNER_PROSPECT_LANE_SLUG'),
		lane_display_name: resolveInput(args, 'lane-display-name', 'PARTNER_PROSPECT_LANE_DISPLAY_NAME'),
		lane_identity_user_id: resolveInput(args, 'lane-identity-user-id', 'PARTNER_LANE_IDENTITY_USER_ID'),
		service_tier: resolveInput(args, 'service-tier', 'PARTNER_SERVICE_TIER'),
		metadata,
		lane_metadata: laneMetadata,
		consent: consentGrantedBy
			? {
					consent_version: resolveInput(args, 'consent-version', 'PARTNER_CONSENT_VERSION', 'v1'),
					granted_by: consentGrantedBy,
					channel: resolveInput(args, 'consent-channel', 'PARTNER_CONSENT_CHANNEL', 'portal'),
					reference: resolveInput(args, 'consent-reference', 'PARTNER_CONSENT_REFERENCE'),
					granted_at: resolveInput(args, 'consent-granted-at', 'PARTNER_CONSENT_GRANTED_AT'),
					expires_at: resolveInput(args, 'consent-expires-at', 'PARTNER_CONSENT_EXPIRES_AT'),
				}
			: undefined,
	};

	const response = await postJson<ProspectGraduateResponse>(
		`${baseUrl.replace(/\/+$/, '')}/api/partners/half-dozen/prospects/${encodeURIComponent(slug)}/graduate`,
		{
			'X-Partner-Admin-Key': adminKey,
			'X-Partner-Actor': actor!,
		},
		body,
	);

	printJson({
		audit: {
			command: 'partner:prospect:graduate',
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
