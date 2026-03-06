import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	PartnerAuthHttpError,
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

		requirePartnerAdmin(request, env);
		const slug = normalizePartnerSlug(params.slug);
		const toolkit = normalizeToolkitSlug(params.toolkit);
		if (!slug || !toolkit) {
			return json({ error: 'invalid_request', message: 'Valid client slug and toolkit are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}

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

		return json({
			client: {
				id: client.id,
				slug: client.slug,
				display_name: client.display_name,
			},
			toolkit,
			auth_config_id: resolveAuthConfigId(env, toolkit),
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

		const displayLabel = body?.display_label?.trim() || existing?.display_label || accountSlug;
		const syncEnabled =
			typeof body?.sync_enabled === 'boolean' ? body.sync_enabled : Boolean(existing?.sync_enabled ?? 1);
		const composioUserId =
			existing?.composio_user_id || defaultToolkitComposioUserId(client.slug, toolkit, accountSlug);
		const metadata = {
			...parseJsonObject(existing?.metadata_json),
			...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
			last_updated_by: actor,
		};

		if (existing) {
			await env.DB.prepare(
				`UPDATE partner_auth_toolkit_accounts
				 SET display_label = ?, auth_config_id = ?, sync_enabled = ?, metadata_json = ?, updated_at = datetime('now')
				 WHERE id = ?`
			)
				.bind(displayLabel, authConfigId, syncEnabled ? 1 : 0, JSON.stringify(metadata), existing.id)
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
					displayLabel,
					composioUserId,
					authConfigId,
					syncEnabled ? 1 : 0,
					JSON.stringify(metadata)
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
				JSON.stringify({ auth_config_id: authConfigId, sync_enabled: syncEnabled })
			)
			.run();

		return json({
			client_slug: client.slug,
			toolkit,
			account_slug: accountSlug,
			composio_user_id: composioUserId,
			auth_config_id: authConfigId,
			sync_enabled: syncEnabled,
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
