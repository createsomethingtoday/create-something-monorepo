/**
 * Magic Link Authentication - Verify
 *
 * POST /api/auth/magic-link/verify
 * Body: { token: string, sessionId: string }
 *
 * Verifies the magic link token and creates/authenticates the user.
 * Called when user clicks the email link.
 * Canon: One click, authenticated.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { hashToken } from '$lib/email/magic-link';

const IDENTITY_WORKER = 'https://id.createsomething.space';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throw error(500, 'Database not available');
	}

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

	// Hash the token to compare with stored hash
	const tokenHash = await hashToken(token);
	const now = Math.floor(Date.now() / 1000);

	// Find and validate the session
	const session = await db
		.prepare(
			`SELECT id, email, status, expires_at
       FROM magic_link_sessions
       WHERE session_id = ? AND token_hash = ?`
		)
		.bind(sessionId, tokenHash)
		.first<{
			id: string;
			email: string;
			status: string;
			expires_at: number;
		}>();

	if (!session) {
		throw error(400, 'Invalid or expired magic link');
	}

	if (session.status === 'verified') {
		throw error(400, 'Magic link already used');
	}

	if (session.status === 'expired' || session.expires_at < now) {
		// Mark as expired
		await db
			.prepare(`UPDATE magic_link_sessions SET status = 'expired' WHERE id = ?`)
			.bind(session.id)
			.run();
		throw error(400, 'Magic link expired');
	}

	// Authenticate with identity-worker
	// First, try to find user by email, or create new user
	let tokens: { accessToken: string; refreshToken: string };

	try {
		// Try login first (existing user)
		const loginResponse = await fetch(`${IDENTITY_WORKER}/v1/auth/magic-login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: session.email,
				source: 'lms'
			})
		});

		if (loginResponse.ok) {
			const loginData = (await loginResponse.json()) as {
				accessToken: string;
				refreshToken: string;
			};
			tokens = loginData;
		} else if (loginResponse.status === 404) {
			// User doesn't exist, create new account
			const signupResponse = await fetch(`${IDENTITY_WORKER}/v1/auth/magic-signup`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: session.email,
					source: 'lms'
				})
			});

			if (!signupResponse.ok) {
				const errData = (await signupResponse.json()) as { message?: string };
				throw new Error(errData.message || 'Failed to create account');
			}

			const signupData = (await signupResponse.json()) as {
				accessToken: string;
				refreshToken: string;
			};
			tokens = signupData;
		} else {
			const errData = (await loginResponse.json()) as { message?: string };
			throw new Error(errData.message || 'Authentication failed');
		}
	} catch (err) {
		console.error('Identity worker error:', err);
		throw error(500, 'Authentication service unavailable');
	}

	// Update session with tokens and mark as verified
	await db
		.prepare(
			`UPDATE magic_link_sessions
       SET status = 'verified', verified_at = ?,
           access_token = ?, refresh_token = ?
       WHERE id = ?`
		)
		.bind(now, tokens.accessToken, tokens.refreshToken, session.id)
		.run();

	return json({
		success: true,
		message: 'Authentication successful',
		accessToken: tokens.accessToken,
		refreshToken: tokens.refreshToken
	});
};
