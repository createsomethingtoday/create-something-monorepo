/**
 * ID Generation Utilities
 *
 * Helpers for generating unique identifiers.
 */

/**
 * Generate a prefixed random ID
 *
 * @param prefix - Prefix for the ID (e.g., 'conv', 'msg')
 * @returns Unique ID in format: prefix_randomstring
 */
export function generateId(prefix: string): string {
	return `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
}
