/**
 * String manipulation utilities
 *
 * Centralized string helpers to avoid duplication across packages.
 */

/**
 * Convert a string to a URL-safe slug.
 *
 * @example
 * slugify('Hello World!') // 'hello-world'
 * slugify('My Article: Part 1') // 'my-article-part-1'
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Convert a string to camelCase.
 *
 * @example
 * camelCase('hello-world') // 'helloWorld'
 * camelCase('my_function_name') // 'myFunctionName'
 */
export function camelCase(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

/**
 * Convert a string to kebab-case.
 *
 * @example
 * kebabCase('HelloWorld') // 'hello-world'
 * kebabCase('myFunctionName') // 'my-function-name'
 */
export function kebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.toLowerCase()
		.replace(/^-|-$/g, '');
}

/**
 * Truncate a string to a maximum length with ellipsis.
 *
 * @example
 * truncate('Hello World', 8) // 'Hello...'
 */
export function truncate(str: string, length: number): string {
	if (str.length <= length) return str;
	return str.slice(0, length - 3) + '...';
}

/**
 * Escape XML/HTML special characters.
 *
 * @example
 * escapeXml('<div>') // '&lt;div&gt;'
 */
export function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Generate a unique ID with a prefix.
 *
 * Uses timestamp (base36) + random string for uniqueness.
 * Format: `{prefix}_{timestamp}_{random}`
 *
 * @example
 * generateId('prop') // 'prop_m5x7k2_a3b4'
 * generateId('thread', 4) // 'thread_m5x7k2_a3b4'
 * generateId('sp', 6) // 'sp_m5x7k2_a3b4c5'
 */
export function generateId(prefix: string, randomLength = 4): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 2 + randomLength);
	return `${prefix}_${timestamp}_${random}`;
}
