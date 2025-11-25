/**
 * Admin API: Get pending agent reviews
 * Returns contacts with drafts or escalations needing human attention
 *
 * Note: Uses dynamic imports to avoid loading cloudflare:* modules during build.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { PMAgentEnv } from '$lib/agents/pm-agent/tools';

/**
 * Dynamically import the PM agent module
 */
async function getPMAgentModule() {
	return import('$lib/agents/pm-agent');
}

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const env = platform.env as unknown as PMAgentEnv;

	// Dynamically import agent module
	const pmAgent = await getPMAgentModule();

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
				const draft = await pmAgent.getDraft(contact.id, env);
				const escalation = await pmAgent.getEscalation(contact.id, env);

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
