/**
 * Motion Extraction API Endpoint
 *
 * POST /api/motion/extract
 *
 * Technical extraction only (no AI interpretation).
 * Useful for batch processing or when interpretation is done separately.
 *
 * SEIN ohne ALETHEIA: Being without disclosure.
 * The raw technical data of animation.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractMotion } from '$lib/motion-analysis';
import type { TriggerConfig, TriggerType } from '$lib/motion-analysis';

interface ExtractRequest {
	url: string;
	trigger?: {
		type: TriggerType;
		selector?: string;
		scrollPosition?: number;
		delay?: number;
	};
	options?: {
		timeout?: number;
		waitForAnimations?: boolean;
	};
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const startTime = Date.now();

	try {
		const body: ExtractRequest = await request.json();

		// Validate request
		if (!body.url) {
			return json(
				{
					success: false,
					error: 'Missing required field: url'
				},
				{ status: 400 }
			);
		}

		// Validate URL
		try {
			new URL(body.url);
		} catch {
			return json(
				{
					success: false,
					error: 'Invalid URL format'
				},
				{ status: 400 }
			);
		}

		// Check platform bindings
		if (!platform?.env?.CF_ACCOUNT_ID || !platform?.env?.CF_API_TOKEN) {
			return json(
				{
					success: false,
					error: 'Browser Rendering API credentials not configured (CF_ACCOUNT_ID, CF_API_TOKEN)'
				},
				{ status: 500 }
			);
		}

		// Build trigger config (default to 'load')
		const trigger: TriggerConfig = {
			type: body.trigger?.type || 'load',
			selector: body.trigger?.selector,
			scrollPosition: body.trigger?.scrollPosition,
			delay: body.trigger?.delay
		};

		// Perform extraction
		const technical = await extractMotion(
			{
				CF_ACCOUNT_ID: platform.env.CF_ACCOUNT_ID,
				CF_API_TOKEN: platform.env.CF_API_TOKEN
			},
			{
				url: body.url,
				trigger,
				options: body.options
			}
		);

		return json({
			success: true,
			technical,
			metadata: {
				url: body.url,
				extractedAt: new Date().toISOString(),
				duration: Date.now() - startTime
			}
		});
	} catch (error) {
		console.error('Motion extraction error:', error);

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown extraction error',
				duration: Date.now() - startTime
			},
			{ status: 500 }
		);
	}
};
