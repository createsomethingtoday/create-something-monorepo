#!/usr/bin/env tsx

import { nowIso, parseCliArgs, parseCsv, postJson, printJson, requireInput, resolveInput } from './partner-cli-utils';

type RotateMode = 'strict' | 'managed' | 'legacy';

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const baseUrl = resolveInput(args, 'base-url', 'PARTNER_API_BASE_URL', 'https://createsomething.agency')!;
	const adminKey = requireInput(args, 'admin-key', 'PARTNER_ADMIN_KEY', 'partner admin key');
	const slug = requireInput(args, 'slug', 'PARTNER_CLIENT_SLUG', 'partner client slug');
	const actor = resolveInput(args, 'actor', 'PARTNER_ACTOR', 'partner_cli');
	const mode = (resolveInput(args, 'mode', 'PARTNER_ROTATE_MODE', 'managed') as RotateMode).toLowerCase() as RotateMode;

	if (mode !== 'strict' && mode !== 'managed' && mode !== 'legacy') {
		throw new Error(`Unsupported mode "${mode}". Use strict, managed, or legacy.`);
	}

	const response =
		mode === 'strict'
			? await rotateStrict(baseUrl, adminKey, actor!, slug, args)
			: mode === 'managed'
				? await rotateManaged(baseUrl, adminKey, actor!, slug, args)
			: await rotateLegacy(baseUrl, adminKey, actor!, slug, args);

	printJson({
		audit: {
			command: 'partner:access:rotate',
			timestamp: nowIso(),
			client_slug: slug,
			actor,
			mode,
		},
		response,
	});
}

async function rotateManaged(
	baseUrl: string,
	adminKey: string,
	actor: string,
	slug: string,
	args: Record<string, string | boolean>,
): Promise<Record<string, unknown>> {
	const toolkitProfile = parseCsv(resolveInput(args, 'toolkit-profile', 'PARTNER_TOOLKIT_PROFILE'));
	const metadataJson = resolveInput(args, 'metadata-json', 'PARTNER_ACCESS_METADATA_JSON');
	const metadata = metadataJson ? safeParseJson(metadataJson) : undefined;

	return postJson<Record<string, unknown>>(
		`${baseUrl.replace(/\/+$/, '')}/api/partners/half-dozen/clients/${encodeURIComponent(slug)}/bearer-token/issue`,
		{
			'X-Partner-Admin-Key': adminKey,
			'X-Partner-Actor': actor,
		},
		{
			tool_mode: resolveInput(args, 'tool-mode', 'PARTNER_MINT_TOOL_MODE'),
			toolkit_profile: toolkitProfile.length > 0 ? toolkitProfile : undefined,
			delivery_channel: resolveInput(args, 'delivery-channel', 'PARTNER_DELIVERY_CHANNEL'),
			recipient: resolveInput(args, 'recipient', 'PARTNER_DELIVERY_RECIPIENT'),
			metadata: {
				rotation_reason: resolveInput(args, 'rotation-reason', 'PARTNER_ROTATION_REASON', 'managed_bearer_rotation'),
				...(metadata ?? {}),
			},
		},
	);
}

async function rotateStrict(
	baseUrl: string,
	adminKey: string,
	actor: string,
	slug: string,
	args: Record<string, string | boolean>,
): Promise<Record<string, unknown>> {
	const toolkitProfile = parseCsv(resolveInput(args, 'toolkit-profile', 'PARTNER_TOOLKIT_PROFILE'));
	const ttlSecondsRaw = resolveInput(args, 'ttl-seconds', 'PARTNER_ACCESS_TTL_SECONDS');
	const ttlSeconds = ttlSecondsRaw ? Number.parseInt(ttlSecondsRaw, 10) : undefined;
	if (ttlSecondsRaw && !Number.isFinite(ttlSeconds)) {
		throw new Error('Invalid ttl-seconds value.');
	}

	const metadataJson = resolveInput(args, 'metadata-json', 'PARTNER_ACCESS_METADATA_JSON');
	const metadata = metadataJson ? safeParseJson(metadataJson) : undefined;

	return postJson<Record<string, unknown>>(
		`${baseUrl.replace(/\/+$/, '')}/api/partners/half-dozen/clients/${encodeURIComponent(slug)}/access/mint`,
		{
			'X-Partner-Admin-Key': adminKey,
			'X-Partner-Actor': actor,
		},
		{
			host: resolveInput(args, 'host', 'PARTNER_MINT_HOST'),
			tool_mode: resolveInput(args, 'tool-mode', 'PARTNER_MINT_TOOL_MODE'),
			ttl_seconds: ttlSeconds,
			toolkit_profile: toolkitProfile.length > 0 ? toolkitProfile : undefined,
			delivery_channel: resolveInput(args, 'delivery-channel', 'PARTNER_DELIVERY_CHANNEL'),
			recipient: resolveInput(args, 'recipient', 'PARTNER_DELIVERY_RECIPIENT'),
			metadata: {
				rotation_reason: resolveInput(args, 'rotation-reason', 'PARTNER_ROTATION_REASON', 'strict_session_rotation'),
				...(metadata ?? {}),
			},
		},
	);
}

async function rotateLegacy(
	baseUrl: string,
	adminKey: string,
	actor: string,
	slug: string,
	args: Record<string, string | boolean>,
): Promise<Record<string, unknown>> {
	const reason = requireInput(args, 'reason', 'PARTNER_LEGACY_REASON', 'legacy rotation reason');
	const exceptionApprovedBy = requireInput(
		args,
		'exception-approved-by',
		'PARTNER_EXCEPTION_APPROVED_BY',
		'legacy exception approver',
	);
	const sunsetAt = requireInput(args, 'sunset-at', 'PARTNER_LEGACY_SUNSET_AT', 'legacy sunset timestamp');
	const ttlSecondsRaw = resolveInput(args, 'ttl-seconds', 'PARTNER_LEGACY_TTL_SECONDS');
	const ttlSeconds = ttlSecondsRaw ? Number.parseInt(ttlSecondsRaw, 10) : undefined;
	if (ttlSecondsRaw && !Number.isFinite(ttlSeconds)) {
		throw new Error('Invalid ttl-seconds value.');
	}

	const metadataJson = resolveInput(args, 'metadata-json', 'PARTNER_ACCESS_METADATA_JSON');
	const metadata = metadataJson ? safeParseJson(metadataJson) : undefined;

	return postJson<Record<string, unknown>>(
		`${baseUrl.replace(/\/+$/, '')}/api/partners/half-dozen/clients/${encodeURIComponent(slug)}/legacy-key/issue`,
		{
			'X-Partner-Admin-Key': adminKey,
			'X-Partner-Actor': actor,
		},
		{
			reason,
			exception_approved_by: exceptionApprovedBy,
			sunset_at: sunsetAt,
			ttl_seconds: ttlSeconds,
			legacy_mcp_url: resolveInput(args, 'legacy-mcp-url', 'PARTNER_LEGACY_MCP_URL'),
			delivery_channel: resolveInput(args, 'delivery-channel', 'PARTNER_DELIVERY_CHANNEL'),
			recipient: resolveInput(args, 'recipient', 'PARTNER_DELIVERY_RECIPIENT'),
			metadata: {
				rotation_reason: resolveInput(args, 'rotation-reason', 'PARTNER_ROTATION_REASON', 'legacy_key_rotation'),
				...(metadata ?? {}),
			},
		},
	);
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
