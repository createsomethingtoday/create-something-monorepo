/**
 * Magic Link Authentication - Initiate
 *
 * POST /api/auth/magic-link
 * Body: { email: string, sessionId: string }
 *
 * Initiates passwordless authentication for MCP server integration.
 * Canon: Authentication should recede into use.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { sendMagicLinkEmail, generateToken, hashToken } from '$lib/email/magic-link';
import { isValidEmail } from '@create-something/components/utils';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const RATE_LIMIT_WINDOW_HOURS = 1;
const RATE_LIMIT_MAX_REQUESTS = 3;

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;
	const resendApiKey = platform?.env?.RESEND_API_KEY;

	if (!db) {
		throw error(500, 'Database not available');
	}

	if (!resendApiKey) {
		throw error(500, 'Email service not configured');
	}

	let body: { email?: string; sessionId?: string };

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { email, sessionId } = body;

	if (!email || !sessionId) {
		throw error(400, 'Missing required fields: email, sessionId');
	}

	// Validate email format
	if (!isValidEmail(email)) {
		throw error(400, 'Invalid email format');
	}

	// Validate sessionId is UUID-like
	if (sessionId.length < 32) {
		throw error(400, 'Invalid sessionId format');
	}

	const normalizedEmail = email.toLowerCase().trim();

	// Check rate limiting
	const windowStart = Math.floor(Date.now() / 1000) - RATE_LIMIT_WINDOW_HOURS * 3600;

	const rateLimit = await db
		.prepare(
			`SELECT request_count, window_start FROM magic_link_rate_limits
       WHERE email = ? AND window_start > ?`
		)
		.bind(normalizedEmail, windowStart)
		.first<{ request_count: number; window_start: number }>();

	if (rateLimit && rateLimit.request_count >= RATE_LIMIT_MAX_REQUESTS) {
		throw error(429, 'Too many requests. Please try again later.');
	}

	// Generate token and hash it
	const token = generateToken();
	const tokenHash = await hashToken(token);
	const id = crypto.randomUUID();
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = now + MAGIC_LINK_EXPIRY_MINUTES * 60;

	// Check if session already exists
	const existingSession = await db
		.prepare('SELECT id FROM magic_link_sessions WHERE session_id = ?')
		.bind(sessionId)
		.first();

	if (existingSession) {
		// Update existing session
		await db
			.prepare(
				`UPDATE magic_link_sessions
         SET email = ?, token_hash = ?, status = 'pending',
             created_at = ?, expires_at = ?, verified_at = NULL,
             access_token = NULL, refresh_token = NULL
         WHERE session_id = ?`
			)
			.bind(normalizedEmail, tokenHash, now, expiresAt, sessionId)
			.run();
	} else {
		// Create new session
		await db
			.prepare(
				`INSERT INTO magic_link_sessions
         (id, email, session_id, token_hash, status, created_at, expires_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`
			)
			.bind(id, normalizedEmail, sessionId, tokenHash, now, expiresAt)
			.run();
	}

	// Update rate limiting
	if (rateLimit) {
		await db
			.prepare(
				`UPDATE magic_link_rate_limits
         SET request_count = request_count + 1, last_request = ?
         WHERE email = ?`
			)
			.bind(now, normalizedEmail)
			.run();
	} else {
		await db
			.prepare(
				`INSERT OR REPLACE INTO magic_link_rate_limits
         (email, request_count, window_start, last_request)
         VALUES (?, 1, ?, ?)`
			)
			.bind(normalizedEmail, now, now)
			.run();
	}

	// Build magic link URL
	const baseUrl = 'https://learn.createsomething.space';
	const magicLinkUrl = `${baseUrl}/auth/magic?token=${token}&session=${sessionId}`;

	// Send email
	const emailResult = await sendMagicLinkEmail(resendApiKey, normalizedEmail, magicLinkUrl);

	if (!emailResult.success) {
		console.error('Failed to send magic link email:', emailResult.error);
		throw error(500, 'Failed to send email. Please try again.');
	}

	return json({
		success: true,
		message: 'Magic link sent. Check your email.',
		expiresIn: MAGIC_LINK_EXPIRY_MINUTES * 60 // seconds
	});
};
