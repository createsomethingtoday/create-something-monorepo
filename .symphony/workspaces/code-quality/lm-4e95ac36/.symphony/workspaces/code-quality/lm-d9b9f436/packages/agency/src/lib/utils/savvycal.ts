/**
 * SavvyCal API Utilities
 *
 * Shared utilities for interacting with the SavvyCal booking API.
 * Canon: The tool recedes into use; booking just works.
 */

import { createLogger } from '@create-something/canon/utils';

const logger = createLogger('SavvyCal');

export const SAVVYCAL_API_BASE = 'https://api.savvycal.com/v1';
export const TARGET_LINK_SLUG = 'together';

export interface SavvyCalLink {
	id: string;
	slug: string;
	name: string;
}

// Cache the link ID to avoid repeated lookups
let cachedLinkId: string | null = null;

/**
 * Get the SavvyCal link ID for the target booking link.
 * Results are cached to avoid repeated API calls.
 */
export async function getLinkId(apiKey: string): Promise<string | null> {
	if (cachedLinkId) return cachedLinkId;

	const response = await fetch(`${SAVVYCAL_API_BASE}/links`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		logger.error('Failed to fetch SavvyCal links', { status: response.status });
		return null;
	}

	const data = (await response.json()) as { entries?: SavvyCalLink[] };
	const links = data.entries || [];
	const targetLink = links.find((link) => link.slug === TARGET_LINK_SLUG);

	if (targetLink) {
		cachedLinkId = targetLink.id;
		logger.debug('Found SavvyCal link', { linkId: cachedLinkId, slug: TARGET_LINK_SLUG });
		return cachedLinkId;
	}

	logger.error('SavvyCal link not found', { slug: TARGET_LINK_SLUG });
	return null;
}

/**
 * Clear the cached link ID (useful for testing or after config changes)
 */
export function clearLinkIdCache(): void {
	cachedLinkId = null;
}
