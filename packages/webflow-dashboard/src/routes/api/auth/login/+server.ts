import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, validateEmail } from '$lib/server/airtable';
import { checkRateLimit } from '$lib/server/kv';
import { sendVerificationEmail } from '$lib/server/email';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/auth/login
 *
 * Initiates login by:
 * 1. Generating a verification token
 * 2. Storing it in Airtable
 * 3. Sending a branded email via Resend
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

		// Store token in Airtable
		await airtable.setVerificationToken(user.id, token, expirationTime);

		// Send branded verification email via Resend
		const emailResult = await sendVerificationEmail(platform!.env.RESEND_API_KEY, {
			to: validatedEmail,
			token: token,
			expiresIn: '60 minutes'
		});

		if (!emailResult.success) {
			console.error('Failed to send verification email:', emailResult.error);
			// Don't fail the login - token is stored, user can request resend
			return json({ 
				message: 'Verification token generated. Check your email or request a new code.',
				warning: 'Email delivery may be delayed'
			});
		}

		return json({ message: 'Verification email sent' });
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'An error occurred during the login process' }, { status: 500 });
	}
};
