/**
 * Motion Analysis API Endpoint
 *
 * POST /api/motion/analyze
 *
 * Performs complete motion analysis:
 * - Technical extraction via Puppeteer Worker (real page.hover())
 * - Phenomenological interpretation via Workers AI
 *
 * Embodies the hermeneutic circle: understanding Being through disclosure.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzeMotion } from '$lib/motion-analysis';
import type { TriggerConfig, TriggerType } from '$lib/motion-analysis';

interface AnalyzeRequest {
	url: string;
	trigger: {
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
		const body: AnalyzeRequest = await request.json();

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

		// Validate trigger
		const validTriggers: TriggerType[] = ['load', 'click', 'hover', 'scroll', 'focus'];
		const triggerType = body.trigger?.type || 'load';

		if (!validTriggers.includes(triggerType)) {
			return json(
				{
					success: false,
					error: `Invalid trigger type. Must be one of: ${validTriggers.join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Check platform bindings
		// Note: CF_ACCOUNT_ID and CF_API_TOKEN no longer needed - Puppeteer Worker handles auth
		if (!platform?.env?.AI) {
			return json(
				{
					success: false,
					error: 'Workers AI binding not available'
				},
				{ status: 500 }
			);
		}

		// Build trigger config
		const trigger: TriggerConfig = {
			type: triggerType,
			selector: body.trigger?.selector,
			scrollPosition: body.trigger?.scrollPosition,
			delay: body.trigger?.delay
		};

		// Perform analysis
		// Technical extraction happens via Puppeteer Worker
		// Phenomenological interpretation happens via Workers AI
		const result = await analyzeMotion(
			{
				AI: platform.env.AI,
				DB: platform.env.DB,
				STORAGE: platform.env.STORAGE,
				CACHE: platform.env.CACHE
			},
			{
				url: body.url,
				trigger,
				options: body.options
			}
		);

		return json({
			success: true,
			...result,
			metadata: {
				...result.metadata,
				requestDuration: Date.now() - startTime
			}
		});
	} catch (error) {
		console.error('Motion analysis error:', error);

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown analysis error',
				duration: Date.now() - startTime
			},
			{ status: 500 }
		);
	}
};
