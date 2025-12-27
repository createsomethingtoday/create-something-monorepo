/**
 * Render Submit API
 *
 * Submits architectural render requests to Replicate.
 * Uses Replicate HTTP API directly (edge-compatible, no Node.js SDK).
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface RenderRequest {
	image: string; // Base64 data URL
	prompt: string;
	presets: {
		material: string;
		lighting: string;
		angle: string;
	};
}

interface ReplicatePrediction {
	id: string;
	status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
	output?: unknown;
	error?: string;
}

const REPLICATE_API = 'https://api.replicate.com/v1';
const MODEL_OWNER = 'black-forest-labs';
const MODEL_NAME = 'flux-canny-pro';

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = (await request.json()) as RenderRequest;
		const { image, prompt, presets } = body;

		// Validate inputs
		if (!image) {
			return json({ error: 'Image is required' }, { status: 400 });
		}

		if (!prompt) {
			return json({ error: 'Prompt is required' }, { status: 400 });
		}

		// Get API token from environment (cast to access non-typed property)
		const env = platform?.env as Record<string, unknown> | undefined;
		const apiToken = env?.REPLICATE_API_TOKEN as string | undefined;

		if (!apiToken) {
			// Demo mode: return the conditioning image as a "simulated render"
			// This demonstrates the flow even without Replicate API configured
			console.warn('REPLICATE_API_TOKEN not configured - returning demo response');
			return json({
				success: true,
				status: 'succeeded',
				output: image, // Return the conditioning image as the "rendered" result
				message: 'Demo mode: Replicate API not configured. Showing conditioning image as placeholder.',
				demo: true,
				presets
			});
		}

		// Create prediction via Replicate HTTP API (models endpoint)
		// Don't use Prefer: wait - it causes long hangs. Use polling instead.
		const response = await fetch(
			`${REPLICATE_API}/models/${MODEL_OWNER}/${MODEL_NAME}/predictions`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					input: {
						control_image: image,
						prompt: prompt,
						steps: 25,
						guidance: 30,
						output_format: 'png'
					}
				})
			}
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('Replicate API error:', response.status, errorData);
			return json(
				{
					error: 'Failed to submit render',
					details: errorData
				},
				{ status: response.status }
			);
		}

		const prediction = (await response.json()) as ReplicatePrediction;

		// If prediction completed immediately (via Prefer: wait)
		if (prediction.status === 'succeeded') {
			const outputUrl = extractOutputUrl(prediction.output);
			return json({
				success: true,
				predictionId: prediction.id,
				status: 'succeeded',
				output: outputUrl
			});
		}

		// Return prediction ID for polling
		return json({
			success: true,
			predictionId: prediction.id,
			status: prediction.status
		});
	} catch (err) {
		console.error('Render submit error:', err);
		return json(
			{
				error: 'Internal server error',
				message: err instanceof Error ? err.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * Extract URL from various output formats
 */
function extractOutputUrl(output: unknown): string | null {
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
