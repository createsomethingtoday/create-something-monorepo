/**
 * News Page Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';

export interface NewsArticle {
	id: string;
	date: string;
	title: string;
	excerpt: string;
	image: string;
	slug: string;
	featured: boolean;
	category: string;
}

export interface NewsContent {
	title?: string;
	articles?: NewsArticle[];
}

export const load: PageServerLoad = async ({ platform }) => {
	// In development without Cloudflare bindings, return null to use fallbacks
	if (!platform?.env?.CONTENT) {
		return { content: null };
	}

	try {
		const content = await platform.env.CONTENT.get('content:news', { type: 'json' }) as NewsContent | null;
		return { content };
	} catch (error) {
		console.error('Failed to fetch news content from KV:', error);
		return { content: null };
	}
};
