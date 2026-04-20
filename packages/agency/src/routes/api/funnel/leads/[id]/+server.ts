/**
 * Individual Lead API
 *
 * GET /api/funnel/leads/:id - Get a lead
 * PATCH /api/funnel/leads/:id - Update a lead (stage transitions, etc.)
 * DELETE /api/funnel/leads/:id - Delete a lead
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteLead, getLead, updateLead, type LeadUpdateInput } from '$lib/server/funnel-leads';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const GET: RequestHandler = async ({ params, platform, cookies }) => {
	await requireAgencyOperator({ cookies, platform });

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const { id } = params;

	try {
		const lead = await getLead(db, id);
		if (!lead) {
			throw error(404, 'Lead not found');
		}

		return json(lead);
	} catch (err) {
		if (err instanceof Error && err.message === 'Lead not found') {
			throw err;
		}
		console.error('Lead fetch error:', err);
		throw error(500, 'Failed to fetch lead');
	}
};

export const PATCH: RequestHandler = async ({ params, request, platform, cookies }) => {
	await requireAgencyOperator({ cookies, platform });

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const { id } = params;
	const input: LeadUpdateInput = await request.json();

	try {
		const lead = await updateLead(db, id, input);
		if (!lead) {
			throw error(404, 'Lead not found');
		}
		return json(lead);
	} catch (err) {
		if (err instanceof TypeError) {
			throw error(400, err.message);
		}
		if (err instanceof Error && err.message === 'Lead not found') {
			throw err;
		}
		console.error('Lead update error:', err);
		throw error(500, 'Failed to update lead');
	}
};

export const DELETE: RequestHandler = async ({ params, platform, cookies }) => {
	await requireAgencyOperator({ cookies, platform });

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const { id } = params;

	try {
		const deleted = await deleteLead(db, id);
		if (!deleted) {
			throw error(404, 'Lead not found');
		}

		return json({ success: true, deleted: id });
	} catch (err) {
		if (err instanceof Error && err.message === 'Lead not found') {
			throw err;
		}
		console.error('Lead delete error:', err);
		throw error(500, 'Failed to delete lead');
	}
};
