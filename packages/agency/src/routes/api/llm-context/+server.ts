/**
 * LLM Context API Endpoint
 *
 * GET /api/llm-context
 *
 * Returns the LLM context (llm.txt) for external consumption.
 * Used by WORKWAY conversational-intake-agent workflow to understand
 * CREATE SOMETHING's offerings and routing rules.
 */

import type { RequestHandler } from './$types';
import { LLM_CONTEXT } from '$lib/agents/spec-intake';

export const GET: RequestHandler = async () => {
	return new Response(LLM_CONTEXT, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
		},
	});
};
