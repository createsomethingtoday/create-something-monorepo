/**
 * PetroX Page Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';

export interface PetroxContent {
	hero?: {
		title?: string;
		subtitle?: string;
		video?: string;
		cta?: string;
	};
	why?: {
		title?: string;
		subtitle?: string;
	};
	whyFeatures?: {
		icon: string;
		title: string;
	}[];
	solutionsHeader?: {
		headline?: string;
	};
	operationsHeader?: {
		headline?: string;
	};
}

export const load: PageServerLoad = async ({ platform }) => {
	// In development without Cloudflare bindings, return null to use fallbacks
	if (!platform?.env?.CONTENT) {
		return { content: null };
	}

	try {
		const content = await platform.env.CONTENT.get('content:petrox', { type: 'json' }) as PetroxContent | null;
		return { content };
	} catch (error) {
		console.error('Failed to fetch petrox content from KV:', error);
		return { content: null };
	}
};
