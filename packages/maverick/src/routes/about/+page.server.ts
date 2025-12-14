/**
 * About Page Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';

export interface AboutContent {
	hero?: {
		badge?: string;
		headline?: string;
		description?: string;
	};
	mission?: {
		heading?: string;
		body?: string;
	};
	approach?: {
		heading?: string;
		body?: string;
	};
	products?: {
		heading?: string;
		petrox?: {
			name?: string;
			tagline?: string;
			description?: string;
		};
		lithx?: {
			name?: string;
			tagline?: string;
			description?: string;
		};
		hydrox?: {
			name?: string;
			tagline?: string;
			description?: string;
		};
	};
	cta?: {
		heading?: string;
		description?: string;
		buttonLabel?: string;
	};
}

export const load: PageServerLoad = async ({ platform }) => {
	// In development without Cloudflare bindings, return null to use fallbacks
	if (!platform?.env?.CONTENT) {
		return { content: null };
	}

	try {
		const content = await platform.env.CONTENT.get('content:about', { type: 'json' }) as AboutContent | null;
		return { content };
	} catch (error) {
		console.error('Failed to fetch about content from KV:', error);
		return { content: null };
	}
};
