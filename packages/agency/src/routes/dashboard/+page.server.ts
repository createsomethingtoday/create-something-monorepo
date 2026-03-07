import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ensureAgencyMcpEntitlement } from '$lib/server/mcp-token';

interface CommercialStateRow {
	service_tier: string | null;
	subscription_status: string | null;
	contract_active: number;
	billing_active: number;
	current_period_end: string | null;
	last_invoice_status: string | null;
}

interface ContractStateRow {
	contract_reference: string;
	contract_status: 'draft' | 'pending' | 'active' | 'paused' | 'expired' | 'terminated';
	effective_at: string | null;
	expires_at: string | null;
}

interface PartnerSummaryRow {
	partner_key: string;
	slug: string;
	status: string;
	workspace_account_id: string;
	identity_tenant_id: string | null;
	owner_email: string | null;
	consent_active: number;
	toolkit_accounts: number;
	notion_accounts: number;
}

interface ActivitySummaryRow {
	total_sessions: number;
	page_views: number;
	interactions: number;
	conversions: number;
	duration_seconds: number;
}

interface RecentEventRow {
	category: string;
	action: string;
	target: string | null;
	url: string;
	created_at: string;
}

interface TopPageRow {
	url: string;
	views: number;
}

interface DailyActivityRow {
	date: string;
	events: number;
	page_views: number;
}

export const load: PageServerLoad = async ({ parent, platform }) => {
	const { user } = await parent();

	if (!user) {
		throw redirect(303, '/login?redirect=/dashboard');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw redirect(303, '/login?error=database_unavailable');
	}

	const { row: entitlement, decision } = await ensureAgencyMcpEntitlement({
		platform,
		user,
	});

	const normalizedEmail = user.email.toLowerCase();

	const [commercial, contract, partner, activitySummary, recentEventsResult, topPagesResult, dailyActivityResult] =
		await Promise.all([
			db
				.prepare(
					`SELECT service_tier, subscription_status, contract_active, billing_active,
					        current_period_end, last_invoice_status
					 FROM agency_commercial_accounts
					 WHERE normalized_email = ?
					 ORDER BY billing_active DESC, contract_active DESC, updated_at DESC
					 LIMIT 1`
				)
				.bind(normalizedEmail)
				.first<CommercialStateRow>(),
			db
				.prepare(
					`SELECT contract_reference, contract_status, effective_at, expires_at
					 FROM agency_contract_state
					 WHERE auth_subject = ? OR normalized_email = ?
					 ORDER BY contract_active DESC, updated_at DESC
					 LIMIT 1`
				)
				.bind(user.id, normalizedEmail)
				.first<ContractStateRow>(),
			db
				.prepare(
					`SELECT
					    c.partner_key,
					    c.slug,
					    c.status,
					    c.workspace_account_id,
					    c.identity_tenant_id,
					    c.owner_email,
					    CASE WHEN consent.id IS NULL THEN 0 ELSE 1 END AS consent_active,
					    COUNT(DISTINCT CASE WHEN toolkit.status = 'active' THEN toolkit.id END) AS toolkit_accounts,
					    COUNT(DISTINCT CASE WHEN notion.status = 'active' THEN notion.id END) AS notion_accounts
					 FROM partner_auth_clients c
					 LEFT JOIN partner_auth_consents consent
					   ON consent.partner_client_id = c.id
					  AND consent.revoked_at IS NULL
					  AND (consent.expires_at IS NULL OR consent.expires_at > datetime('now'))
					 LEFT JOIN partner_auth_toolkit_accounts toolkit
					   ON toolkit.partner_client_id = c.id
					 LEFT JOIN partner_auth_notion_accounts notion
					   ON notion.partner_client_id = c.id
					 WHERE c.identity_user_id = ?
					    OR lower(COALESCE(c.owner_email, '')) = ?
					 GROUP BY c.id, c.partner_key, c.slug, c.status, c.workspace_account_id, c.identity_tenant_id, c.owner_email, consent.id
					 ORDER BY
					    CASE c.status
					      WHEN 'active' THEN 0
					      WHEN 'paused' THEN 1
					      WHEN 'initialized' THEN 2
					      ELSE 3
					    END,
					    c.updated_at DESC
					 LIMIT 1`
				)
				.bind(user.id, normalizedEmail)
				.first<PartnerSummaryRow>(),
			db
				.prepare(
					`SELECT
					    COUNT(*) AS total_sessions,
					    COALESCE(SUM(page_views), 0) AS page_views,
					    COALESCE(SUM(interactions), 0) AS interactions,
					    COALESCE(SUM(conversions), 0) AS conversions,
					    COALESCE(SUM(duration_seconds), 0) AS duration_seconds
					 FROM unified_sessions
					 WHERE user_id = ?
					   AND property = 'agency'
					   AND started_at >= datetime('now', '-30 days')`
				)
				.bind(user.id)
				.first<ActivitySummaryRow>(),
			db
				.prepare(
					`SELECT category, action, target, url, created_at
					 FROM unified_events
					 WHERE user_id = ?
					   AND property = 'agency'
					   AND created_at >= datetime('now', '-30 days')
					 ORDER BY created_at DESC
					 LIMIT 8`
				)
				.bind(user.id)
				.all<RecentEventRow>(),
			db
				.prepare(
					`SELECT url, COUNT(*) AS views
					 FROM unified_events
					 WHERE user_id = ?
					   AND property = 'agency'
					   AND action = 'page_view'
					   AND created_at >= datetime('now', '-30 days')
					 GROUP BY url
					 ORDER BY views DESC
					 LIMIT 5`
				)
				.bind(user.id)
				.all<TopPageRow>(),
			db
				.prepare(
					`SELECT
					    substr(created_at, 1, 10) AS date,
					    COUNT(*) AS events,
					    SUM(CASE WHEN action = 'page_view' THEN 1 ELSE 0 END) AS page_views
					 FROM unified_events
					 WHERE user_id = ?
					   AND property = 'agency'
					   AND created_at >= datetime('now', '-30 days')
					 GROUP BY substr(created_at, 1, 10)
					 ORDER BY date ASC`
				)
				.bind(user.id)
				.all<DailyActivityRow>(),
		]);

	const summary = activitySummary ?? {
		total_sessions: 0,
		page_views: 0,
		interactions: 0,
		conversions: 0,
		duration_seconds: 0,
	};

	return {
		user,
		overview: {
			accessAllowed: decision.allowed,
			accessReason: decision.reason,
			serviceTier: commercial?.service_tier ?? entitlement.service_tier ?? 'agency',
			connectedAccounts: (partner?.toolkit_accounts ?? 0) + (partner?.notion_accounts ?? 0),
			totalSessions: summary.total_sessions,
			totalPageViews: summary.page_views,
			totalInteractions: summary.interactions,
			totalConversions: summary.conversions,
			totalTimeMinutes: Math.round(summary.duration_seconds / 60),
		},
		entitlement: {
			updatedAt: entitlement.updated_at,
			accountId: entitlement.account_id,
			tenantId: entitlement.tenant_id,
			decision,
		},
		commercial: commercial ?? null,
		contract: contract ?? null,
		partner: partner ?? null,
		activity: {
			recentEvents: recentEventsResult.results ?? [],
			topPages: topPagesResult.results ?? [],
			daily: dailyActivityResult.results ?? [],
		},
	};
};
