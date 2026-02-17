import type { Handle } from '@sveltejs/kit';
import type { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

interface SessionData {
	userId: string;
	email: string;
	name: string;
	membership: boolean;
	createdAt: number;
}

export const handle: Handle = async ({ event, resolve }) => {
	const platform = event.platform as {
		env: {
			DB?: D1Database;
			SESSIONS?: KVNamespace;
			VIDEO_STATS?: KVNamespace;
			VIDEO_ASSETS?: R2Bucket;
			AI?: any;
			CLOUDFLARE_ACCOUNT_ID?: string;
			CLOUDFLARE_STREAM_API_TOKEN?: string;
			CLOUDFLARE_STREAM_CUSTOMER_CODE?: string;
			CLOUDFLARE_STREAM_WEBHOOK_SECRET?: string;
			CLOUDFLARE_STREAM_ALLOWED_ORIGINS?: string;
			VIDEO_STREAM_TOKEN_TTL_SECONDS?: string;
			VIDEO_INGEST_API_TOKEN?: string;
			VIDEO_SERIES_ADMIN_EMAILS?: string;
			VIDEO_ADMIN_EMAILS?: string;
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
