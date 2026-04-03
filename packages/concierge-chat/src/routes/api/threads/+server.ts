import { json, type RequestHandler } from '@sveltejs/kit';
import {
	createPersistedConciergeThread,
	ensureConciergeSession,
	getWorkspacePageData
} from '$lib/server/threads/session';

export const GET: RequestHandler = async ({ cookies, platform, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });

	return json(await getWorkspacePageData(sessionId, platform));
};

export const POST: RequestHandler = async ({ cookies, platform, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });
	const threadId = await createPersistedConciergeThread(sessionId, platform);

	return json({ ok: true, threadId });
};
