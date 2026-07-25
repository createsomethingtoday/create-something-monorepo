import { json, type RequestHandler } from '@sveltejs/kit';
import { checkRateLimit } from '$lib/server/kv';

/**
 * Server-side proxy for submission status check
 *
 * Proxies requests to the external Check-Asset-Name API.
 * This avoids CORS issues since server-to-server calls don't have CORS restrictions.
 *
 * The external API is also used by Webflow forms, so we keep it centralized there.
 *
 * Requires a session, and always queries the session email — the response exposes
 * a creator's submission and publish counts, so an attacker-supplied email would
 * turn this into a creator-enumeration endpoint.
 *
 * POST /api/submission-status
 * Body: {} (the queried email is the session email)
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
	assetsSubmitted30?: number;
	hasError: boolean;
	userExists?: boolean;
	message?: string;
	publishedTemplates?: number;
	submittedTemplates?: number;
	isWhitelisted?: boolean;
}

const DEFAULT_EXTERNAL_API_URL = 'https://check-asset-name.vercel.app/api/checkTemplateuser';
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

export const POST: RequestHandler = async ({ locals, platform }) => {
	try {
		// The queried email is always the session email — never a body value.
		const email = locals.user?.email;

		if (!email) {
			return json(
				{
					hasError: true,
					message: 'Unauthorized',
					assetsSubmitted30: 0
				},
				{ status: 401 }
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

		// Bound the outbound calls this endpoint can make on one creator's behalf.
		const sessions = platform?.env?.SESSIONS;
		if (sessions) {
			const rateLimit = await checkRateLimit(
				sessions,
				`submission-status:${email.toLowerCase()}`,
				20,
				300,
				{ failOpen: true }
			);

			if (!rateLimit.allowed) {
				return json(
					{
						hasError: true,
						message: 'Too many submission status checks. Please try again shortly.',
						assetsSubmitted30: 0,
						retryAfter: rateLimit.retryAfter
					},
					{ status: 429 }
				);
			}
		}

		// Create abort controller for timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		try {
			const externalApiUrl = platform?.env.SUBMISSION_STATUS_API_URL || DEFAULT_EXTERNAL_API_URL;

			// Proxy request to external API (server-to-server, no CORS issues)
			const response = await fetch(externalApiUrl, {
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

			// The legacy service returns a successful HTTP response without a count
			// when a creator has no row in that service. This is an expected miss,
			// not a dashboard outage; the client can calculate from its Airtable assets.
			if (data.userExists === false && data.hasError && typeof data.assetsSubmitted30 !== 'number') {
				return json({
					assetsSubmitted30: 0,
					hasError: false,
					message: 'Submission availability is calculated from your dashboard assets.',
					useLocalCalculation: true,
					fallbackReason: 'legacy_user_not_found'
				});
			}

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
