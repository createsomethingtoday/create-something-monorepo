import { json, type RequestHandler } from '@sveltejs/kit';

/**
 * Server-side proxy for submission status check
 * 
 * Proxies requests to the external Check-Asset-Name API.
 * This avoids CORS issues since server-to-server calls don't have CORS restrictions.
 * 
 * The external API is also used by Webflow forms, so we keep it centralized there.
 * 
 * POST /api/submission-status
 * Body: { email: string }
 * 
 * Returns:
 * {
 *   assetsSubmitted30: number,
 *   hasError: boolean,
 *   message?: string,
 *   publishedTemplates?: number,
 *   submittedTemplates?: number,
 *   isWhitelisted?: boolean
 * }
 */

interface ExternalApiResponse {
	assetsSubmitted30: number;
	hasError: boolean;
	message?: string;
	publishedTemplates?: number;
	submittedTemplates?: number;
	isWhitelisted?: boolean;
}

const EXTERNAL_API_URL = 'https://check-asset-name.vercel.app/api/checkTemplateuser';
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Parse request body
		const body = await request.json() as { email?: string };
		const { email } = body;

		// Validate email
		if (!email || typeof email !== 'string') {
			return json(
				{
					hasError: true,
					message: 'Email is required',
					assetsSubmitted30: 0
				},
				{ status: 400 }
			);
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return json(
				{
					hasError: true,
					message: 'Invalid email format',
					assetsSubmitted30: 0
				},
				{ status: 400 }
			);
		}

		// Create abort controller for timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		try {
			// Proxy request to external API (server-to-server, no CORS issues)
			const response = await fetch(EXTERNAL_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'Webflow-Dashboard/1.0'
				},
				body: JSON.stringify({ email }),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			// Handle non-OK responses
			if (!response.ok) {
				console.error(`[SubmissionStatus] External API returned ${response.status}`);
				return json(
					{
						hasError: true,
						message: `External API error: ${response.status}`,
						assetsSubmitted30: 0
					},
					{ status: response.status }
				);
			}

			// Parse and return response
			const data: ExternalApiResponse = await response.json();

			// Validate response structure
			if (typeof data.assetsSubmitted30 !== 'number') {
				console.error('[SubmissionStatus] Invalid response from external API:', data);
				return json(
					{
						hasError: true,
						message: 'Invalid response from external API',
						assetsSubmitted30: 0
					},
					{ status: 502 }
				);
			}

			return json(data);

		} catch (fetchError) {
			clearTimeout(timeoutId);

			// Handle timeout
			if (fetchError instanceof Error && fetchError.name === 'AbortError') {
				console.error('[SubmissionStatus] Request timeout after 10s');
				return json(
					{
						hasError: true,
						message: 'Request timeout',
						assetsSubmitted30: 0
					},
					{ status: 504 }
				);
			}

			// Handle other fetch errors
			console.error('[SubmissionStatus] Fetch error:', fetchError);
			return json(
				{
					hasError: true,
					message: 'Failed to connect to external API',
					assetsSubmitted30: 0
				},
				{ status: 502 }
			);
		}

	} catch (error) {
		// Handle JSON parse errors or other unexpected errors
		console.error('[SubmissionStatus] Unexpected error:', error);
		return json(
			{
				hasError: true,
				message: 'Internal server error',
				assetsSubmitted30: 0
			},
			{ status: 500 }
		);
	}
};

