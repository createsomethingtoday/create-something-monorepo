/**
 * Leads API
 *
 * GET /api/funnel/leads - Get leads
 * POST /api/funnel/leads - Create a lead
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { LeadInput } from '$lib/funnel';
import { createLead, isFunnelStage, isLeadSource, listLeads } from '$lib/server/funnel-leads';
import { runFunnelLeadAutomation } from '$lib/server/funnel-automation';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	await requireAgencyOperator({ cookies, platform });

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const stageParam = url.searchParams.get('stage');
	const sourceParam = url.searchParams.get('source');
	const campaign = url.searchParams.get('campaign');

	if (stageParam && !isFunnelStage(stageParam)) {
		throw error(400, 'Invalid stage');
	}

	if (sourceParam && !isLeadSource(sourceParam)) {
		throw error(400, 'Invalid source');
	}

	const stage = stageParam && isFunnelStage(stageParam) ? stageParam : undefined;
	const source = sourceParam && isLeadSource(sourceParam) ? sourceParam : undefined;

	try {
		const leads = await listLeads(db, {
			stage,
			source,
			campaign: campaign ?? undefined
		});
		return json({ leads });
	} catch (err) {
		console.error('Leads query error:', err);
		return json({ leads: [] });
	}
};

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	await requireAgencyOperator({ cookies, platform });

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const input: LeadInput = await request.json();

	if (!input.name) {
		throw error(400, 'Name is required');
	}

	if (!input.source) {
		throw error(400, 'Source is required');
	}

	try {
		const lead = await createLead(db, input);
		const automationPromise = runFunnelLeadAutomation({
			db,
			env: platform.env,
			lead,
			trigger: 'lead_created'
		}).catch((automationError) => {
			console.error('Funnel lead create automation failed:', automationError);
			return null;
		});

		if (platform.context) {
			platform.context.waitUntil(automationPromise);
		} else {
			await automationPromise;
		}

		return json({ success: true, id: lead.id, stage: lead.stage });
	} catch (err) {
		if (err instanceof TypeError) {
			throw error(400, err.message);
		}
		console.error('Lead insert error:', err);
		throw error(500, 'Failed to create lead');
	}
};
