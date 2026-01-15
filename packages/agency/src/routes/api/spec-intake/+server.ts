/**
 * Spec Intake API Endpoint
 *
 * POST /api/spec-intake
 *
 * Receives a user's natural language spec and returns:
 * - show_offering: matched offering (template, service, or product)
 * - clarify: follow-up questions
 * - consultation: route to booking
 *
 * This endpoint calls the WORKWAY conversational-intake-agent workflow
 * when configured, or falls back to keyword matching.
 *
 * Status: Using keyword fallback until WORKWAY API gateway is available.
 * Types are ready for integration.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	processSpecIntake,
	type SpecIntakeAPIRequest,
	type SpecIntakeAPIResponse,
	type MatchType,
} from '$lib/agents/spec-intake';

/**
 * Get the redirect URL based on offering type
 */
function getRedirectUrl(type: MatchType | undefined, slug: string): string {
	switch (type) {
		case 'service':
			return `/services/${slug}`;
		case 'product':
			return `/products/${slug}`;
		case 'template':
		default:
			return `/templates/${slug}`;
	}
}

/**
 * Format offering name for display
 */
function formatOfferingName(type: MatchType | undefined, slug: string): string {
	const name = slug.replace(/-/g, ' ');
	switch (type) {
		case 'service':
			return `${name} service`;
		case 'product':
			return name;
		case 'template':
		default:
			return `${name} template`;
	}
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = await request.json();
		const { spec } = body;

		if (!spec || typeof spec !== 'string') {
			throw error(400, 'Missing or invalid spec');
		}

		if (spec.length < 10) {
			throw error(400, 'Please provide more detail about what you need');
		}

		if (spec.length > 2000) {
			throw error(400, 'Spec is too long. Please keep it under 2000 characters.');
		}

		// Get WORKWAY credentials from environment (if available)
		const workwayApiKey = platform?.env?.WORKWAY_API_KEY;
		const workwayOrgId = platform?.env?.WORKWAY_ORG_ID;
		const workwayApiUrl = platform?.env?.WORKWAY_API_URL;

		// Process the spec
		const result = await processSpecIntake(spec, {
			useAI: !!workwayApiKey,
			workwayApiKey,
			workwayOrgId,
			workwayApiUrl,
		});

		// Normalize slug: snake_case → kebab-case
		const normalizeSlug = (slug: string | undefined) =>
			slug?.replace(/_/g, '-').toLowerCase();

		// Return appropriate response based on action
		switch (result.action) {
			case 'show_offering': {
				const slug = normalizeSlug(result.matched_offering || result.matched_template) || '';
				const type = result.offering_type || 'template';
				return json({
					action: 'show_offering',
					offering_type: type,
					offering: slug,
					offering_name: formatOfferingName(type, slug),
					reason: result.matched_reason,
					confidence: result.confidence,
					redirect: getRedirectUrl(type, slug),
					// Legacy support for 'show_template' consumers
					template: type === 'template' ? slug : undefined,
				});
			}

			// Legacy support
			case 'show_template' as string: {
				const templateSlug = normalizeSlug(result.matched_template) || '';
				return json({
					action: 'show_offering',
					offering_type: 'template',
					offering: templateSlug,
					offering_name: formatOfferingName('template', templateSlug),
					reason: result.matched_reason,
					confidence: result.confidence,
					redirect: `/templates/${templateSlug}`,
					template: templateSlug,
				});
			}

			case 'clarify':
				return json({
					action: 'clarify',
					questions: result.clarifying_questions,
					understanding: result.understanding,
					confidence: result.confidence,
				});

			case 'consultation':
				return json({
					action: 'consultation',
					reason: result.consultation_reason,
					understanding: result.understanding,
					confidence: result.confidence,
					redirect: '/book',
				});

			default:
				return json({
					action: 'consultation',
					reason: 'Unable to determine the best match. Let\'s discuss your needs.',
					redirect: '/book',
				});
		}
	} catch (err) {
		console.error('Spec intake error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, 'Failed to process your request. Please try again.');
	}
};

/**
 * GET /api/spec-intake
 *
 * Returns the LLM context for external consumption
 * (useful for debugging or external integrations)
 */
export const GET: RequestHandler = async () => {
	const { LLM_CONTEXT } = await import('$lib/agents/spec-intake');

	return new Response(LLM_CONTEXT, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
};
