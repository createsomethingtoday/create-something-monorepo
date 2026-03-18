import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	authorizePartnerToolkitAdminAction,
	PartnerAuthHttpError,
	getPartnerClientBySlug,
	normalizePartnerSlug,
	parseJsonArray,
	parseJsonObject,
	randomId,
	requirePartnerAdmin,
	resolveAuthConfigId,
} from '$lib/server/partner-auth';
import { attachProspectToolkitAccountsForAgencyUser } from '$lib/server/partner-prospect-toolkit-status';

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
			toolkit: 'all',
		});

		const [enriched] = await attachProspectToolkitAccountsForAgencyUser({
			db: env.DB,
			env,
			prospects: [
				{
					client: {
						id: client.id,
					},
					prospect_claim: {
						state: 'claimed_by_you' as const,
						can_claim_now: true,
					},
				},
			],
		});
		const accounts = enriched?.toolkit_accounts ?? [];

		for (const account of accounts) {
			if (!account.connected_account_id) continue;
			await env.DB.prepare(
				`INSERT INTO partner_auth_connections (
           id, partner_client_id, toolkit, auth_config_id, connected_account_id, connection_status,
           last_checked_at, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
         ON CONFLICT(partner_client_id, toolkit, connected_account_id) DO UPDATE SET
           auth_config_id = excluded.auth_config_id,
           connection_status = excluded.connection_status,
           last_checked_at = datetime('now'),
           metadata_json = excluded.metadata_json,
           updated_at = datetime('now')`
			)
				.bind(
					randomId('paconn'),
					client.id,
					account.toolkit,
					account.auth_config_id,
					account.connected_account_id,
					account.connection_status,
					JSON.stringify({
						source: 'partner_auth_toolkit_accounts',
						account_slug: account.account_slug,
						composio_user_id: account.composio_user_id,
						connected_at: account.connected_at,
						last_checked_at: account.last_checked_at,
					}),
				)
				.run();
		}

		const requiredToolkits = parseJsonArray(client.required_toolkits_json);
		const statusByToolkit = new Map<
			string,
			{
				connected: boolean;
				status: string;
				auth_config_id: string | null;
				connected_account_ids: string[];
			}
		>();

		for (const account of accounts) {
			const current = statusByToolkit.get(account.toolkit) ?? {
				connected: false,
				status: 'NOT_CONNECTED',
				auth_config_id: null,
				connected_account_ids: [],
			};
			current.connected = current.connected || account.connected;
			current.status = pickPreferredToolkitStatus(current.status, account.connection_status);
			current.auth_config_id = current.auth_config_id ?? account.auth_config_id;
			if (account.connected_account_id && !current.connected_account_ids.includes(account.connected_account_id)) {
				current.connected_account_ids.push(account.connected_account_id);
			}
			statusByToolkit.set(account.toolkit, current);
		}

		const toolkitStatus = [...new Set([...requiredToolkits, ...accounts.map((account) => account.toolkit)])].map((toolkit) => {
			const accountStatus = statusByToolkit.get(toolkit);
			return {
				toolkit,
				required: requiredToolkits.includes(toolkit),
				auth_config_id: accountStatus?.auth_config_id ?? resolveAuthConfigId(env, toolkit),
				connected: accountStatus?.connected ?? false,
				connection_status: accountStatus?.status ?? 'NOT_CONNECTED',
				connected_account_ids: accountStatus?.connected_account_ids ?? [],
			};
		});

		return json({
			client: {
				id: client.id,
				slug: client.slug,
				display_name: client.display_name,
				workspace_account_id: client.workspace_account_id,
				identity_account_id: client.identity_account_id,
				required_toolkits: requiredToolkits,
				metadata: parseJsonObject(client.metadata_json),
			},
			toolkits: toolkitStatus,
			checked_at: new Date().toISOString(),
			policy: authz.policy,
		});
	} catch (error) {
		if (error instanceof PartnerAuthHttpError) {
			return json({ error: error.code, message: error.message }, { status: error.status });
		}

		return json(
			{
				error: 'internal_error',
				message: error instanceof Error ? error.message : 'Unexpected error',
			},
			{ status: 500 },
		);
	}
};

function pickPreferredToolkitStatus(current: string, next: string): string {
	return toolkitStatusRank(next) >= toolkitStatusRank(current) ? next : current;
}

function toolkitStatusRank(value: string): number {
	switch (String(value).toUpperCase()) {
		case 'ACTIVE':
			return 5;
		case 'CONNECTED':
			return 4;
		case 'INITIATED':
			return 3;
		case 'UNKNOWN':
			return 2;
		case 'NOT_CONNECTED':
			return 1;
		default:
			return 2;
	}
}
