import { json, type RequestHandler } from '@sveltejs/kit';
import { PREFERRED_LOCATION_LABEL } from '$chat/location-resolver';
import { recoverPreferredLocationWithFallback } from '$lib/server/geo-fallback';
import { logConciergeEvent, resolveRequestIp, serializeError } from '$lib/server/observability';
import {
	createRateLimitedJsonResponse,
	enforcePublicWritePolicies
} from '$lib/server/public-write-limits';
import {
	ensureConciergeSession,
	getRequiredThreadView,
	sendPersistedPrototypeMessage
} from '$lib/server/threads/session';

export const POST: RequestHandler = async ({ cookies, params, platform, request, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });
	const threadId = params.threadId;

	if (!threadId) {
		return json({ message: 'Thread id is required.' }, { status: 400 });
	}

	const threadView = await getRequiredThreadView(sessionId, threadId, platform);

	let payload: { body?: unknown } | null = null;

	try {
		payload = (await request.json()) as { body?: unknown };
	} catch {
		payload = null;
	}

	if (!payload || typeof payload.body !== 'string' || payload.body.trim().length === 0) {
		return json({ message: 'Message body is required.' }, { status: 400 });
	}

	try {
		const limitResult = await enforcePublicWritePolicies({
			platform,
			policies: [
				{
					scope: 'thread_message.ip.5m',
					subject: `ip:${resolveRequestIp(request)}`,
					windowMs: 5 * 60 * 1000,
					maxHits: 90
				},
				{
					scope: 'thread_message.session.5m',
					subject: `session:${sessionId}`,
					windowMs: 5 * 60 * 1000,
					maxHits: 30
				}
			]
		});

		if (!limitResult.ok && limitResult.blockedPolicy) {
			logConciergeEvent({
				level: 'warn',
				event: 'thread.message.rate_limited',
				route: '/api/threads/[threadId]/message',
				sessionId,
				threadId,
				request,
				data: {
					scope: limitResult.blockedPolicy.scope,
					hitCount: limitResult.blockedPolicy.hitCount,
					retryAfterSeconds: limitResult.blockedPolicy.retryAfterSeconds
				}
			});
			return createRateLimitedJsonResponse(
				'You are sending messages too quickly. Wait a moment and try again.',
				limitResult.blockedPolicy.retryAfterSeconds
			);
		}

		const currentPreferredLocation =
			threadView.thread.profile.fields.find((field) => field.key === 'preferred_region')?.value;
		const requestedByPrompt = threadView.thread.profile.missingRequired.includes(PREFERRED_LOCATION_LABEL);
		const locationRecovery = await recoverPreferredLocationWithFallback(payload.body, {
			currentValue: currentPreferredLocation,
			requestedByPrompt,
			platform
		});

		await sendPersistedPrototypeMessage(
			sessionId,
			threadId,
			payload.body,
			{
				recoveredLocationResolution: locationRecovery.resolution,
				locationClarificationNeeded: locationRecovery.clarify
			},
			platform
		);

		logConciergeEvent({
			event: 'thread.message.sent',
			route: '/api/threads/[threadId]/message',
			sessionId,
			threadId,
			request,
			data: {
				messageLength: payload.body.trim().length,
				locationRecovered: Boolean(locationRecovery.resolution),
				locationClarificationNeeded: locationRecovery.clarify
			}
		});

		return json({
			ok: true,
			threadId,
			threadView: await getRequiredThreadView(sessionId, threadId, platform)
		});
	} catch (issue) {
		logConciergeEvent({
			level: 'error',
			event: 'thread.message.failed',
			route: '/api/threads/[threadId]/message',
			sessionId,
			threadId,
			request,
			data: serializeError(issue)
		});
		throw issue;
	}
};
