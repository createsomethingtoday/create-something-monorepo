/**
 * Privacy Settings API Route
 *
 * Proxies to Identity Worker for analytics opt-out management.
 *
 * Canon: Privacy is not a feature—it's respect for the user's autonomy.
 */

import { json, error, type RequestEvent } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface AnalyticsResponse {
	success: boolean;
	analytics_opt_out: boolean;
	message: string;
}

interface ErrorResponse {
	error: string;
	message: string;
}

export const PATCH = async ({ request, cookies }: RequestEvent) => {
	const accessToken = cookies.get('cs_access_token');

	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const body = await request.json() as { analytics_opt_out?: boolean };

	if (typeof body.analytics_opt_out !== 'boolean') {
		throw error(400, 'analytics_opt_out boolean required');
	}

	const response = await fetch(`${IDENTITY_WORKER}/v1/users/me/analytics`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: JSON.stringify({ analytics_opt_out: body.analytics_opt_out }),
	});

	const data = (await response.json()) as AnalyticsResponse | ErrorResponse;

	if (!response.ok) {
		const errData = data as ErrorResponse;
		throw error(response.status, errData.message || 'Failed to update privacy settings');
	}

	return json(data);
};
