import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAirtableClient, validateToken } from '$lib/server/airtable';
import { setSession, generateSessionToken, checkRateLimit } from '$lib/server/kv';

/**
 * Server-side token verification.
 *
 * Handles the case where users click a verification link directly from email.
 * If token is valid, creates session and redirects to dashboard.
 * If invalid/expired, renders the error page.
 */
export const load: PageServerLoad = async ({ url, platform, cookies, getClientAddress }) => {
	const token = url.searchParams.get('token');

	// If no token, show the verify page (user may paste token manually)
	if (!token) {
		return {
			status: 'no-token' as const,
			error: null
		};
	}

	const clientIp = getClientAddress();

	// Rate limiting: 5 attempts per 15 minutes
	const rateLimitResult = await checkRateLimit(
		platform!.env.SESSIONS,
		`auth:verify:${clientIp}`,
		5,
		900
	);

	if (!rateLimitResult.allowed) {
		return {
			status: 'rate-limited' as const,
			error: 'Too many verification attempts. Please try again later.',
			retryAfter: rateLimitResult.retryAfter
		};
	}

	// Validate token format
	let validatedToken: string;
	try {
		validatedToken = validateToken(token);
	} catch {
		return {
			status: 'invalid' as const,
			error: 'Invalid token format'
		};
	}

	try {
		const airtable = getAirtableClient(platform?.env);

		// Verify token in Airtable
		const result = await airtable.verifyToken(validatedToken);

		if (!result) {
			return {
				status: 'not-found' as const,
				error: 'Token not found or already used'
			};
		}

		if (result.expired) {
			return {
				status: 'expired' as const,
				error: 'Token has expired. Please request a new verification email.'
			};
		}

		// Token is valid - create session
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

		// Clear the verification token in Airtable (one-time use)
		const user = await airtable.findUserByEmail(result.email);
		if (user) {
			await airtable.clearVerificationToken(user.id);
		}

		// Redirect to dashboard on success
		throw redirect(302, '/dashboard');
	} catch (err) {
		// Re-throw redirects
		if (err instanceof Response || (err && typeof err === 'object' && 'status' in err)) {
			throw err;
		}

		console.error('Token verification error:', err);
		return {
			status: 'error' as const,
			error: 'An error occurred during verification. Please try again.'
		};
	}
};
