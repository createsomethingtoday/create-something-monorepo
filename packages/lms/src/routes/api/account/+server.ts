/**
 * Account API Route
 *
 * Proxies to Identity Worker for profile management.
 *
 * Canon: The infrastructure disappears; only the unified self remains.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface UserResponse {
	id: string;
	email: string;
	email_verified: boolean;
	name?: string;
	avatar_url?: string;
	tier: 'free' | 'pro' | 'agency';
	created_at: string;
}

interface ErrorResponse {
	error: string;
	message: string;
}

export const GET: RequestHandler = async ({ cookies }) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const response = await fetch(`${IDENTITY_WORKER}/v1/users/me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	const data = (await response.json()) as UserResponse | ErrorResponse;

	if (!response.ok) {
		const errData = data as ErrorResponse;
		throw error(response.status, errData.message || 'Failed to fetch profile');
	}

	return json(data);
};

export const PATCH: RequestHandler = async ({ request, cookies }) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const body = await request.json();

	const response = await fetch(`${IDENTITY_WORKER}/v1/users/me`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify(body),
	});

	const data = (await response.json()) as UserResponse | ErrorResponse;

	if (!response.ok) {
		const errData = data as ErrorResponse;
		throw error(response.status, errData.message || 'Failed to update profile');
	}

	return json(data);
};
