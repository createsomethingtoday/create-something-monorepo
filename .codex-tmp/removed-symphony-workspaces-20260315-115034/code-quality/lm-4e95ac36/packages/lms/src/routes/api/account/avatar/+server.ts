/**
 * Avatar API Route
 *
 * Proxies to Identity Worker for avatar management.
 *
 * Canon: The face reveals the self.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface AvatarResponse {
	success: boolean;
	avatar_url?: string;
	message?: string;
}

interface ErrorResponse {
	error: string;
	message: string;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const contentType = request.headers.get('Content-Type') || '';

	// Forward the request to Identity Worker with same content type
	const response = await fetch(`${IDENTITY_WORKER}/v1/users/me/avatar`, {
		method: 'POST',
		headers: {
			'Content-Type': contentType,
			Authorization: `Bearer ${accessToken}`,
		},
		body: request.body,
		// @ts-expect-error - duplex required for streaming body
		duplex: 'half',
	});

	const data = (await response.json()) as AvatarResponse | ErrorResponse;

	if (!response.ok) {
		const errData = data as ErrorResponse;
		throw error(response.status, errData.message || 'Failed to upload avatar');
	}

	return json(data);
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const response = await fetch(`${IDENTITY_WORKER}/v1/users/me/avatar`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	const data = (await response.json()) as AvatarResponse | ErrorResponse;

	if (!response.ok) {
		const errData = data as ErrorResponse;
		throw error(response.status, errData.message || 'Failed to delete avatar');
	}

	return json(data);
};
