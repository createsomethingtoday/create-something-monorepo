/**
 * Magic Link Authentication - Poll
 *
 * POST /api/auth/magic-link/poll
 * Body: { sessionId: string }
 *
 * Polls for magic link verification status.
 * MCP client calls this repeatedly until verified or expired.
 * Canon: Polling recedes—the user waits, not the tool.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throw error(500, 'Database not available');
	}

	let body: { sessionId?: string };

	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { sessionId } = body;

	if (!sessionId) {
		throw error(400, 'Missing required field: sessionId');
	}

	const now = Math.floor(Date.now() / 1000);

	// Find the session
	const session = await db
		.prepare(
			`SELECT status, expires_at, access_token, refresh_token
       FROM magic_link_sessions
       WHERE session_id = ?`
		)
		.bind(sessionId)
		.first<{
			status: string;
			expires_at: number;
			access_token: string | null;
			refresh_token: string | null;
		}>();

	if (!session) {
		throw error(404, 'Session not found');
	}

	// Check if expired
	if (session.expires_at < now && session.status === 'pending') {
		// Mark as expired
		await db
			.prepare(
				`UPDATE magic_link_sessions SET status = 'expired'
         WHERE session_id = ? AND status = 'pending'`
			)
			.bind(sessionId)
			.run();

		return json({
			status: 'expired',
			message: 'Magic link expired. Please request a new one.'
		});
	}

	if (session.status === 'verified' && session.access_token && session.refresh_token) {
		// Clean up - delete the session after successful retrieval
		await db.prepare(`DELETE FROM magic_link_sessions WHERE session_id = ?`).bind(sessionId).run();

		return json({
			status: 'verified',
			message: 'Authentication successful',
			accessToken: session.access_token,
			refreshToken: session.refresh_token
		});
	}

	if (session.status === 'expired') {
		return json({
			status: 'expired',
			message: 'Magic link expired. Please request a new one.'
		});
	}

	// Still pending
	return json({
		status: 'pending',
		message: 'Waiting for email verification...',
		expiresIn: session.expires_at - now // seconds remaining
	});
};
