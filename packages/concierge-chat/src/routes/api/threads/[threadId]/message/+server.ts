import { json, type RequestHandler } from '@sveltejs/kit';
import { PREFERRED_LOCATION_LABEL } from '$chat/location-resolver';
import { recoverPreferredLocationWithFallback } from '$lib/server/geo-fallback';
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

	return json({
		ok: true,
		threadId,
		threadView: await getRequiredThreadView(sessionId, threadId, platform)
	});
};
