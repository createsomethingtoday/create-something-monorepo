import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, validateEmail } from '$lib/server/airtable';
import { checkRateLimit } from '$lib/server/kv';
import { v4 as uuidv4 } from 'uuid';
import { hashString } from '$lib/utils/hash';

// Server-side analytics tracking for security paper trail
async function trackServerEvent(
	db: D1Database | undefined,
	eventName: string,
	properties: Record<string, unknown> = {}
) {
	if (!db) return;
	try {
		await db
			.prepare(
				`INSERT INTO analytics_events (event_name, user_hash, page_path, properties)
				 VALUES (?, ?, ?, ?)`
			)
			.bind(eventName, 'server', '/api/auth/login', JSON.stringify(properties))
			.run();
	} catch (error) {
		console.debug('Server analytics tracking failed:', error);
	}
}

/**
 * POST /api/auth/login
 *
 * Initiates login by:
 * 1. Generating a verification token
 * 2. Storing it in Airtable (triggers automation to send email)
 */
export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	const clientIp = getClientAddress();
	const db = platform?.env?.DB;
	const sessions = platform?.env?.SESSIONS;

	if (!sessions) {
		return json({ error: 'Authentication service unavailable' }, { status: 503 });
	}

	// Rate limiting: 5 attempts per 15 minutes
	const rateLimitResult = await checkRateLimit(
		sessions,
		`auth:login:${clientIp}`,
		5,
		900,
		{ failOpen: false }
	);

	if (!rateLimitResult.allowed) {
		// Track rate limit hit - security paper trail
		await trackServerEvent(db, 'auth_login_rate_limited', {
			retry_after_seconds: rateLimitResult.retryAfter
		});

		return json(
			{
				error: 'Too many login attempts. Please try again later.',
				retryAfter: rateLimitResult.retryAfter
			},
			{ status: 429 }
		);
	}

	// Parse request body
	let email: string;
	const contentType = request.headers.get('content-type');

	if (contentType?.includes('application/x-www-form-urlencoded')) {
		const formData = await request.formData();
		email = formData.get('email') as string;
	} else {
		const body = (await request.json()) as { email?: string };
		email = body.email || '';
	}

	if (!email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	// Validate email format
	let validatedEmail: string;
	try {
		validatedEmail = validateEmail(email);
	} catch {
		return json({ error: 'Invalid email format' }, { status: 400 });
	}

	try {
		const airtable = getAirtableClient(platform?.env);

		// Find user by email
		const user = await airtable.findUserByEmail(validatedEmail);

		if (!user) {
			// Track email not found - security paper trail
			const emailHash = await hashString(validatedEmail);
			await trackServerEvent(db, 'auth_login_email_not_found', {
				email_hash: emailHash,
				email_domain: validatedEmail.split('@')[1] || 'unknown'
			});

			// Prevent account enumeration by returning the same success message
			// used for known accounts.
			return json({
				message: 'If your email is registered, a verification email has been sent'
			});
		}

		// Generate verification token
		const token = uuidv4();
		const expirationTime = new Date(Date.now() + 60 * 60000); // 60 minutes

		// Store token in Airtable and trigger automation to send email
		// Uses two-step update: null → value transition triggers the Airtable automation
		await airtable.triggerVerificationEmailAutomation(user.id, token, expirationTime);

		// Track successful login initiation - security paper trail
		const emailHash = await hashString(validatedEmail);
		await trackServerEvent(db, 'auth_login_token_generated', {
			email_hash: emailHash,
			email_domain: validatedEmail.split('@')[1] || 'unknown'
		});

		return json({
			message: 'If your email is registered, a verification email has been sent'
		});
	} catch (error) {
		console.error('Login error:', error);

		// Track login error - security paper trail
		await trackServerEvent(db, 'auth_login_error', {
			error_message: error instanceof Error ? error.message : 'Unknown error'
		});

		return json({ error: 'An error occurred during the login process' }, { status: 500 });
	}
};
