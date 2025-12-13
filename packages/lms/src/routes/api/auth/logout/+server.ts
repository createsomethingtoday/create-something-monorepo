/**
 * Logout API Route
 *
 * Clears cookies and notifies Identity Worker.
 *
 * Canon: Departure is as clean as arrival.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';

export const POST: RequestHandler = async ({ cookies }) => {
	const refreshToken = cookies.get('cs_refresh_token');

	// Notify Identity Worker to revoke tokens
	if (refreshToken) {
		try {
			await fetch(`${IDENTITY_WORKER}/v1/auth/logout`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refresh_token: refreshToken }),
			});
		} catch {
			// Ignore errors - we still want to clear cookies
		}
	}

	// Clear cookies
	cookies.delete('cs_access_token', { path: '/' });
	cookies.delete('cs_refresh_token', { path: '/' });

	return json({ success: true });
};
