import type { PageServerLoad } from './$types';
import type { FunnelSummary, Lead } from '$lib/funnel';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		// Fetch funnel summary
		const summaryRes = await fetch('/api/funnel');
		const summary: FunnelSummary = summaryRes.ok
			? await summaryRes.json()
			: {
					period: { start: '', end: '' },
					totals: {
						impressions: 0,
						reach: 0,
						engagements: 0,
						website_visits: 0,
						discovery_calls: 0,
						proposals_sent: 0,
						deals_closed: 0,
						revenue: 0
					},
					changes: { impressions_delta: 0, reach_delta: 0, engagements_delta: 0 },
					pipeline: { awareness: 0, consideration: 0, decision: 0, won: 0, lost: 0 },
					pipeline_value: { total_estimated: 0, total_closed: 0 },
					conversion_rates: {
						impression_to_engagement: 0,
						visit_to_lead: 0,
						lead_to_call: 0,
						call_to_proposal: 0,
						proposal_to_close: 0
					}
				};

		// Fetch recent leads
		const leadsRes = await fetch('/api/funnel/leads');
		const leadsData: { leads: Lead[] } = leadsRes.ok ? await leadsRes.json() : { leads: [] };

		return {
			summary,
			leads: leadsData.leads
		};
	} catch (err) {
		console.error('Funnel load error:', err);
		return {
			summary: {
				period: { start: '', end: '' },
				totals: {
					impressions: 0,
					reach: 0,
					engagements: 0,
					website_visits: 0,
					discovery_calls: 0,
					proposals_sent: 0,
					deals_closed: 0,
					revenue: 0
				},
				changes: { impressions_delta: 0, reach_delta: 0, engagements_delta: 0 },
				pipeline: { awareness: 0, consideration: 0, decision: 0, won: 0, lost: 0 },
				pipeline_value: { total_estimated: 0, total_closed: 0 },
				conversion_rates: {
					impression_to_engagement: 0,
					visit_to_lead: 0,
					lead_to_call: 0,
					call_to_proposal: 0,
					proposal_to_close: 0
				}
			},
			leads: []
		};
	}
};
