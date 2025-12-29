/**
 * Proposal Generation API
 *
 * POST /api/proposals - Generate a new proposal
 * GET /api/proposals/:id - Retrieve a proposal (TODO: D1 storage)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateProposal, proposalToMarkdown, type ProposalInput } from '$lib/proposals';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const input: ProposalInput = await request.json();

		// Validate required fields
		if (!input.prospect?.company || !input.prospect?.contact || !input.prospect?.email) {
			throw error(400, 'Missing required prospect information (company, contact, email)');
		}

		if (!input.problem?.summary) {
			throw error(400, 'Missing required problem summary');
		}

		if (!input.serviceId) {
			throw error(400, 'Missing required serviceId');
		}

		// Generate proposal
		const proposal = generateProposal(input);
		const markdown = proposalToMarkdown(proposal);

		return json({
			success: true,
			proposal,
			markdown,
			downloadUrl: `/api/proposals/${proposal.id}/download`
		});
	} catch (err) {
		if (err instanceof Error && err.message.includes('Service not found')) {
			throw error(400, err.message);
		}
		throw err;
	}
};

// Example request for documentation
export const GET: RequestHandler = async () => {
	return json({
		endpoint: 'POST /api/proposals',
		description: 'Generate a standardized proposal',
		example: {
			prospect: {
				company: 'Acme Corp',
				contact: 'John Smith',
				email: 'john@acme.com',
				role: 'CTO',
				website: 'https://acme.com'
			},
			problem: {
				summary:
					'Manual data entry consumes 20 hours/week of engineering time that should be spent on product development.',
				currentState: [
					'Engineers manually copy data between Salesforce and internal tools',
					'No audit trail for data changes',
					'Errors discovered days after they occur'
				],
				impact: [
					'$50k/year in engineering time on non-product work',
					'Customer data inconsistencies causing support issues',
					'Unable to scale without proportional headcount increase'
				],
				desiredState:
					'Automated data sync that runs reliably without human intervention, with full audit logging.'
			},
			serviceId: 'automation',
			customizations: ['Salesforce integration', 'Slack notifications for errors'],
			startDate: '2025-02-01'
		},
		availableServices: [
			'web-development',
			'automation',
			'agentic-systems',
			'partnership',
			'transformation',
			'advisory'
		]
	});
};
