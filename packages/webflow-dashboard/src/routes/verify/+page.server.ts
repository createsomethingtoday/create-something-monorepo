import type { PageServerLoad } from './$types';
import { getAirtableClient, validateToken } from '$lib/server/airtable';
import { createSessionHandoff, setSession, generateSessionToken, checkRateLimit } from '$lib/server/kv';

/**
 * Server-side token verification.
 *
 * Handles the case where users click a verification link directly from email.
 * If token is valid, creates the session and renders a recoverable verify page
 * so Safari can recover from blocked third-party cookies.
 * If invalid/expired, renders the error page.
 */
export const load: PageServerLoad = async ({ url, platform, cookies, getClientAddress }) => {
	const token = url.searchParams.get('token');
	const handoff = url.searchParams.get('handoff');
	const sessions = platform?.env?.SESSIONS;

	// If no token, show the verify page (user may paste token manually) or
	// resume a Safari recovery flow when a handoff token is already present.
	if (!token) {
		if (handoff) {
			return {
				status: 'session-created' as const,
				error: null,
				handoffUrl: `/auth/complete?handoff=${encodeURIComponent(handoff)}`
			};
		}

		return {
			status: 'no-token' as const,
			error: null
		};
	}

	const clientIp = getClientAddress();

	if (!sessions) {
		return {
			status: 'error' as const,
			error: 'Authentication service unavailable. Please try again later.'
		};
	}

	// Rate limiting: 5 attempts per 15 minutes
	const rateLimitResult = await checkRateLimit(
		sessions,
		`auth:verify:${clientIp}`,
		5,
		900,
		{ failOpen: false }
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
		await setSession(sessions, sessionToken, result.email);
		const handoffToken = await createSessionHandoff(sessions, sessionToken, result.email);

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

		return {
			status: 'session-created' as const,
			error: null,
			handoffUrl: `/auth/complete?handoff=${encodeURIComponent(handoffToken)}`
		};
	} catch (err) {
		console.error('Token verification error:', err);
		return {
			status: 'error' as const,
			error: 'An error occurred during verification. Please try again.'
		};
	}
};
