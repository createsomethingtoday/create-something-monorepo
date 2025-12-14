/**
 * Water Treatment Page Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';

export interface DmeContent {
	hero?: {
		title?: string;
		subtitle?: string;
		video?: string;
		cta?: string;
	};
	statistics?: {
		headline?: string;
		cta?: string;
	};
	metalsHeadline?: string;
	wasteHeadline?: string;
}

export const load: PageServerLoad = async ({ platform }) => {
	// In development without Cloudflare bindings, return null to use fallbacks
	if (!platform?.env?.CONTENT) {
		return { content: null };
	}

	try {
		const content = await platform.env.CONTENT.get('content:dme', { type: 'json' }) as DmeContent | null;
		return { content };
	} catch (error) {
		console.error('Failed to fetch dme content from KV:', error);
		return { content: null };
	}
};
