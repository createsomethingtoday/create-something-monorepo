#!/usr/bin/env tsx

import { ComposioClient } from '../packages/composio-bridge/src/client.ts';
import type { ComposioAccount } from '../packages/composio-bridge/src/types.ts';
import {
	getBooleanArg,
	nowIso,
	parseCliArgs,
	parseCsv,
	printJson,
	requireInput,
	resolveInput,
} from './partner-cli-utils';

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const strict = getBooleanArg(args, 'strict', false);
	const apiKey = requireInput(args, 'composio-api-key', 'COMPOSIO_API_KEY', 'Composio API key');
	const baseURL = resolveInput(args, 'composio-base-url', 'COMPOSIO_BASE_URL');
	const workspaceAccountId = resolveInput(args, 'workspace-account-id', 'PARTNER_WORKSPACE_ACCOUNT_ID');
	const requiredToolkits = parseCsv(resolveInput(args, 'required-toolkits', 'PARTNER_REQUIRED_TOOLKITS'));

	const authConfigMapRaw = resolveInput(args, 'auth-config-map-json', 'COMPOSIO_AUTH_CONFIG_MAP_JSON');
	const authConfigMap = authConfigMapRaw ? safeParseJsonObject(authConfigMapRaw) : {};

	const composio = new ComposioClient({
		apiKey,
		...(baseURL ? { baseURL } : {}),
	});

	const toolkitSummaries = await composio.listToolkits({ limit: 500 });
	const availableToolkitSlugs = new Set(toolkitSummaries.map((toolkit) => toolkit.slug.toLowerCase()));
	const missingToolkits = requiredToolkits.filter((toolkit) => !availableToolkitSlugs.has(toolkit.toLowerCase()));
	const missingAuthConfigMappings = requiredToolkits.filter((toolkit) => !authConfigMap[toolkit]);

	let connectedAccounts: ComposioAccount[] = [];
	if (workspaceAccountId) {
		connectedAccounts = await composio.getConnectedAccounts(workspaceAccountId);
	}

	const connectionsByToolkit = new Map<string, { active: number; pending: number; expired: number; revoked: number }>();
	for (const account of connectedAccounts) {
		const toolkit = account.app.toLowerCase();
		const current = connectionsByToolkit.get(toolkit) ?? { active: 0, pending: 0, expired: 0, revoked: 0 };
		if (account.status === 'active') current.active += 1;
		if (account.status === 'pending') current.pending += 1;
		if (account.status === 'expired') current.expired += 1;
		if (account.status === 'revoked') current.revoked += 1;
		connectionsByToolkit.set(toolkit, current);
	}

	const passed = missingToolkits.length === 0 && missingAuthConfigMappings.length === 0;
	const output = {
		audit: {
			command: 'partner:composio:audit',
			timestamp: nowIso(),
			passed,
			strict_mode: strict,
		},
		summary: {
			total_toolkits_available: toolkitSummaries.length,
			required_toolkits: requiredToolkits,
			missing_toolkits: missingToolkits,
			missing_auth_config_mappings: missingAuthConfigMappings,
			workspace_account_id: workspaceAccountId ?? null,
			connected_accounts_total: connectedAccounts.length,
		},
		connections: [...connectionsByToolkit.entries()].map(([toolkit, counts]) => ({
			toolkit,
			...counts,
		})),
	};

	printJson(output);
	if (strict && !passed) {
		process.exit(1);
	}
}

function safeParseJsonObject(raw: string): Record<string, string> {
	const parsed = JSON.parse(raw) as unknown;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('COMPOSIO_AUTH_CONFIG_MAP_JSON must be a JSON object.');
	}

	const normalized: Record<string, string> = {};
	for (const [key, value] of Object.entries(parsed)) {
		if (typeof value !== 'string') continue;
		normalized[key.toLowerCase()] = value;
	}
	return normalized;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
