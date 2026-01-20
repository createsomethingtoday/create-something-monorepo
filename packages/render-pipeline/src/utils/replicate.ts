/**
 * Shared Replicate API utilities
 *
 * Consolidates client initialization and common helpers used across
 * render-pipeline modules (cleanup, fine-tune, rendering).
 */

import Replicate from 'replicate';

let replicateClient: Replicate | null = null;

/**
 * Get or create Replicate client (singleton)
 */
export function getClient(): Replicate {
	if (!replicateClient) {
		const token = process.env.REPLICATE_API_TOKEN;
		if (!token) {
			throw new Error(
				'REPLICATE_API_TOKEN environment variable not set. ' +
					'Get your token at https://replicate.com/account/api-tokens'
			);
		}
		replicateClient = new Replicate({ auth: token });
	}
	return replicateClient;
}

/**
 * Convert buffer to data URI for Replicate API
 */
export function bufferToDataUri(buffer: Buffer, mimeType = 'image/png'): string {
	return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Check if Replicate API is configured
 */
export function isConfigured(): boolean {
	return !!process.env.REPLICATE_API_TOKEN;
}
