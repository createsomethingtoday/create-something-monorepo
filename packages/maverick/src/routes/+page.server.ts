/**
 * Homepage Server Load - Fetches content from KV at request time
 * This is the key improvement over Next.js: no prerendering, real-time CMS updates
 */

import type { PageServerLoad } from './$types';

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
	// In development without Cloudflare bindings, return null to use fallbacks
	if (!platform?.env?.CONTENT) {
		return { content: null };
	}

	try {
		const content = await platform.env.CONTENT.get('content:home', { type: 'json' }) as HomeContent | null;
		return { content };
	} catch (error) {
		console.error('Failed to fetch home content from KV:', error);
		return { content: null };
	}
};
