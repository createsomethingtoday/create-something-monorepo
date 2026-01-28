/**
 * Replicate API utilities - DISABLED
 *
 * Replicate integration has been disabled to prevent runaway costs.
 * All functions throw errors to ensure no accidental API calls.
 *
 * Previous costs: $700+ from google/nano-banana-pro (4,339 images)
 * Disabled: 2026-01-25
 */

/**
 * Get Replicate client - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export function getClient(): never {
	throw new Error(
		'REPLICATE INTEGRATION DISABLED: ' +
			'Replicate API has been disabled due to runaway costs ($700+). ' +
			'Contact engineering before re-enabling.'
	);
}

/**
 * Convert buffer to data URI
 * This utility function is still available as it has no cost implications.
 */
export function bufferToDataUri(buffer: Buffer, mimeType = 'image/png'): string {
	return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Check if Replicate API is configured - ALWAYS returns false
 */
export function isConfigured(): boolean {
	// Always return false to prevent any Replicate usage
	return false;
}
