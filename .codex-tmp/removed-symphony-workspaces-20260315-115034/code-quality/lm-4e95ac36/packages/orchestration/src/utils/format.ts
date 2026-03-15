/**
 * Shared formatting utilities for orchestration
 */

/**
 * Format ISO date string for display.
 */
export function formatDate(isoString: string): string {
	const date = new Date(isoString);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}
