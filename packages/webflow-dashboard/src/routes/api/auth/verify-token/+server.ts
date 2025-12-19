import { json, error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, validateToken } from '$lib/server/airtable';
import { createSession, checkRateLimit, getClientIp, RATE_LIMIT_TIERS } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	const kv = platform?.env.SESSIONS;
	if (!kv) {
		throw error(500, 'Session storage not configured');
	}

	// Rate limiting
	const clientIp = getClientIp(request);
	const rateLimitResult = await checkRateLimit(kv, `auth:verify:${clientIp}`, RATE_LIMIT_TIERS.auth);

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
	let body: { token?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { token } = body;
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

		// Create session in KV
		const sessionToken = await createSession(kv, result.email);

		// Set secure cookie
		cookies.set('session_token', sessionToken, {
			httpOnly: true,
			secure: true,
			path: '/',
			maxAge: 7200, // 2 hours
			sameSite: 'lax'
		});

		// Clear verification token from Airtable
		// Note: We need the user ID to clear the token, so we'll find the user first
		const user = await airtable.findUserByEmail(result.email);
		if (user) {
			await airtable.clearVerificationToken(user.id);
		}

		return json({ message: 'Authentication successful' });
	} catch (err) {
		console.error('Token verification error:', err);
		return json(
			{ error: 'An error occurred during the verification process' },
			{ status: 500 }
		);
	}
};

// Also support GET for email link clicks
export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		throw redirect(303, '/login?error=missing_token');
	}

	const kv = platform?.env.SESSIONS;
	if (!kv) {
		throw redirect(303, '/login?error=server_error');
	}

	// Validate token format
	let validatedToken: string;
	try {
		validatedToken = validateToken(token);
	} catch {
		throw redirect(303, '/login?error=invalid_token');
	}

	try {
		const airtable = getAirtableClient(platform?.env);

		// Verify token in Airtable
		const result = await airtable.verifyToken(validatedToken);

		if (!result) {
			throw redirect(303, '/login?error=token_not_found');
		}

		if (result.expired) {
			throw redirect(303, '/login?error=token_expired');
		}

		// Create session in KV
		const sessionToken = await createSession(kv, result.email);

		// Set secure cookie
		cookies.set('session_token', sessionToken, {
			httpOnly: true,
			secure: true,
			path: '/',
			maxAge: 7200, // 2 hours
			sameSite: 'lax'
		});

		// Clear verification token from Airtable
		const user = await airtable.findUserByEmail(result.email);
		if (user) {
			await airtable.clearVerificationToken(user.id);
		}

		// Redirect to dashboard
		throw redirect(303, '/');
	} catch (err) {
		// Re-throw redirects
		if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
			throw err;
		}

		console.error('Token verification error:', err);
		throw redirect(303, '/login?error=verification_failed');
	}
};
