/**
 * Water Treatment Page Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';
import { fetchPageContent } from '$lib/server/content';

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
	const content = await fetchPageContent<DmeContent>(platform, 'dme');
	return { content };
};
