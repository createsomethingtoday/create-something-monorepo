import type { Handle } from '@sveltejs/kit';
import { getSessions, setCloudflareKVBindings } from '$lib/server/kv-compat';

interface SessionData {
	userId: string;
	email: string;
	name: string;
	membership: boolean;
	createdAt: number;
}

export const handle: Handle = async ({ event, resolve }) => {
	setCloudflareKVBindings(event.platform?.env);

	// Get session token from cookie
	const sessionToken = event.cookies.get('session_token');

	if (sessionToken) {
		try {
			const sessions = getSessions();
			const sessionJson = await sessions.get(`session:${sessionToken}`);

			if (sessionJson) {
				const sessionData: SessionData = JSON.parse(sessionJson);

				// Set user in locals for access in load functions
				event.locals.user = {
					id: sessionData.userId,
					email: sessionData.email,
					name: sessionData.name,
					membership: sessionData.membership,
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
