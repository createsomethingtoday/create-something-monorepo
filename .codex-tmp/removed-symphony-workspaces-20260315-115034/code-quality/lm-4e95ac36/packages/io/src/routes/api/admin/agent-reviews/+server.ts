/**
 * Admin API: Get pending agent reviews
 * Returns contacts with drafts or escalations needing human attention
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDraft, getEscalation } from '$lib/agents/pm-agent';
import type { PMAgentEnv } from '$lib/agents/pm-agent/tools';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const env = platform.env as unknown as PMAgentEnv;

	try {
		// Get all contacts that are in_progress or escalated
		const result = await env.DB.prepare(
			`SELECT id, name, email, message, submitted_at, status, responded_at
       FROM contact_submissions
       WHERE status IN ('in_progress', 'escalated')
       ORDER BY submitted_at DESC`
		).all();

		const contacts = result.results || [];

		// For each contact, get draft or escalation details
		const contactsWithDetails = await Promise.all(
			contacts.map(async (contact: any) => {
				const draft = await getDraft(contact.id, env);
				const escalation = await getEscalation(contact.id, env);

				return {
					contact,
					draft,
					escalation
				};
			})
		);

		return json({
			success: true,
			contacts: contactsWithDetails,
			count: contactsWithDetails.length
		});
	} catch (err) {
		console.error('Error fetching pending reviews:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to fetch pending reviews');
	}
};
