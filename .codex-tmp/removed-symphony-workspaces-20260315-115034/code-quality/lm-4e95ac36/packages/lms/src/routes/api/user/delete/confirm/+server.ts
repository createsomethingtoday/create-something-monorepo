/**
 * User Deletion Confirmation API Route
 *
 * Triggers permanent deletion after grace period has passed.
 * This is an admin/system endpoint for completing GDPR deletion requests.
 *
 * POST /api/user/delete/confirm - Permanently delete user after grace period
 *
 * Canon: When the ending comes, let it be complete.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { anonymizeUserAnalytics } from '$lib/gdpr';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface ConfirmRequest {
	user_id: string;
	force?: boolean; // Skip grace period check (admin only)
}

interface SuccessResponse {
	success: boolean;
	message: string;
	user_id: string;
	deleted_at: string;
}

interface ErrorResponse {
	error: string;
	message: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	// This endpoint requires API key authentication (service-to-service)
	const apiKey = request.headers.get('X-API-Key');

	if (!apiKey) {
		throw error(401, 'API key required');
	}

	const body = (await request.json()) as ConfirmRequest;

	if (!body.user_id) {
		throw error(400, 'user_id required');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not available');
	}

	// Step 1: Anonymize all analytics events in LMS database
	await anonymizeUserAnalytics(db, body.user_id);

	// Step 2: Clear all magic link sessions in LMS
	await clearUserSessions(db, body.user_id);

	// Step 3: Call Identity Worker to hard delete user
	// The Identity Worker will verify grace period and handle user deletion
	const response = await fetch(`${IDENTITY_WORKER}/v1/users/${body.user_id}/hard-delete`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': apiKey,
		},
		body: JSON.stringify({ force: body.force }),
	});

	const data = (await response.json()) as SuccessResponse | ErrorResponse;

	if (!response.ok) {
		const errData = data as ErrorResponse;
		// If user not found, analytics are already anonymized - that's acceptable
		if (response.status === 404) {
			return json({
				success: true,
				message: 'User data anonymized. User record already deleted.',
				user_id: body.user_id,
				deleted_at: new Date().toISOString(),
			});
		}
		throw error(response.status, errData.message || 'Failed to delete user');
	}

	return json({
		success: true,
		message: 'User permanently deleted. All personal data has been removed.',
		user_id: body.user_id,
		deleted_at: new Date().toISOString(),
	});
};

/**
 * Clear all magic link sessions for this user
 * Note: The magic_link_sessions table uses email, not user_id
 * The Identity Worker handles token revocation
 */
async function clearUserSessions(db: D1Database, userId: string): Promise<void> {
	// Clear any session data that might reference this user by ID
	// Most session cleanup is handled by the Identity Worker
	try {
		// If there's a user_id column in magic_link_sessions (future-proofing)
		await db
			.prepare('DELETE FROM magic_link_sessions WHERE user_id = ?')
			.bind(userId)
			.run();
	} catch {
		// Column might not exist - that's ok, Identity Worker handles sessions
	}
}
