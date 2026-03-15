/**
 * Root Layout Server Load - Fetches global content from KV at request time
 */

import type { LayoutServerLoad } from './$types';

export interface GlobalContent {
	footer?: {
		tagline?: string;
		address?: {
			line1?: string;
			line2?: string;
			line3?: string;
		};
	};
	contact?: {
		title?: string;
		description?: string;
		emails?: {
			label: string;
			address: string;
		}[];
	};
}

export const load: LayoutServerLoad = async ({ platform }) => {
	// In development without Cloudflare bindings, return null to use fallbacks
	if (!platform?.env?.CONTENT) {
		return { globalContent: null };
	}

	try {
		const globalContent = await platform.env.CONTENT.get('content:global', { type: 'json' }) as GlobalContent | null;
		return { globalContent };
	} catch (error) {
		console.error('Failed to fetch global content from KV:', error);
		return { globalContent: null };
	}
};
