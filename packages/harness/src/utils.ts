/**
 * @create-something/harness
 *
 * Shared utilities for spec parsing.
 */

/**
 * Convert a string to a URL-safe slug.
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
