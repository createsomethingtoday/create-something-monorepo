/**
 * Visual Utilities
 *
 * Shared helper functions for the visual design system.
 */

/**
 * Round to specified decimal places
 *
 * @param value - Number to round
 * @param decimals - Decimal places (default: 3)
 * @returns Rounded number
 */
export function round(value: number, decimals: number = 3): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}
