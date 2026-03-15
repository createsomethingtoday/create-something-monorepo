import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	PartnerAuthHttpError,
	authorizePartnerToolkitAdminAction,
	getComposioClient,
	getPartnerClientBySlug,
	normalizePartnerSlug,
	normalizeToolkitSlug,
	parseJsonObject,
	randomId,
	requirePartnerAdmin,
	resolveAuthConfigId,
	type PartnerAuthToolkitAccountRow,
} from '$lib/server/partner-auth';

interface ConnectLinkBody {
	callback_url?: string;
	auth_config_id?: string;
	metadata?: Record<string, unknown>;
}

export const POST: RequestHandler = async ({ request, params, platform, url }) => {
	try {
		const env = platform?.env;
		if (!env?.DB) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const actor = requirePartnerAdmin(request, env);
		const slug = normalizePartnerSlug(params.slug);
		const toolkit = normalizeToolkitSlug(params.toolkit);
		const accountSlug = normalizePartnerSlug(params.accountSlug);
		if (!slug || !toolkit || !accountSlug) {
			return json({ error: 'invalid_request', message: 'Valid client, toolkit, and account slugs are required' }, { status: 400 });
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
			actionName: 'create_toolkit_connect_link',
			accessType: 'auth_admin',
			toolkit,
			accountSlug,
		});

		const account = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
			 WHERE partner_client_id = ? AND toolkit = ? AND account_slug = ?
			 LIMIT 1`
		)
			.bind(client.id, toolkit, accountSlug)
			.first<PartnerAuthToolkitAccountRow>();
		if (!account) {
			return json({ error: 'not_found', message: 'Toolkit account binding not found' }, { status: 404 });
		}

		const body = (await request.json().catch(() => null)) as ConnectLinkBody | null;
		const callbackUrl = body?.callback_url?.trim() || url.searchParams.get('callback_url') || undefined;
		const authConfigId =
			body?.auth_config_id?.trim() || account.auth_config_id || resolveAuthConfigId(env, toolkit);
		if (!authConfigId) {
			return json(
				{
					error: 'auth_config_missing',
					message: `No auth config is configured for ${toolkit}. Set COMPOSIO_AUTH_CONFIG_MAP_JSON.${toolkit} first.`,
				},
				{ status: 409 }
			);
		}

		const composio = getComposioClient(env);
		const connectionRequest = await composio.connectedAccounts.link(account.composio_user_id, authConfigId, {
			...(callbackUrl ? { callbackUrl } : {}),
		});
		if (!connectionRequest.redirectUrl) {
			return json(
				{
					error: 'connect_link_unavailable',
					message: 'Composio did not return a redirect URL for this account.',
				},
				{ status: 502 }
			);
		}

		const metadata = {
			...parseJsonObject(account.metadata_json),
			...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
			last_connect_link_issued_by: actor,
			last_connect_link_issued_at: new Date().toISOString(),
		};

		await env.DB.prepare(
			`UPDATE partner_auth_toolkit_accounts
			 SET auth_config_id = ?, connected_account_id = COALESCE(?, connected_account_id),
			     connection_status = 'INITIATED', metadata_json = ?, updated_at = datetime('now')
			 WHERE id = ?`
		)
			.bind(authConfigId, connectionRequest.id ?? null, JSON.stringify(metadata), account.id)
			.run();

		await env.DB.prepare(
			`INSERT INTO partner_auth_toolkit_events (
				 id, partner_client_id, toolkit, account_slug, event_type, actor, metadata_json
			 ) VALUES (?, ?, ?, ?, 'connect_link_created', ?, ?)`
		)
			.bind(
				randomId('patoolevent'),
				client.id,
				toolkit,
				accountSlug,
				actor,
				JSON.stringify({
					auth_config_id: authConfigId,
					connection_request_id: connectionRequest.id ?? null,
					callback_url: callbackUrl ?? null,
				})
			)
			.run();

		return json({
			client_slug: client.slug,
			toolkit,
			account_slug: account.account_slug,
			composio_user_id: account.composio_user_id,
			auth_config_id: authConfigId,
			connection_request_id: connectionRequest.id ?? null,
			connect_link: connectionRequest.redirectUrl,
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
