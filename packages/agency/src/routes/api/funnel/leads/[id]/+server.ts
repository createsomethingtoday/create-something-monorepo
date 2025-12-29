/**
 * Individual Lead API
 *
 * GET /api/funnel/leads/:id - Get a lead
 * PATCH /api/funnel/leads/:id - Update a lead (stage transitions, etc.)
 * DELETE /api/funnel/leads/:id - Delete a lead
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Lead, FunnelStage } from '$lib/funnel';

interface LeadUpdateInput {
	stage?: FunnelStage;
	name?: string;
	email?: string;
	company?: string;
	role?: string;
	linkedin_url?: string;
	source_detail?: string;
	campaign?: string;
	estimated_value?: number;
	actual_value?: number;
	service_interest?: string;
	notes?: string;
	discovery_call_at?: string;
	proposal_sent_at?: string;
	closed_at?: string;
}

export const GET: RequestHandler = async ({ params, platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const { id } = params;

	try {
		const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();

		if (!lead) {
			throw error(404, 'Lead not found');
		}

		return json(lead as unknown as Lead);
	} catch (err) {
		if (err instanceof Error && err.message === 'Lead not found') {
			throw err;
		}
		console.error('Lead fetch error:', err);
		throw error(500, 'Failed to fetch lead');
	}
};

export const PATCH: RequestHandler = async ({ params, request, platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const { id } = params;
	const input: LeadUpdateInput = await request.json();
	const now = new Date().toISOString();

	// Build update query dynamically
	const updates: string[] = ['updated_at = ?', 'last_touch_at = ?'];
	const values: (string | number | null)[] = [now, now];

	if (input.stage !== undefined) {
		updates.push('stage = ?');
		values.push(input.stage);

		// Set stage-specific timestamps
		if (input.stage === 'decision' && !input.discovery_call_at) {
			updates.push('discovery_call_at = ?');
			values.push(now);
		}
		if ((input.stage === 'won' || input.stage === 'lost') && !input.closed_at) {
			updates.push('closed_at = ?');
			values.push(now);
		}
	}

	if (input.name !== undefined) {
		updates.push('name = ?');
		values.push(input.name);
	}
	if (input.email !== undefined) {
		updates.push('email = ?');
		values.push(input.email);
	}
	if (input.company !== undefined) {
		updates.push('company = ?');
		values.push(input.company);
	}
	if (input.role !== undefined) {
		updates.push('role = ?');
		values.push(input.role);
	}
	if (input.linkedin_url !== undefined) {
		updates.push('linkedin_url = ?');
		values.push(input.linkedin_url);
	}
	if (input.source_detail !== undefined) {
		updates.push('source_detail = ?');
		values.push(input.source_detail);
	}
	if (input.campaign !== undefined) {
		updates.push('campaign = ?');
		values.push(input.campaign);
	}
	if (input.estimated_value !== undefined) {
		updates.push('estimated_value = ?');
		values.push(input.estimated_value);
	}
	if (input.actual_value !== undefined) {
		updates.push('actual_value = ?');
		values.push(input.actual_value);
	}
	if (input.service_interest !== undefined) {
		updates.push('service_interest = ?');
		values.push(input.service_interest);
	}
	if (input.notes !== undefined) {
		updates.push('notes = ?');
		values.push(input.notes);
	}
	if (input.discovery_call_at !== undefined) {
		updates.push('discovery_call_at = ?');
		values.push(input.discovery_call_at);
	}
	if (input.proposal_sent_at !== undefined) {
		updates.push('proposal_sent_at = ?');
		values.push(input.proposal_sent_at);
	}
	if (input.closed_at !== undefined) {
		updates.push('closed_at = ?');
		values.push(input.closed_at);
	}

	values.push(id);

	const query = `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`;

	try {
		const result = await db.prepare(query).bind(...values).run();

		if (result.meta.changes === 0) {
			throw error(404, 'Lead not found');
		}

		// Fetch and return updated lead
		const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
		return json(lead as unknown as Lead);
	} catch (err) {
		if (err instanceof Error && err.message === 'Lead not found') {
			throw err;
		}
		console.error('Lead update error:', err);
		throw error(500, 'Failed to update lead');
	}
};

export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	const { id } = params;

	try {
		const result = await db.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();

		if (result.meta.changes === 0) {
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
