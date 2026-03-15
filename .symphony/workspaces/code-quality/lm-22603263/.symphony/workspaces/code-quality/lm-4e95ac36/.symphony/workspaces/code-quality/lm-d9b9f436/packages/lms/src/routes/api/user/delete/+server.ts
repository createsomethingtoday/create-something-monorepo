/**
 * User Deletion API Route
 *
 * Initiates soft delete of user account with 30-day grace period.
 * Proxies to Identity Worker for account deletion.
 *
 * DELETE /api/user/delete - Soft delete user account
 *
 * Canon: Endings must be as intentional as beginnings.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { anonymizeUserAnalytics } from '$lib/gdpr';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface DeleteRequest {
	password: string;
}

interface SuccessResponse {
	success: boolean;
	message: string;
	grace_period_days: number;
}

interface ErrorResponse {
	error: string;
	message: string;
}

export const DELETE: RequestHandler = async ({ request, cookies, platform }) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const body = (await request.json()) as DeleteRequest;

	if (!body.password) {
		throw error(400, 'Password required');
	}

	// Call Identity Worker to soft delete user
	const response = await fetch(`${IDENTITY_WORKER}/v1/users/me`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify(body),
	});

	const data = (await response.json()) as SuccessResponse | ErrorResponse;

	if (!response.ok) {
		const errData = data as ErrorResponse;
		throw error(response.status, errData.message || 'Failed to delete account');
	}

	// Anonymize analytics events for this user
	// Get user ID from token payload (JWT sub claim)
	try {
		const tokenPayload = parseJWT(accessToken);
		if (tokenPayload?.sub && platform?.env?.DB) {
			await anonymizeUserAnalytics(platform.env.DB, tokenPayload.sub);
		}
	} catch (e) {
		// Log but don't fail the deletion if analytics anonymization fails
		console.error('Failed to anonymize analytics:', e);
	}

	// Clear authentication cookies
	cookies.delete('cs_access_token', { path: '/' });
	cookies.delete('cs_refresh_token', { path: '/' });

	return json({
		success: true,
		message: 'Account scheduled for deletion. You have 30 days to restore it by logging in.',
		grace_period_days: 30,
	});
};

// JWT parsing moved to shared utility
import { parseJWT } from '$lib/auth/jwt';

