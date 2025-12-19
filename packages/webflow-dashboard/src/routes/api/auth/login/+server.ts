import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, validateEmail } from '$lib/server/airtable';
import { checkRateLimit } from '$lib/server/kv';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/auth/login
 *
 * Initiates login by generating a verification token and storing it in Airtable.
 *
 * CRITICAL: Uses two-step Airtable update to trigger automation:
 * 1. Clear old token (set to null)
 * 2. Set new token (transition from null → value triggers Airtable automation)
 *
 * The Airtable automation sends the verification email - we don't send it here.
 */
export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	const clientIp = getClientAddress();

	// Rate limiting: 5 attempts per 15 minutes
	const rateLimitResult = await checkRateLimit(
		platform!.env.SESSIONS,
		`auth:login:${clientIp}`,
		5,
		900
	);

	if (!rateLimitResult.allowed) {
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
			return json({ error: 'Email not found' }, { status: 404 });
		}

		// Generate verification token
		const token = uuidv4();
		const expirationTime = new Date(Date.now() + 60 * 60000); // 60 minutes

		// CRITICAL: Two-step update triggers Airtable automation
		// Step 1: Clear old token
		// Step 2: Set new token
		// The transition from null → value triggers the email automation
		await airtable.setVerificationToken(user.id, token, expirationTime);

		// Return success - Airtable automation sends the email
		return json({ message: 'Verification email sent' });
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'An error occurred during the login process' }, { status: 500 });
	}
};
