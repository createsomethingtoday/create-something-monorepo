/**
 * PetroX Page Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';
import { fetchPageContent } from '$lib/server/content';

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
	const content = await fetchPageContent<PetroxContent>(platform, 'petrox');
	return { content };
};
