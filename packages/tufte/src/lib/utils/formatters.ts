/**
 * Number Formatting Utilities
 *
 * Agentic formatters that apply Tufte's principles:
 * - Use tabular (monospace-aligned) numbers
 * - Remove unnecessary precision
 * - Format for human readability
 */

/**
 * Format number with thousands separators
 *
 * @param num - Number to format
 * @returns Formatted string (e.g., 1234 → "1,234")
 */
export function formatNumber(num: number): string {
	return new Intl.NumberFormat().format(num);
}

/**
 * Calculate percentage (rounded to whole number)
 *
 * @param value - Numerator
 * @param total - Denominator
 * @returns Percentage as integer (0-100)
 */
export function getPercentage(value: number, total: number): number {
	return total > 0 ? Math.round((value / total) * 100) : 0;
}

/**
 * Format number in compact notation (1.2K, 3.4M, etc.)
 *
 * @param num - Number to format
 * @returns Compact string (e.g., 1234 → "1.2K")
 */
export function formatCompact(num: number): string {
	return new Intl.NumberFormat('en-US', {
		notation: 'compact',
		compactDisplay: 'short',
		maximumFractionDigits: 1
	}).format(num);
}

/**
 * Format date for display
 *
 * @param date - Date string or Date object
 * @param format - Format type ('short' | 'long' | 'weekday')
 * @returns Formatted date string
 */
export function formatDate(
	date: string | Date,
	format: 'short' | 'long' | 'weekday' = 'short'
): string {
	const d = typeof date === 'string' ? new Date(date) : date;

	switch (format) {
		case 'weekday':
			return d.toLocaleDateString('en-US', { weekday: 'short' });
		case 'long':
			return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		default:
			return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
}
