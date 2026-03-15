/**
 * Homepage Server Load - Fetches content from KV at request time
 */

import type { PageServerLoad } from './$types';
import { fetchPageContent } from '$lib/server/content';

export interface HomeContent {
	hero?: {
		title?: string;
		subtitle?: string;
		cta?: string;
		videoSrc?: string;
	};
	introduction?: {
		headline?: string;
	};
	showcaseImages?: Array<{
		href: string;
		image: string;
		title: string;
		accentColor: 'petrox' | 'lithx' | 'dme';
	}>;
	explainer?: {
		headline?: string;
	};
	explainerPoints?: Array<{
		icon: 'target' | 'shield' | 'recycle';
		title: string;
		description: string;
	}>;
	solutions?: Array<{
		id: string;
		name: string;
		tagline: string;
		description: string;
		videoSrc?: string;
		imageSrc?: string;
		href: string;
		accentColor: 'petrox' | 'lithx' | 'dme';
	}>;
}

export const load: PageServerLoad = async ({ platform }) => {
	const content = await fetchPageContent<HomeContent>(platform, 'home');
	return { content };
};
