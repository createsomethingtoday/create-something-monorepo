/**
 * Render API Utilities
 *
 * Shared helpers for working with render prediction outputs.
 */

/**
 * Extract URL from various output formats returned by render APIs.
 *
 * Handles:
 * - Array of URLs (returns first)
 * - Direct string URL
 * - Object with `url` or `output` property
 *
 * @param output - Raw output from render prediction
 * @returns Extracted URL or null if not found
 */
export function extractOutputUrl(output: unknown): string | null {
	if (!output) return null;

	if (Array.isArray(output)) {
		return output[0] as string;
	}

	if (typeof output === 'string') {
		return output;
	}

	if (typeof output === 'object' && output !== null) {
		const obj = output as Record<string, unknown>;
		if (typeof obj.url === 'string') return obj.url;
		if (typeof obj.output === 'string') return obj.output;
	}

	return null;
}
