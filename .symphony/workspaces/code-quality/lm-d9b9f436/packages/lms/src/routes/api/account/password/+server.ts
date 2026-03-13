/**
 * Password Change API Route
 *
 * Proxies to Identity Worker for password updates.
 *
 * Canon: Security through simplicity.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface PasswordChangeRequest {
	current_password: string;
	new_password: string;
}

interface SuccessResponse {
	success: boolean;
	message: string;
}

interface ErrorResponse {
	error: string;
	message: string;
}

export const PATCH: RequestHandler = async ({ request, cookies }) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const body = (await request.json()) as PasswordChangeRequest;

	if (!body.current_password || !body.new_password) {
		throw error(400, 'Current password and new password required');
	}

	const response = await fetch(`${IDENTITY_WORKER}/v1/users/me/password`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify(body),
	});

	const data = (await response.json()) as SuccessResponse | ErrorResponse;

	if (!response.ok) {
		const errData = data as ErrorResponse;
		throw error(response.status, errData.message || 'Failed to change password');
	}

	// Clear cookies since all tokens are revoked after password change
	cookies.delete('cs_access_token', { path: '/' });
	cookies.delete('cs_refresh_token', { path: '/' });

	return json(data);
};
