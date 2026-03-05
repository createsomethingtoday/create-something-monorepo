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

type InitResponse = {
	client: Record<string, unknown>;
	consent_record_id?: string | null;
};

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const baseUrl = resolveInput(args, 'base-url', 'PARTNER_API_BASE_URL', 'https://createsomething.agency')!;
	const adminKey = requireInput(args, 'admin-key', 'PARTNER_ADMIN_KEY', 'partner admin key');
	const slug = requireInput(args, 'slug', 'PARTNER_CLIENT_SLUG', 'partner client slug');
	const actor = resolveInput(args, 'actor', 'PARTNER_ACTOR', 'partner_cli');

	const requiredToolkits = parseCsv(resolveInput(args, 'required-toolkits', 'PARTNER_REQUIRED_TOOLKITS'));
	const metadataJson = resolveInput(args, 'metadata-json', 'PARTNER_CLIENT_METADATA_JSON');
	const metadata = metadataJson ? safeParseJson(metadataJson) : undefined;

	const consentGrantedBy = resolveInput(args, 'consent-granted-by', 'PARTNER_CONSENT_GRANTED_BY');
	const consent = consentGrantedBy
		? {
			consent_version: resolveInput(args, 'consent-version', 'PARTNER_CONSENT_VERSION', 'v1'),
			granted_by: consentGrantedBy,
			channel: resolveInput(args, 'consent-channel', 'PARTNER_CONSENT_CHANNEL', 'portal'),
			reference: resolveInput(args, 'consent-reference', 'PARTNER_CONSENT_REFERENCE'),
			granted_at: resolveInput(args, 'consent-granted-at', 'PARTNER_CONSENT_GRANTED_AT'),
			expires_at: resolveInput(args, 'consent-expires-at', 'PARTNER_CONSENT_EXPIRES_AT'),
		}
		: undefined;

	const body: Record<string, unknown> = {
		display_name: resolveInput(args, 'display-name', 'PARTNER_CLIENT_DISPLAY_NAME'),
		workspace_account_id: resolveInput(args, 'workspace-account-id', 'PARTNER_WORKSPACE_ACCOUNT_ID'),
		identity_account_id: resolveInput(args, 'identity-account-id', 'PARTNER_IDENTITY_ACCOUNT_ID'),
		identity_user_id: resolveInput(args, 'identity-user-id', 'PARTNER_IDENTITY_USER_ID'),
		identity_tenant_id: resolveInput(args, 'identity-tenant-id', 'PARTNER_IDENTITY_TENANT_ID'),
		owner_email: resolveInput(args, 'owner-email', 'PARTNER_CLIENT_OWNER_EMAIL'),
		status: resolveInput(args, 'status', 'PARTNER_CLIENT_STATUS'),
		required_toolkits: requiredToolkits.length > 0 ? requiredToolkits : undefined,
		metadata,
		consent,
	};

	const response = await postJson<InitResponse>(
		`${baseUrl.replace(/\/+$/, '')}/api/partners/half-dozen/clients/${encodeURIComponent(slug)}/init`,
		{
			'X-Partner-Admin-Key': adminKey,
			'X-Partner-Actor': actor!,
		},
		body,
	);

	printJson({
		audit: {
			command: 'partner:client:init',
			timestamp: nowIso(),
			client_slug: slug,
			actor,
			consent_record_id: response.consent_record_id ?? null,
		},
		response,
	});
}

function safeParseJson(raw: string): Record<string, unknown> {
	const parsed = JSON.parse(raw) as unknown;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('--metadata-json must be a JSON object.');
	}
	return parsed as Record<string, unknown>;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
