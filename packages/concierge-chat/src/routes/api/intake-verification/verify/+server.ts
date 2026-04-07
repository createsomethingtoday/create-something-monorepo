import { json, type RequestHandler } from '@sveltejs/kit';
import { verifyIntakeVerificationChallenge } from '$lib/server/intake-verification';
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
import { ensureConciergeSession } from '$lib/server/threads/session';

export const POST: RequestHandler = async ({ cookies, platform, request, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });

	let payload: { email?: unknown; code?: unknown } | null = null;

	try {
		payload = (await request.json()) as { email?: unknown; code?: unknown };
	} catch {
		payload = null;
	}

	if (!payload || typeof payload.email !== 'string' || typeof payload.code !== 'string') {
		return json({ message: 'Both email and verification code are required.' }, { status: 400 });
	}

	try {
		const limitResult = await enforcePublicWritePolicies({
			platform,
			policies: [
				{
					scope: 'verification_verify.ip.15m',
					subject: `ip:${resolveRequestIp(request)}`,
					windowMs: 15 * 60 * 1000,
					maxHits: 12
				},
				{
					scope: 'verification_verify.session.15m',
					subject: `session:${sessionId}`,
					windowMs: 15 * 60 * 1000,
					maxHits: 8
				}
			]
		});

		if (!limitResult.ok && limitResult.blockedPolicy) {
			logConciergeEvent({
				level: 'warn',
				event: 'verification.verify.rate_limited',
				route: '/api/intake-verification/verify',
				sessionId,
				request,
				data: {
					scope: limitResult.blockedPolicy.scope,
					retryAfterSeconds: limitResult.blockedPolicy.retryAfterSeconds,
					emailDomain: getEmailDomain(payload.email)
				}
			});
			return createRateLimitedJsonResponse(
				'Too many verification attempts were made from this browser. Wait a bit and request a fresh code.',
				limitResult.blockedPolicy.retryAfterSeconds
			);
		}

		const result = await verifyIntakeVerificationChallenge({
			sessionId,
			email: payload.email,
			code: payload.code,
			cookies,
			secure: url.protocol === 'https:',
			platform
		});

		logConciergeEvent({
			event: 'verification.verified',
			route: '/api/intake-verification/verify',
			sessionId,
			request,
			data: {
				emailDomain: getEmailDomain(result.email)
			}
		});

		return json({ ok: true, ...result });
	} catch (issue) {
		logConciergeEvent({
			level:
				typeof issue === 'object' && issue !== null && 'status' in issue && issue.status === 400
					? 'warn'
					: typeof issue === 'object' && issue !== null && 'status' in issue && issue.status === 429
						? 'warn'
						: 'error',
			event: 'verification.verify.failed',
			route: '/api/intake-verification/verify',
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
