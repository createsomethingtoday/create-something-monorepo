/**
 * Learning Event Tracking for .ltd
 *
 * Tracks canon review and principle adoption events.
 *
 * Canon: The infrastructure disappears; only the understanding remains.
 */

import { browser } from '$app/environment';
import { ltd as ltdTracking } from '@create-something/canon/utils';

const TRACKING_KEY_PREFIX = 'ltd_tracked_';

/**
 * Track when a pattern/principle is reviewed (viewed)
 * Only tracks once per pattern to avoid noise.
 */
export function trackCanonReview(principleId: string): void {
	if (!browser) return;

	const trackingKey = `${TRACKING_KEY_PREFIX}${principleId}`;
	const hasTracked = localStorage.getItem(trackingKey);

	if (!hasTracked) {
		ltdTracking.canonReviewed(principleId);
		localStorage.setItem(trackingKey, 'true');
	}
}

/**
 * Track when a user explicitly adopts a principle
 * This would be called from an "Adopt this principle" button.
 */
export function trackPrincipleAdoption(principleId: string, context?: string): void {
	if (!browser) return;

	ltdTracking.principleAdopted(principleId, context);
}
