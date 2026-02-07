/**
 * LithX Page Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';
import { fetchPageContent } from '$lib/server/content';

export interface LithxContent {
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
	methodsHeader?: {
		headline?: string;
	};
}

export const load: PageServerLoad = async ({ platform }) => {
	const content = await fetchPageContent<LithxContent>(platform, 'lithx');
	return { content };
};
