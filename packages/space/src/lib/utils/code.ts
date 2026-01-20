/**
 * Code Processing Utilities
 *
 * Helpers for working with code strings.
 */

/**
 * Strip comments from JavaScript/TypeScript code
 *
 * Removes:
 * - Single-line comments (// ...)
 * - Multi-line comments (/* ... */)
 */
export function stripComments(code: string): string {
	// Remove single-line comments
	let cleaned = code.replace(/\/\/.*$/gm, '');
	// Remove multi-line comments
	cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
	return cleaned;
}
