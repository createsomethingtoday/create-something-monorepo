/**
 * Render Status API - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * This endpoint now returns 503 Service Unavailable.
 *
 * Previous cost incident: google/nano-banana-pro generated 4,339 images at $0.15/image = $650.85
 * Disabled: 2026-01-25
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json(
		{
			error: 'Service Disabled',
			message:
				'Replicate render API has been disabled due to cost control. ' +
				'Previous incident: $700+ from runaway image generation. ' +
				'Contact engineering to re-enable.',
			disabled: true,
			disabled_at: '2026-01-25'
		},
		{ status: 503 }
	);
};

