import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { issueIntakeGrantCookie } from '$lib/server/intake-access';
import { markCandidateIntakeClaimClaimed } from '$lib/server/intake-claims';
import {
	claimPersistedConciergeThread,
	ensureConciergeSession
} from '$lib/server/threads/session';

export const GET: RequestHandler = async ({ cookies, platform, url }) => {
	const token = url.searchParams.get('token')?.trim();
	if (!token) {
		throw error(400, 'Missing candidate intake claim token.');
	}

	const secure = url.protocol === 'https:';
	const sessionId = ensureConciergeSession(cookies, secure, { platform, url });
	const claim = await markCandidateIntakeClaimClaimed(token, platform);

	if (!claim) {
		throw error(404, 'This application continuation link is invalid or expired.');
	}

	const threadId = await claimPersistedConciergeThread(sessionId, claim.threadSeed, platform);
	const ttlSeconds = Math.max(60, Math.floor((Date.parse(claim.expiresAt) - Date.now()) / 1000));

	issueIntakeGrantCookie({
		cookies,
		secure,
		platform,
		subject: claim.indeedApplyId,
		email: claim.applicantEmail ?? claim.threadSeed.applicant.email,
		name: claim.threadSeed.applicant.name,
		ttlSeconds
	});

	throw redirect(303, `/chat/${threadId}`);
};
