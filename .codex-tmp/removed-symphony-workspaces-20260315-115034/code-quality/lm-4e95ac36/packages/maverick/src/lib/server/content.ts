/**
 * Content fetching utility for page server loads.
 * Extracts shared KV fetch pattern from all +page.server.ts files.
 */

import type { ServerLoadEvent } from '@sveltejs/kit';

export async function fetchPageContent<T>(
	platform: ServerLoadEvent['platform'],
	pageName: string
): Promise<T | null> {
	if (!platform?.env?.CONTENT) {
		return null;
	}

	try {
		return await platform.env.CONTENT.get(`content:${pageName}`, { type: 'json' }) as T | null;
	} catch (error) {
		console.error(`Failed to fetch ${pageName} content from KV:`, error);
		return null;
	}
}
