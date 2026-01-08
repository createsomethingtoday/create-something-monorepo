/**
 * AI Branding Patterns Experiment - Server Load
 *
 * Explores whether Cloudflare AI can generate Canon-compliant patterns
 * that add approachability without decoration.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		metadata: {
			title: 'AI-Generated Branding Patterns',
			description: 'Testing whether Cloudflare AI can generate Canon-compliant patterns for property differentiation',
			hypothesis: 'AI-generated patterns can add approachability without violating Canon minimalism',
			dateStarted: '2026-01-08',
			status: 'active'
		}
	};
};
