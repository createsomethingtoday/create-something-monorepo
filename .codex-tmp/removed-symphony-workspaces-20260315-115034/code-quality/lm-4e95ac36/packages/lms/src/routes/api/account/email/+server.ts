/**
 * Email Change API Route
 *
 * Proxies to Identity Worker for email change requests.
 *
 * Canon: Identity flows, but verification anchors.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface EmailChangeRequest {
	new_email: string;
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

export const POST: RequestHandler = async ({ request, cookies }) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const body = (await request.json()) as EmailChangeRequest;

	if (!body.new_email || !body.password) {
		throw error(400, 'New email and password required');
	}

	const response = await fetch(`${IDENTITY_WORKER}/v1/users/me/email/change`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify(body),
	});

	const data = (await response.json()) as SuccessResponse | ErrorResponse;

	if (!response.ok) {
		const errData = data as ErrorResponse;
		throw error(response.status, errData.message || 'Failed to initiate email change');
	}

	return json(data);
};
