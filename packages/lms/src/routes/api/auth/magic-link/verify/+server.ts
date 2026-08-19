/**
 * Magic Link Authentication - Verify
 *
 * POST /api/auth/magic-link/verify
 * Body: { token: string, sessionId: string }
 *
 * Identity atomically consumes the LMS mailbox proof before issuing credentials.
 * Credentials stay in host-only HttpOnly cookies and are never returned to JS.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
const DEFAULT_IDENTITY_WORKER = 'https://id.createsomething.space';

export const POST: RequestHandler = async ({ request, cookies, fetch: runtimeFetch, platform }) => {

	let body: { token?: string; sessionId?: string };

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { token, sessionId } = body;

	if (!token || !sessionId) {
		throw error(400, 'Missing required fields: token, sessionId');
	}

	const exchangeToken = platform?.env?.LMS_MAGIC_EXCHANGE_TOKEN;
	if (!exchangeToken) throw error(500, 'Authentication service not configured');
	const identityWorker = platform?.env?.IDENTITY_WORKER_URL || DEFAULT_IDENTITY_WORKER;
	let response: Response;
	try {
		response = await runtimeFetch(`${identityWorker}/v1/auth/magic-exchange`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-LMS-Magic-Exchange-Token': exchangeToken },
			body: JSON.stringify({ token, session_id: sessionId }),
		});
	} catch (err) {
		console.error('Identity worker error:', err);
		throw error(502, 'Authentication service unavailable');
	}
	const result = await response.json().catch(() => null) as {
		access_token?: string; refresh_token?: string; expires_in?: number; user?: { id: string; email: string }; message?: string;
	} | null;
	if (!response.ok || !result?.access_token || !result.refresh_token || typeof result.expires_in !== 'number' || !result.user) {
		throw error(response.ok ? 502 : response.status, result?.message || 'Authentication failed');
	}
	const secure = platform?.env?.ENVIRONMENT !== 'development';
	const cookieOptions = { path: '/', httpOnly: true, secure, sameSite: 'lax' as const };
	cookies.set('cs_access_token', result.access_token, { ...cookieOptions, maxAge: result.expires_in });
	cookies.set('cs_refresh_token', result.refresh_token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 });

	return json({
		success: true,
		message: 'Authentication successful',
		user: result.user,
	});
};
