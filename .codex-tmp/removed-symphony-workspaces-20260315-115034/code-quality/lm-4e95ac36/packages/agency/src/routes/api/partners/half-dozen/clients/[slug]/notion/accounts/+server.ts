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
	resolveAuthConfigId,
	type PartnerAuthNotionAccountRow,
	type PartnerAuthNotionPinRow,
} from '$lib/server/partner-auth';

interface CreateNotionAccountBody {
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
		if (!slug) {
			return json({ error: 'invalid_request', message: 'Client slug is required' }, { status: 400 });
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
			toolkit: 'notion',
		});

		const accounts = await env.DB.prepare(
			`SELECT * FROM partner_auth_notion_accounts
			 WHERE partner_client_id = ?
			 ORDER BY account_slug ASC`
		)
			.bind(client.id)
			.all<PartnerAuthNotionAccountRow>();
		const pins = await env.DB.prepare(
			`SELECT * FROM partner_auth_notion_pins
			 WHERE partner_client_id = ?
			 ORDER BY tool_name ASC`
		)
			.bind(client.id)
			.all<PartnerAuthNotionPinRow>();

		return json({
			client: {
				id: client.id,
				slug: client.slug,
				display_name: client.display_name,
			},
			auth_config_id: resolveAuthConfigId(env, 'notion'),
			accounts: (accounts.results ?? []).map((row) => ({
				id: row.id,
				account_slug: row.account_slug,
				display_label: row.display_label,
				composio_user_id: row.composio_user_id,
				auth_config_id: row.auth_config_id,
				connected_account_id: row.connected_account_id,
				connection_status: row.connection_status,
				status: row.status,
				sync_enabled: Boolean(row.sync_enabled),
				last_checked_at: row.last_checked_at,
				connected_at: row.connected_at,
				disabled_at: row.disabled_at,
				metadata: parseJsonObject(row.metadata_json),
				created_at: row.created_at,
				updated_at: row.updated_at,
			})),
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
		if (!slug) {
			return json({ error: 'invalid_request', message: 'Client slug is required' }, { status: 400 });
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
			toolkit: 'notion',
		});

		const body = (await request.json().catch(() => null)) as CreateNotionAccountBody | null;
		const accountSlug = normalizePartnerSlug(body?.account_slug ?? '');
		if (!accountSlug) {
			return json({ error: 'invalid_request', message: 'account_slug is required' }, { status: 400 });
		}

		const existing = await env.DB.prepare(
			`SELECT * FROM partner_auth_notion_accounts
			 WHERE partner_client_id = ? AND account_slug = ?
			 LIMIT 1`
		)
			.bind(client.id, accountSlug)
			.first<PartnerAuthNotionAccountRow>();

		const authConfigId = body?.auth_config_id?.trim() || resolveAuthConfigId(env, 'notion');
		if (!authConfigId) {
			return json(
				{
					error: 'auth_config_missing',
					message: 'No Notion auth config is configured. Set COMPOSIO_AUTH_CONFIG_MAP_JSON.notion first.',
				},
				{ status: 409 }
			);
		}

		const displayLabel = body?.display_label?.trim() || existing?.display_label || accountSlug;
		const syncEnabled =
			typeof body?.sync_enabled === 'boolean' ? body.sync_enabled : Boolean(existing?.sync_enabled ?? 1);
		const composioUserId =
			existing?.composio_user_id || `hd_notion_${client.slug.replace(/-/g, '_')}_${accountSlug.replace(/-/g, '_')}`;
		const metadata = {
			...parseJsonObject(existing?.metadata_json),
			...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
			last_updated_by: actor,
		};

		if (existing) {
			await env.DB.prepare(
				`UPDATE partner_auth_notion_accounts
				 SET display_label = ?, auth_config_id = ?, sync_enabled = ?, metadata_json = ?, updated_at = datetime('now')
				 WHERE id = ?`
			)
				.bind(displayLabel, authConfigId, syncEnabled ? 1 : 0, JSON.stringify(metadata), existing.id)
				.run();
		} else {
			await env.DB.prepare(
				`INSERT INTO partner_auth_notion_accounts (
					 id, partner_client_id, account_slug, display_label, composio_user_id, auth_config_id,
					 connection_status, status, sync_enabled, metadata_json
				 ) VALUES (?, ?, ?, ?, ?, ?, 'INITIATED', 'active', ?, ?)`
			)
				.bind(
					randomId('panotion'),
					client.id,
					accountSlug,
					displayLabel,
					composioUserId,
					authConfigId,
					syncEnabled ? 1 : 0,
					JSON.stringify(metadata)
				)
				.run();
		}

		await env.DB.prepare(
			`INSERT INTO partner_auth_notion_events (
				 id, partner_client_id, account_slug, event_type, actor, metadata_json
			 ) VALUES (?, ?, ?, ?, ?, ?)`
		)
			.bind(
				randomId('panevent'),
				client.id,
				accountSlug,
				existing ? 'account_updated' : 'account_created',
				actor,
				JSON.stringify({ auth_config_id: authConfigId, sync_enabled: syncEnabled }),
			)
			.run();

		return json({
			client_slug: client.slug,
			account_slug: accountSlug,
			composio_user_id: composioUserId,
			auth_config_id: authConfigId,
			sync_enabled: syncEnabled,
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
