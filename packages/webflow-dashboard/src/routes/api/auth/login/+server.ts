import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient, validateEmail, escapeAirtableString } from '$lib/server/airtable';
import { checkRateLimit, getClientIp, RATE_LIMIT_TIERS } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, platform }) => {
	// CORS headers for cross-origin requests
	const allowedOrigins = [
		'https://template-marketplace.webflow.io',
		'https://templates.webflow.com',
		'https://webflow.com'
	];

	const origin = request.headers.get('origin');
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (origin && allowedOrigins.includes(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
		headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
		headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
		headers['Access-Control-Allow-Credentials'] = 'true';
	}

	// Rate limiting
	const kv = platform?.env.SESSIONS;
	if (!kv) {
		throw error(500, 'Session storage not configured');
	}

	const clientIp = getClientIp(request);
	const rateLimitResult = await checkRateLimit(kv, `auth:login:${clientIp}`, RATE_LIMIT_TIERS.auth);

	if (!rateLimitResult.allowed) {
		return json(
			{
				error: 'Too many login attempts. Please try again later.',
				retryAfter: rateLimitResult.retryAfter
			},
			{ status: 429, headers }
		);
	}

	// Parse request body
	let body: { email?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400, headers });
	}

	const { email } = body;
	if (!email) {
		return json({ error: 'Email is required' }, { status: 400, headers });
	}

	// Validate email format
	let validatedEmail: string;
	try {
		validatedEmail = validateEmail(email);
	} catch {
		return json({ error: 'Invalid email format' }, { status: 400, headers });
	}

	try {
		const airtable = getAirtableClient(platform?.env);

		// Find user in Airtable
		const user = await airtable.findUserByEmail(validatedEmail);

		if (!user) {
			return json({ error: 'Email not found' }, { status: 404, headers });
		}

		// Generate verification token
		const token = crypto.randomUUID();
		const expirationTime = new Date(Date.now() + 60 * 60000); // 60 minutes

		// Store token in Airtable (Airtable automation sends the email)
		await airtable.setVerificationToken(user.id, token, expirationTime);

		return json({ message: 'Verification email sent' }, { headers });
	} catch (err) {
		console.error('Login error:', err);
		return json(
			{ error: 'An error occurred during the login process' },
			{ status: 500, headers }
		);
	}
};

// Handle CORS preflight
export const OPTIONS: RequestHandler = async ({ request }) => {
	const origin = request.headers.get('origin');
	const allowedOrigins = [
		'https://template-marketplace.webflow.io',
		'https://templates.webflow.com',
		'https://webflow.com'
	];

	const headers: Record<string, string> = {};

	if (origin && allowedOrigins.includes(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
		headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
		headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
		headers['Access-Control-Allow-Credentials'] = 'true';
	}

	return new Response(null, { status: 204, headers });
};
