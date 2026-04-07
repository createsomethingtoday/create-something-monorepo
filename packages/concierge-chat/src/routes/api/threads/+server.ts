import { json, type RequestHandler } from '@sveltejs/kit';
import { logConciergeEvent, resolveRequestIp, serializeError } from '$lib/server/observability';
import {
	createRateLimitedJsonResponse,
	enforcePublicWritePolicies
} from '$lib/server/public-write-limits';
import {
	createPersistedConciergeThread,
	ensureConciergeSession,
	getWorkspacePageData
} from '$lib/server/threads/session';

export const GET: RequestHandler = async ({ cookies, platform, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });

	return json(await getWorkspacePageData(sessionId, platform));
};

export const POST: RequestHandler = async ({ cookies, platform, request, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });

	try {
		const limitResult = await enforcePublicWritePolicies({
			platform,
			policies: [
				{
					scope: 'thread_create.ip.10m',
					subject: `ip:${resolveRequestIp(request)}`,
					windowMs: 10 * 60 * 1000,
					maxHits: 6
				},
				{
					scope: 'thread_create.session.1d',
					subject: `session:${sessionId}`,
					windowMs: 24 * 60 * 60 * 1000,
					maxHits: 24
				}
			]
		});

		if (!limitResult.ok && limitResult.blockedPolicy) {
			logConciergeEvent({
				level: 'warn',
				event: 'thread.create.rate_limited',
				route: '/api/threads',
				sessionId,
				request,
				data: {
					scope: limitResult.blockedPolicy.scope,
					hitCount: limitResult.blockedPolicy.hitCount,
					retryAfterSeconds: limitResult.blockedPolicy.retryAfterSeconds
				}
			});
			return createRateLimitedJsonResponse(
				'Too many new application threads were started from this browser. Wait a few minutes and try again.',
				limitResult.blockedPolicy.retryAfterSeconds
			);
		}

		const threadId = await createPersistedConciergeThread(sessionId, platform);
		logConciergeEvent({
			event: 'thread.created',
			route: '/api/threads',
			sessionId,
			threadId,
			request
		});

		return json({ ok: true, threadId });
	} catch (issue) {
		logConciergeEvent({
			level: 'error',
			event: 'thread.create.failed',
			route: '/api/threads',
			sessionId,
			request,
			data: serializeError(issue)
		});
		throw issue;
	}
};
