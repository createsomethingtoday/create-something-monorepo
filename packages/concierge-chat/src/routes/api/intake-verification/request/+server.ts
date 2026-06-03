import { json, type RequestHandler } from '@sveltejs/kit';
import { ensureConciergeSession } from '$lib/server/threads/session';
import { requestIntakeVerificationChallenge } from '$lib/server/intake-verification';
import {
	getEmailDomain,
	logConciergeEvent,
	resolveRequestIp,
	serializeError
} from '$lib/server/observability';
import {
	createRateLimitedJsonResponse,
	enforcePublicWritePolicies
} from '$lib/server/public-write-limits';

export const POST: RequestHandler = async ({ cookies, platform, request, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });

	let payload: { email?: unknown } | null = null;

	try {
		payload = (await request.json()) as { email?: unknown };
	} catch {
		payload = null;
	}

	if (!payload || typeof payload.email !== 'string') {
		return json({ message: 'A valid email address is required.' }, { status: 400 });
	}

	try {
		const limitResult = await enforcePublicWritePolicies({
			platform,
			policies: [
				{
					scope: 'verification_request.ip.1h',
					subject: `ip:${resolveRequestIp(request)}`,
					windowMs: 60 * 60 * 1000,
					maxHits: 8
				},
				{
					scope: 'verification_request.session.1h',
					subject: `session:${sessionId}`,
					windowMs: 60 * 60 * 1000,
					maxHits: 5
				}
			]
		});

		if (!limitResult.ok && limitResult.blockedPolicy) {
			logConciergeEvent({
				level: 'warn',
				event: 'verification.request.rate_limited',
				route: '/api/intake-verification/request',
				sessionId,
				request,
				data: {
					scope: limitResult.blockedPolicy.scope,
					retryAfterSeconds: limitResult.blockedPolicy.retryAfterSeconds,
					emailDomain: getEmailDomain(payload.email)
				}
			});
			return createRateLimitedJsonResponse(
				'Too many verification codes were requested from this browser. Wait a bit and try again.',
				limitResult.blockedPolicy.retryAfterSeconds
			);
		}

		const result = await requestIntakeVerificationChallenge({
			sessionId,
			email: payload.email,
			platform
		});

		logConciergeEvent({
			event: 'verification.requested',
			route: '/api/intake-verification/request',
			sessionId,
			request,
			data: {
				mode: result.mode,
				emailDomain: getEmailDomain(result.email)
			}
		});

		return json({ ok: true, ...result });
	} catch (issue) {
		logConciergeEvent({
			level:
				typeof issue === 'object' && issue !== null && 'status' in issue && issue.status === 429
					? 'warn'
					: 'error',
			event: 'verification.request.failed',
			route: '/api/intake-verification/request',
			sessionId,
			request,
			data: {
				emailDomain: getEmailDomain(payload.email),
				...serializeError(issue)
			}
		});
		throw issue;
	}
};
