import type { Handle } from '@sveltejs/kit';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { getUserRole } from '$lib/server/auth';

interface SessionData {
	userId: string;
	email: string;
	name: string;
	membership: boolean;
	role?: 'admin' | 'user';
	createdAt: number;
}

export const handle: Handle = async ({ event, resolve }) => {
	const platform = event.platform as {
		env: {
			DB?: D1Database;
			SESSIONS?: KVNamespace;
			VIDEO_STATS?: KVNamespace;
			AI?: any;
		};
	} | undefined;

	// Get session token from cookie
	const sessionToken = event.cookies.get('session_token');

	if (sessionToken && platform?.env.SESSIONS) {
		try {
			// Retrieve session from KV
			const sessionJson = await platform.env.SESSIONS.get(`session:${sessionToken}`);

				if (sessionJson) {
					const sessionData: SessionData = JSON.parse(sessionJson);
					const role: 'admin' | 'user' =
						sessionData.role === 'admin' ? 'admin' : getUserRole(sessionData.email);

					// Set user in locals for access in load functions
					event.locals.user = {
						id: sessionData.userId,
						email: sessionData.email,
						name: sessionData.name,
						membership: sessionData.membership,
						role,
						createdAt: new Date(sessionData.createdAt).toISOString()
					};
				}
		} catch (error) {
			console.error('Error retrieving session:', error);
			// Clear invalid session cookie
			event.cookies.delete('session_token', { path: '/' });
		}
	}

	// Pass through to the requested route
	const response = await resolve(event);
	return response;
};
