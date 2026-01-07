/**
 * Submission API Route Implementation
 *
 * SvelteKit server route that proxies requests to the external submission
 * tracking API, handling CORS and error cases.
 *
 * This file is a reference implementation. Copy to your SvelteKit app's
 * src/routes/api/submissions/status/+server.ts
 */

import type {
	ExternalApiResponse,
	SubmissionStatusRequest,
	SubmissionStatusResponse
} from './submission-types';

// ==================== CONFIGURATION ====================

/**
 * External API endpoint
 */
const EXTERNAL_API_URL = 'https://check-asset-name.vercel.app/api/checkTemplateuser';

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT_MS = 10000;

// ==================== VALIDATION ====================

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Parse and validate request body
 */
async function parseRequestBody(request: Request): Promise<SubmissionStatusRequest> {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		throw new Error('Invalid JSON body');
	}

	if (!body || typeof body !== 'object') {
		throw new Error('Request body must be an object');
	}

	const { email } = body as Record<string, unknown>;

	if (!email || typeof email !== 'string') {
		throw new Error('Email is required');
	}

	if (!isValidEmail(email)) {
		throw new Error('Invalid email format');
	}

	return { email: email.toLowerCase().trim() };
}

// ==================== EXTERNAL API CLIENT ====================

/**
 * Call external API with timeout
 */
async function callExternalApi(email: string): Promise<ExternalApiResponse> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(EXTERNAL_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email }),
			signal: controller.signal
		});

		if (!response.ok) {
			throw new Error(`External API returned ${response.status}`);
		}

		const data = await response.json();

		// Validate response shape
		if (typeof data.assetsSubmitted30 !== 'number') {
			throw new Error('Invalid response from external API');
		}

		return data as ExternalApiResponse;
	} finally {
		clearTimeout(timeoutId);
	}
}

// ==================== REQUEST HANDLER ====================

/**
 * POST /api/submissions/status
 *
 * Proxy endpoint for external submission tracking API.
 * Handles CORS by making server-to-server request.
 *
 * @example
 * ```typescript
 * // In SvelteKit +server.ts
 * import type { RequestHandler } from './$types';
 * import { handleSubmissionStatus } from '@webflow-automation/shared/submission-api';
 *
 * export const POST: RequestHandler = handleSubmissionStatus;
 * ```
 */
export async function handleSubmissionStatus(
	request: Request
): Promise<Response> {
	// Parse and validate request
	let requestBody: SubmissionStatusRequest;

	try {
		requestBody = await parseRequestBody(request);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid request';
		return createErrorResponse(message, 400);
	}

	// Call external API
	try {
		const data = await callExternalApi(requestBody.email);

		const response: SubmissionStatusResponse = {
			success: true,
			data
		};

		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('[SubmissionAPI] External API failed:', error);

		const message =
			error instanceof Error && error.name === 'AbortError'
				? 'External API timeout'
				: 'External API unavailable';

		return createErrorResponse(message, 502);
	}
}

/**
 * Create error response
 */
function createErrorResponse(message: string, status: number): Response {
	const response: SubmissionStatusResponse = {
		success: false,
		error: message
	};

	return new Response(JSON.stringify(response), {
		status,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}

// ==================== SVELTEKIT INTEGRATION ====================

/**
 * SvelteKit RequestHandler for +server.ts
 *
 * Copy this to: src/routes/api/submissions/status/+server.ts
 *
 * ```typescript
 * import type { RequestHandler } from './$types';
 * import { json } from '@sveltejs/kit';
 *
 * const EXTERNAL_API_URL = 'https://check-asset-name.vercel.app/api/checkTemplateuser';
 *
 * export const POST: RequestHandler = async ({ request }) => {
 *   const { email } = await request.json();
 *
 *   if (!email || typeof email !== 'string') {
 *     return json({ success: false, error: 'Email is required' }, { status: 400 });
 *   }
 *
 *   try {
 *     const response = await fetch(EXTERNAL_API_URL, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ email })
 *     });
 *
 *     if (!response.ok) {
 *       throw new Error(`External API error: ${response.status}`);
 *     }
 *
 *     const data = await response.json();
 *     return json({ success: true, data });
 *   } catch (error) {
 *     console.error('[SubmissionAPI] External API failed:', error);
 *     return json({ success: false, error: 'External API unavailable' }, { status: 502 });
 *   }
 * };
 * ```
 */

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
	// SvelteKit: check import.meta.env
	// @ts-expect-error - import.meta.env may not be defined
	if (typeof import.meta !== 'undefined' && import.meta.env) {
		// @ts-expect-error - DEV may not exist
		return import.meta.env.DEV === true;
	}

	// Node.js fallback
	if (typeof process !== 'undefined' && process.env) {
		return process.env.NODE_ENV === 'development';
	}

	return false;
}

/**
 * Check if hostname indicates development
 */
export function isDevelopmentHost(hostname: string): boolean {
	return hostname === 'localhost' || hostname === '127.0.0.1';
}
