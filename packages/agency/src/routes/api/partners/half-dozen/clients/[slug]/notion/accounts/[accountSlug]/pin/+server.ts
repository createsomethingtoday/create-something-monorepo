import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	PartnerAuthHttpError,
	authorizePartnerToolkitAdminAction,
	getComposioClient,
	getPartnerClientBySlug,
	normalizePartnerSlug,
	parseJsonObject,
	randomId,
	requirePartnerAdmin,
	type PartnerAuthNotionAccountRow,
	type PartnerAuthNotionPinRow,
} from '$lib/server/partner-auth';
import {
	hydrateNotionAccount,
	type PartnerNotionAccountStatusDeps,
} from '$lib/server/partner-notion-account-core';

interface PinAccountBody {
	tool_name?: string;
	metadata?: Record<string, unknown>;
}

const ALLOWED_PINNED_TOOLS = new Set(['halfdozen_notion', 'blondish_notion']);

export const POST: RequestHandler = async ({ request, params, platform }) => {
	try {
		const env = platform?.env;
		if (!env?.DB) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const actor = requirePartnerAdmin(request, env);
		const slug = normalizePartnerSlug(params.slug);
		const accountSlug = normalizePartnerSlug(params.accountSlug);
		if (!slug || !accountSlug) {
			return json({ error: 'invalid_request', message: 'Valid client and account slugs are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const authz = await authorizePartnerToolkitAdminAction({
			request,
			env,
			client,
			actor,
			actionName: 'pin_toolkit_account',
			accessType: 'write',
			toolkit: 'notion',
			accountSlug,
		});

		const body = (await request.json().catch(() => null)) as PinAccountBody | null;
		const toolName = String(body?.tool_name ?? '').trim();
		if (!ALLOWED_PINNED_TOOLS.has(toolName)) {
			return json(
				{
					error: 'invalid_request',
					message: 'tool_name must be one of: halfdozen_notion, blondish_notion',
				},
				{ status: 400 }
			);
		}

		const account = await env.DB.prepare(
			`SELECT * FROM partner_auth_notion_accounts
			 WHERE partner_client_id = ? AND account_slug = ?
			 LIMIT 1`
		)
			.bind(client.id, accountSlug)
			.first<PartnerAuthNotionAccountRow>();
		if (!account) {
			return json({ error: 'not_found', message: 'Notion account binding not found' }, { status: 404 });
		}
		if (account.status !== 'active') {
			return json({ error: 'invalid_state', message: 'Only active accounts can be pinned.' }, { status: 409 });
		}
		const hydratedAccount = await hydrateNotionAccount(createNotionAccountStatusDeps(env), {
			db: env.DB,
			account,
		});
		if (!hydratedAccount.connected) {
			return json(
				{
					error: 'invalid_state',
					message: `Workspace "${accountSlug}" is not connected. Issue a connect link and complete Notion auth before pinning.`,
				},
				{ status: 409 }
			);
		}

		const existing = await env.DB.prepare(
			`SELECT * FROM partner_auth_notion_pins
			 WHERE partner_client_id = ? AND tool_name = ?
			 LIMIT 1`
		)
			.bind(client.id, toolName)
			.first<PartnerAuthNotionPinRow>();
		const metadata = {
			...parseJsonObject(existing?.metadata_json),
			...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
			pinned_by: actor,
		};

		if (existing) {
			await env.DB.prepare(
				`UPDATE partner_auth_notion_pins
				 SET account_slug = ?, metadata_json = ?, updated_at = datetime('now')
				 WHERE id = ?`
			)
				.bind(accountSlug, JSON.stringify(metadata), existing.id)
				.run();
		} else {
			await env.DB.prepare(
				`INSERT INTO partner_auth_notion_pins (
					 id, partner_client_id, tool_name, account_slug, metadata_json
				 ) VALUES (?, ?, ?, ?, ?)`
			)
				.bind(randomId('panpin'), client.id, toolName, accountSlug, JSON.stringify(metadata))
				.run();
		}

		await env.DB.prepare(
			`INSERT INTO partner_auth_notion_events (
				 id, partner_client_id, account_slug, event_type, actor, metadata_json
			 ) VALUES (?, ?, ?, 'tool_pinned', ?, ?)`
		)
			.bind(randomId('panevent'), client.id, accountSlug, actor, JSON.stringify({ tool_name: toolName }))
			.run();

		return json({
			client_slug: client.slug,
			tool_name: toolName,
			account_slug: hydratedAccount.account_slug,
			connection_status: hydratedAccount.connection_status,
			policy: authz.policy,
		});
	} catch (error) {
		if (error instanceof PartnerAuthHttpError) {
			return json({ error: error.code, message: error.message }, { status: error.status });
		}

		return json(
			{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
			{ status: 500 }
		);
	}
};

function createNotionAccountStatusDeps(env: App.Platform['env']): PartnerNotionAccountStatusDeps {
	const listConnectedAccounts = createConnectedAccountLister(env);
	return {
		listConnectedAccounts,
		parseJsonObject,
		...(listConnectedAccounts
			? {
					updateNotionAccountSyncState: async (db: D1Database, input: {
						id: string;
						authConfigId: string | null;
						connectedAccountId: string | null;
						connectionStatus: string;
						lastCheckedAt: string;
						connectedAt: string | null;
					}) => {
						await db
							.prepare(
								`UPDATE partner_auth_notion_accounts
								 SET auth_config_id = COALESCE(?, auth_config_id),
								     connected_account_id = ?,
								     connection_status = ?,
								     last_checked_at = ?,
								     connected_at = ?,
								     updated_at = datetime('now')
								 WHERE id = ?`
							)
							.bind(
								input.authConfigId,
								input.connectedAccountId,
								input.connectionStatus,
								input.lastCheckedAt,
								input.connectedAt,
								input.id,
							)
							.run();
					},
				}
			: {}),
	};
}

function createConnectedAccountLister(
	env: App.Platform['env']
): PartnerNotionAccountStatusDeps['listConnectedAccounts'] {
	if (!env?.COMPOSIO_API_KEY?.trim()) {
		return undefined;
	}

	return async (userIds: string[]) => {
		if (userIds.length === 0) {
			return [];
		}

		const composio = getComposioClient(env);
		const response = await composio.connectedAccounts.list({ userIds });
		return Array.isArray((response as { items?: unknown[] }).items)
			? ((response as { items: unknown[] }).items as any[])
			: Array.isArray(response)
				? (response as any[])
				: [];
	};
}
