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
			actionName: 'create_toolkit_connect_link',
			accessType: 'auth_admin',
			toolkit: 'notion',
			accountSlug,
		});

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
			return json(
				{
					error: 'invalid_state',
					message: 'Only active Notion account bindings can issue a connect link. Re-enable the binding first.',
				},
				{ status: 409 }
			);
		}

		const body = (await request.json().catch(() => null)) as ConnectLinkBody | null;
		const callbackUrl = body?.callback_url?.trim() || url.searchParams.get('callback_url') || undefined;
		const authConfigId =
			body?.auth_config_id?.trim() || account.auth_config_id || resolveAuthConfigId(env, 'notion');
		if (!authConfigId) {
			return json(
				{
					error: 'auth_config_missing',
					message: 'No Notion auth config is configured. Set COMPOSIO_AUTH_CONFIG_MAP_JSON.notion first.',
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
			`UPDATE partner_auth_notion_accounts
			 SET auth_config_id = ?, connected_account_id = COALESCE(?, connected_account_id),
			     connection_status = 'INITIATED', metadata_json = ?, updated_at = datetime('now')
			 WHERE id = ?`
		)
			.bind(authConfigId, connectionRequest.id ?? null, JSON.stringify(metadata), account.id)
			.run();

		await env.DB.prepare(
			`INSERT INTO partner_auth_notion_events (
				 id, partner_client_id, account_slug, event_type, actor, metadata_json
			 ) VALUES (?, ?, ?, 'connect_link_created', ?, ?)`
		)
			.bind(
				randomId('panevent'),
				client.id,
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
