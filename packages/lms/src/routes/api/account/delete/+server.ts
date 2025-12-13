/**
 * Account Deletion API Route
 *
 * Proxies to Identity Worker for account deletion.
 *
 * Canon: Endings must be as intentional as beginnings.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface DeleteRequest {
	password: string;
}

interface SuccessResponse {
	success: boolean;
	message: string;
}

interface ErrorResponse {
	error: string;
	message: string;
}

export const DELETE: RequestHandler = async ({ request, cookies }) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const body = (await request.json()) as DeleteRequest;

	if (!body.password) {
		throw error(400, 'Password required');
	}

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

	// Clear cookies since the account is deleted
	cookies.delete('cs_access_token', { path: '/' });
	cookies.delete('cs_refresh_token', { path: '/' });

	return json(data);
};
