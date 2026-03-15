/**
 * PM Agent API Endpoints
 *
 * Provides HTTP interface to the PM agent for:
 * - Triaging new submissions
 * - Processing specific contacts
 * - Reviewing drafts
 * - Approving/rejecting drafts
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	triageNewSubmissions,
	processContactSubmission,
	getDraft,
	getEscalation,
	approveDraft,
	triageGmailInbox,
	processGmailThread,
	triageAll
} from '$lib/agents/pm-agent';
import type { PMAgentEnv } from '$lib/agents/pm-agent/tools';
import type { PMAgentWithGmailEnv } from '$lib/agents/pm-agent/gmail-tools';

/**
 * POST /api/agent
 * Triage all new contact submissions
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const env = platform.env as unknown as PMAgentWithGmailEnv;

	interface AgentRequest {
		action?: string;
		contact_id?: number;
		approved?: boolean;
		thread_id?: string;
		gmail_query?: string;
	}

	const { action, contact_id, approved, thread_id, gmail_query } =
		(await request.json()) as AgentRequest;

	try {
		switch (action) {
			case 'triage': {
				// Triage all new submissions
				const result = await triageNewSubmissions(env);
				return json({
					success: true,
					action: 'triage',
					result
				});
			}

			case 'process': {
				// Process a specific contact submission
				if (!contact_id) {
					throw error(400, 'contact_id required for process action');
				}

				const result = await processContactSubmission(contact_id, env);
				return json({
					success: true,
					action: 'process',
					contact_id,
					result
				});
			}

			case 'get_draft': {
				// Get draft for human review
				if (!contact_id) {
					throw error(400, 'contact_id required for get_draft action');
				}

				const draft = await getDraft(contact_id, env);
				if (!draft) {
					throw error(404, 'Draft not found');
				}

				return json({
					success: true,
					action: 'get_draft',
					contact_id,
					draft
				});
			}

			case 'get_escalation': {
				// Get escalation details
				if (!contact_id) {
					throw error(400, 'contact_id required for get_escalation action');
				}

				const escalation = await getEscalation(contact_id, env);
				if (!escalation) {
					throw error(404, 'Escalation not found');
				}

				return json({
					success: true,
					action: 'get_escalation',
					contact_id,
					escalation
				});
			}

			case 'approve_draft': {
				// Approve or reject a draft
				if (!contact_id) {
					throw error(400, 'contact_id required for approve_draft action');
				}
				if (typeof approved !== 'boolean') {
					throw error(400, 'approved (boolean) required for approve_draft action');
				}

				const decision = await approveDraft(contact_id, approved, env);
				return json({
					success: true,
					action: 'approve_draft',
					contact_id,
					approved,
					decision
				});
			}

			// Gmail-specific actions
			case 'gmail_triage': {
				// Triage Gmail inbox for new client inquiries
				const query = gmail_query || 'is:unread in:inbox category:primary';
				const result = await triageGmailInbox(env, query);
				return json({
					success: true,
					action: 'gmail_triage',
					query,
					result
				});
			}

			case 'gmail_process_thread': {
				// Process a specific Gmail thread
				if (!thread_id) {
					throw error(400, 'thread_id required for gmail_process_thread action');
				}

				const result = await processGmailThread(thread_id, env);
				return json({
					success: true,
					action: 'gmail_process_thread',
					thread_id,
					result
				});
			}

			case 'triage_all': {
				// Triage both contact forms and Gmail
				const result = await triageAll(env);
				return json({
					success: true,
					action: 'triage_all',
					result
				});
			}

			default:
				throw error(400, `Unknown action: ${action}`);
		}
	} catch (err) {
		console.error('PM Agent API error:', err);
		throw error(500, err instanceof Error ? err.message : 'Agent processing failed');
	}
};

/**
 * GET /api/agent?contact_id=123
 * Get status of a specific contact (draft, escalation, or neither)
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	const env = platform.env as unknown as PMAgentEnv;
	const contactIdParam = url.searchParams.get('contact_id');

	if (!contactIdParam) {
		throw error(400, 'contact_id query parameter required');
	}

	const contactId = parseInt(contactIdParam, 10);
	if (isNaN(contactId)) {
		throw error(400, 'contact_id must be a number');
	}

	try {
		// Check for draft
		const draft = await getDraft(contactId, env);

		// Check for escalation
		const escalation = await getEscalation(contactId, env);

		// Get contact submission details
		const contact = await env.DB.prepare(
			`SELECT id, name, email, message, submitted_at, status, responded_at
       FROM contact_submissions
       WHERE id = ?`
		)
			.bind(contactId)
			.first();

		if (!contact) {
			throw error(404, 'Contact submission not found');
		}

		return json({
			success: true,
			contact_id: contactId,
			contact,
			has_draft: !!draft,
			draft,
			has_escalation: !!escalation,
			escalation
		});
	} catch (err) {
		console.error('PM Agent GET error:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to get contact status');
	}
};
