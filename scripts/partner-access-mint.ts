#!/usr/bin/env tsx

import { nowIso, parseCliArgs, parseCsv, postJson, printJson, requireInput, resolveInput } from './partner-cli-utils';

type MintResponse = Record<string, unknown>;

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const baseUrl = resolveInput(args, 'base-url', 'PARTNER_API_BASE_URL', 'https://createsomething.agency')!;
	const adminKey = requireInput(args, 'admin-key', 'PARTNER_ADMIN_KEY', 'partner admin key');
	const slug = requireInput(args, 'slug', 'PARTNER_CLIENT_SLUG', 'partner client slug');
	const actor = resolveInput(args, 'actor', 'PARTNER_ACTOR', 'partner_cli');

	const toolkitProfile = parseCsv(resolveInput(args, 'toolkit-profile', 'PARTNER_TOOLKIT_PROFILE'));
	const ttlSecondsRaw = resolveInput(args, 'ttl-seconds', 'PARTNER_ACCESS_TTL_SECONDS');
	const ttlSeconds = ttlSecondsRaw ? Number.parseInt(ttlSecondsRaw, 10) : undefined;
	if (ttlSecondsRaw && !Number.isFinite(ttlSeconds)) {
		throw new Error('Invalid ttl-seconds value.');
	}

	const metadataJson = resolveInput(args, 'metadata-json', 'PARTNER_ACCESS_METADATA_JSON');
	const metadata = metadataJson ? safeParseJson(metadataJson) : undefined;

	const body: Record<string, unknown> = {
		host: resolveInput(args, 'host', 'PARTNER_MINT_HOST'),
		tool_mode: resolveInput(args, 'tool-mode', 'PARTNER_MINT_TOOL_MODE'),
		ttl_seconds: ttlSeconds,
		toolkit_profile: toolkitProfile.length > 0 ? toolkitProfile : undefined,
		delivery_channel: resolveInput(args, 'delivery-channel', 'PARTNER_DELIVERY_CHANNEL'),
		recipient: resolveInput(args, 'recipient', 'PARTNER_DELIVERY_RECIPIENT'),
		metadata,
	};

	const response = await postJson<MintResponse>(
		`${baseUrl.replace(/\/+$/, '')}/api/partners/half-dozen/clients/${encodeURIComponent(slug)}/access/mint`,
		{
			'X-Partner-Admin-Key': adminKey,
			'X-Partner-Actor': actor!,
		},
		body,
	);

	printJson({
		audit: {
			command: 'partner:access:mint',
			timestamp: nowIso(),
			client_slug: slug,
			actor,
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
