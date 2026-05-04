import { HALF_DOZEN_PARTNER_KEY, postIdentityAdmin } from '$lib/server/partner-auth';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { PageServerLoad } from './$types';

interface IdentityAuditFeed {
	auth_events: Array<{
		id: string;
		session_id: string | null;
		user_id: string | null;
		event_type: string;
		event_data_json: string;
		created_at: string;
	}>;
	policy_events: Array<{
		id: string;
		policy_id: string;
		action_name: string;
		account_id: string | null;
		actor: string | null;
		final_decision: string;
		reason?: string | null;
		metadata_json: string;
		created_at: string;
	}>;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	await requireAgencyOperator({ locals, platform });
	const db = platform!.env.DB;
	const deliveries = await db
		.prepare(
			`SELECT d.*, c.slug AS client_slug, c.display_name AS client_display_name
       FROM partner_access_deliveries d
       JOIN partner_auth_clients c ON c.id = d.partner_client_id
       WHERE c.partner_key = ?
       ORDER BY d.created_at DESC
       LIMIT 100`
		)
		.bind(HALF_DOZEN_PARTNER_KEY)
		.all<{
			id: string;
			partner_client_id: string;
			delivery_type: string;
			delivery_channel: string;
			delivered_by: string;
			recipient: string | null;
			artifact_ref: string | null;
			expires_at: string | null;
			revoked_at: string | null;
			metadata_json: string;
			created_at: string;
			client_slug: string;
			client_display_name: string | null;
		}>();

	const identityAudit = await postIdentityAdmin<IdentityAuditFeed>(
		platform!.env,
		'/v1/mcp/audit/admin-feed',
		{ limit: 100 }
	);

	return {
		deliveries: deliveries.results ?? [],
		authEvents: identityAudit.auth_events,
		policyEvents: identityAudit.policy_events,
	};
};
