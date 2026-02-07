/**
 * News Page Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';
import { fetchPageContent } from '$lib/server/content';

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
	const content = await fetchPageContent<NewsContent>(platform, 'news');
	return { content };
};
