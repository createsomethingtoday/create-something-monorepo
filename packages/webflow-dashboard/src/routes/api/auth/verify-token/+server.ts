import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, validateToken } from '$lib/server/airtable';
import { setSession, generateSessionToken, checkRateLimit } from '$lib/server/kv';

/**
 * POST /api/auth/verify-token
 *
 * Verifies the email token and creates a session.
 */
export const POST: RequestHandler = async ({ request, platform, cookies, getClientAddress }) => {
	const clientIp = getClientAddress();

	// Rate limiting: 5 attempts per 15 minutes
	const rateLimitResult = await checkRateLimit(
		platform!.env.SESSIONS,
		`auth:verify:${clientIp}`,
		5,
		900
	);

	if (!rateLimitResult.allowed) {
		return json(
			{
				error: 'Too many verification attempts. Please try again later.',
				retryAfter: rateLimitResult.retryAfter
			},
			{ status: 429 }
		);
	}

	// Parse request body
	let token: string;
	const contentType = request.headers.get('content-type');

	if (contentType?.includes('application/x-www-form-urlencoded')) {
		const formData = await request.formData();
		token = formData.get('token') as string;
	} else {
		const body = (await request.json()) as { token?: string };
		token = body.token || '';
	}

	if (!token) {
		return json({ error: 'Token is required' }, { status: 400 });
	}

	// Validate token format
	let validatedToken: string;
	try {
		validatedToken = validateToken(token);
	} catch {
		return json({ error: 'Invalid token format' }, { status: 400 });
	}

	try {
		const airtable = getAirtableClient(platform?.env);

		// Verify token in Airtable
		const result = await airtable.verifyToken(validatedToken);

		if (!result) {
			return json({ error: 'Token not found or expired' }, { status: 404 });
		}

		if (result.expired) {
			return json({ error: 'Token has expired. Please request a new one.' }, { status: 401 });
		}

		// Generate session token
		const sessionToken = generateSessionToken();

		// Store session in KV (2-hour TTL)
		await setSession(platform!.env.SESSIONS, sessionToken, result.email);

		// Set HTTP-only cookie
		// Note: sameSite 'none' required for cross-origin Webflow integration
		cookies.set('session_token', sessionToken, {
			httpOnly: true,
			secure: true,
			path: '/',
			maxAge: 60 * 60 * 2, // 2 hours
			sameSite: 'none'
		});

		// Clear the verification token in Airtable
		const user = await airtable.findUserByEmail(result.email);
		if (user) {
			await airtable.clearVerificationToken(user.id);
		}

		return json({ message: 'Authentication successful' });
	} catch (error) {
		console.error('Token verification error:', error);
		return json({ error: 'An error occurred during verification' }, { status: 500 });
	}
};
