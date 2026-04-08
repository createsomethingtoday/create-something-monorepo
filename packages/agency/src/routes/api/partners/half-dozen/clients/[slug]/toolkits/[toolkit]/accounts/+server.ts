import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	PartnerAuthHttpError,
	authorizePartnerToolkitAdminAction,
	getComposioClient,
	defaultToolkitComposioUserId,
	getPartnerClientBySlug,
	normalizePartnerSlug,
	normalizeToolkitSlug,
	parseJsonObject,
	randomId,
	requirePartnerAdmin,
	resolveAuthConfigId,
	type PartnerAuthToolkitAccountRow,
	type PartnerAuthToolkitPinRow,
} from '$lib/server/partner-auth';
import {
	hydrateToolkitAccounts,
	resolveToolkitAccountUpsert,
	type PartnerToolkitAccountStatusDeps,
} from '$lib/server/partner-toolkit-account-core';

interface CreateToolkitAccountBody {
	account_slug?: string;
	display_label?: string;
	sync_enabled?: boolean;
	auth_config_id?: string;
	metadata?: Record<string, unknown>;
}

export const GET: RequestHandler = async ({ request, params, platform }) => {
	try {
		const env = platform?.env;
		if (!env?.DB) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const actor = requirePartnerAdmin(request, env);
		const slug = normalizePartnerSlug(params.slug);
		const toolkit = normalizeToolkitSlug(params.toolkit);
		if (!slug || !toolkit) {
			return json({ error: 'invalid_request', message: 'Valid client slug and toolkit are required' }, { status: 400 });
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
			actionName: 'view_toolkit_auth',
			accessType: 'read',
			toolkit,
		});

		const accounts = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
			 WHERE partner_client_id = ? AND toolkit = ?
			 ORDER BY account_slug ASC`
		)
			.bind(client.id, toolkit)
			.all<PartnerAuthToolkitAccountRow>();
		const pins = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_pins
			 WHERE partner_client_id = ? AND toolkit = ?
			 ORDER BY tool_name ASC`
		)
			.bind(client.id, toolkit)
			.all<PartnerAuthToolkitPinRow>();
		const hydratedAccounts = await hydrateToolkitAccounts(createToolkitAccountStatusDeps(env), {
			db: env.DB,
			partnerClientId: client.id,
			toolkit,
		});

		return json({
			client: {
				id: client.id,
				slug: client.slug,
				display_name: client.display_name,
			},
			toolkit,
			auth_config_id: resolveAuthConfigId(env, toolkit),
			accounts: hydratedAccounts,
			pins: (pins.results ?? []).map((row) => ({
				tool_name: row.tool_name,
				account_slug: row.account_slug,
				metadata: parseJsonObject(row.metadata_json),
				created_at: row.created_at,
				updated_at: row.updated_at,
			})),
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

export const POST: RequestHandler = async ({ request, params, platform }) => {
	try {
		const env = platform?.env;
		if (!env?.DB) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const actor = requirePartnerAdmin(request, env);
		const slug = normalizePartnerSlug(params.slug);
		const toolkit = normalizeToolkitSlug(params.toolkit);
		if (!slug || !toolkit) {
			return json({ error: 'invalid_request', message: 'Valid client slug and toolkit are required' }, { status: 400 });
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
			actionName: 'upsert_toolkit_account',
			accessType: 'write',
			toolkit,
		});

		const body = (await request.json().catch(() => null)) as CreateToolkitAccountBody | null;
		const accountSlug = normalizePartnerSlug(body?.account_slug ?? '');
		if (!accountSlug) {
			return json({ error: 'invalid_request', message: 'account_slug is required' }, { status: 400 });
		}

		const existing = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
			 WHERE partner_client_id = ? AND toolkit = ? AND account_slug = ?
			 LIMIT 1`
		)
			.bind(client.id, toolkit, accountSlug)
			.first<PartnerAuthToolkitAccountRow>();

		const authConfigId = body?.auth_config_id?.trim() || existing?.auth_config_id || resolveAuthConfigId(env, toolkit);
		if (!authConfigId) {
			return json(
				{
					error: 'auth_config_missing',
					message: `No auth config is configured for ${toolkit}. Set COMPOSIO_AUTH_CONFIG_MAP_JSON.${toolkit} first.`,
				},
				{ status: 409 }
			);
		}

		const metadata =
			body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
		const resolved = resolveToolkitAccountUpsert({
			existing,
			accountSlug,
			actor,
			displayLabel: body?.display_label,
			syncEnabled: body?.sync_enabled,
			metadata,
			parseJsonObject,
		});
		const composioUserId =
			existing?.composio_user_id || defaultToolkitComposioUserId(client.slug, toolkit, accountSlug);

		if (existing) {
			await env.DB.prepare(
				`UPDATE partner_auth_toolkit_accounts
				 SET display_label = ?, auth_config_id = ?, sync_enabled = ?, status = 'active',
				     disabled_at = NULL, metadata_json = ?, updated_at = datetime('now')
				 WHERE id = ?`
			)
				.bind(
					resolved.displayLabel,
					authConfigId,
					resolved.syncEnabled ? 1 : 0,
					JSON.stringify(resolved.metadata),
					existing.id,
				)
				.run();
		} else {
			await env.DB.prepare(
				`INSERT INTO partner_auth_toolkit_accounts (
					 id, partner_client_id, toolkit, account_slug, display_label, composio_user_id, auth_config_id,
					 connection_status, status, sync_enabled, metadata_json
				 ) VALUES (?, ?, ?, ?, ?, ?, ?, 'INITIATED', 'active', ?, ?)`
			)
				.bind(
					randomId('patoolacct'),
					client.id,
					toolkit,
					accountSlug,
					resolved.displayLabel,
					composioUserId,
					authConfigId,
					resolved.syncEnabled ? 1 : 0,
					JSON.stringify(resolved.metadata)
				)
				.run();
		}

		await env.DB.prepare(
			`INSERT INTO partner_auth_toolkit_events (
				 id, partner_client_id, toolkit, account_slug, event_type, actor, metadata_json
			 ) VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(
				randomId('patoolevent'),
				client.id,
				toolkit,
				accountSlug,
				existing ? 'account_updated' : 'account_created',
				actor,
				JSON.stringify({
					auth_config_id: authConfigId,
					sync_enabled: resolved.syncEnabled,
					reactivated: resolved.reactivated,
				})
			)
			.run();

		return json({
			client_slug: client.slug,
			toolkit,
			account_slug: accountSlug,
			display_label: resolved.displayLabel,
			composio_user_id: composioUserId,
			auth_config_id: authConfigId,
			sync_enabled: resolved.syncEnabled,
			status: resolved.status,
			reactivated: resolved.reactivated,
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

function createToolkitAccountStatusDeps(env: App.Platform['env']): PartnerToolkitAccountStatusDeps {
	const listConnectedAccounts = createConnectedAccountLister(env);
	return {
		listToolkitAccounts: async (db, partnerClientId, toolkit) => {
			const result = await db
				.prepare(
					`SELECT * FROM partner_auth_toolkit_accounts
					 WHERE partner_client_id = ? AND toolkit = ?
					 ORDER BY account_slug ASC`
				)
				.bind(partnerClientId, toolkit)
				.all<PartnerAuthToolkitAccountRow>();
			return result.results ?? [];
		},
		listConnectedAccounts,
		normalizeToolkitSlug,
		parseJsonObject,
		...(listConnectedAccounts
			? {
					updateToolkitAccountSyncState: async (db: D1Database, input: {
						id: string;
						connectedAccountId: string | null;
						connectionStatus: string;
						lastCheckedAt: string;
						connectedAt: string | null;
					}) => {
						await db
							.prepare(
								`UPDATE partner_auth_toolkit_accounts
								 SET connected_account_id = ?,
								     connection_status = ?,
								     last_checked_at = ?,
								     connected_at = ?,
								     updated_at = datetime('now')
								 WHERE id = ?`
							)
							.bind(
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
): PartnerToolkitAccountStatusDeps['listConnectedAccounts'] {
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
