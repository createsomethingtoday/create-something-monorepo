/**
 * Render Status API
 *
 * Checks the status of a Replicate prediction.
 * Used for polling render progress.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractOutputUrl } from '$lib/utils/render';

interface ReplicatePrediction {
	id: string;
	status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
	output?: unknown;
	error?: string;
	created_at?: string;
	started_at?: string;
	completed_at?: string;
	metrics?: Record<string, unknown>;
}

const REPLICATE_API = 'https://api.replicate.com/v1';

export const GET: RequestHandler = async ({ params, platform }) => {
	const { predictionId } = params;

	if (!predictionId) {
		return json({ error: 'Prediction ID is required' }, { status: 400 });
	}

	// Demo mode check
	if (predictionId.startsWith('demo-')) {
		return json({
			id: predictionId,
			status: 'succeeded',
			output: 'https://replicate.delivery/demo/architectural-render.png',
			message: 'Demo mode: simulated completion'
		});
	}

	// Get API token from environment (cast to access non-typed property)
	const env = platform?.env as Record<string, unknown> | undefined;
	const apiToken = env?.REPLICATE_API_TOKEN as string | undefined;

	if (!apiToken) {
		return json(
			{ error: 'Replicate API not configured' },
			{ status: 503 }
		);
	}

	try {
		const response = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				return json(
					{ error: 'Prediction not found' },
					{ status: 404 }
				);
			}

			const errorData = await response.json().catch(() => ({}));
			console.error('Replicate API error:', response.status, errorData);
			return json(
				{
					error: 'Failed to check prediction status',
					details: errorData
				},
				{ status: response.status }
			);
		}

		const prediction = (await response.json()) as ReplicatePrediction;

		// Extract output URL if completed
		let outputUrl: string | null = null;
		if (prediction.status === 'succeeded' && prediction.output) {
			outputUrl = extractOutputUrl(prediction.output);
		}

		return json({
			id: prediction.id,
			status: prediction.status,
			output: outputUrl,
			error: prediction.error,
			created_at: prediction.created_at,
			started_at: prediction.started_at,
			completed_at: prediction.completed_at,
			metrics: prediction.metrics
		});
	} catch (err) {
		console.error('Status check error:', err);
		return json(
			{
				error: 'Internal server error',
				message: err instanceof Error ? err.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

