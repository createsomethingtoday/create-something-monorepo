/**
 * NBA Utility Functions
 *
 * Shared formatting and helper functions for NBA analytics.
 */

/**
 * Format Points Per Possession for display
 */
export function formatPPP(ppp: number): string {
	return ppp.toFixed(2);
}

/**
 * Format delta with + prefix for positive values
 */
export function formatDelta(delta: number): string {
	const formatted = delta.toFixed(1);
	return delta > 0 ? `+${formatted}` : formatted;
}
