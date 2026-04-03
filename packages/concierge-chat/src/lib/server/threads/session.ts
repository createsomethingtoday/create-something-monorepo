import { error, type Cookies } from '@sveltejs/kit';
import {
	bookThreadAppointment,
	captureThreadConsent,
	completeThreadReview,
	completeThreadOnboarding,
	applyThreadIndeedDispositionSync,
	confirmThreadFields,
	confirmThreadPlacement,
	createConciergeThread,
	closeThreadStaffingRequest,
	getConciergeSessionSnapshot,
	getLatestThreadIdSnapshot,
	getThreadSummariesSnapshot,
	getThreadViewSnapshot,
	getToolStatusRowsSnapshot,
	hasConciergeSessionState,
	hydrateConciergeSession,
	importClaimedConciergeThread,
	initializeConciergeSession,
	rejectThreadFields,
	resetConciergeSession,
	resolveThreadReconnect,
	recordThreadFacilityInterview,
	sendPrototypeMessage,
	startThreadOnboarding,
	startThreadStaffingOutreach,
	submitThreadToFacility,
	uploadThreadAttachments,
	type ThreadAttachmentUpload,
	type ThreadViewState,
	type IndeedDispositionSyncUpdate
} from '$chat/prototype-session';
import type { IntakeClaimThreadSeed } from '$lib/intake/claim-seed';
import { conciergeSettings } from '$demo/concierge';
import { resolveIntakeAccess } from '$lib/server/intake-access';
import { getConciergeSeedMode } from '$lib/server/runtime';
import type { PreferredLocationResolution } from '$chat/location-resolver';
import {
	loadPersistedSessionThreads,
	replacePersistedSessionThreads,
	upsertPersistedSessionThreads
} from './persistence';

const CONCIERGE_SESSION_COOKIE = 'abundance_concierge_session';
const CONCIERGE_SESSION_TTL = 60 * 60 * 24 * 7;
const sessionMutationQueue = new Map<string, Promise<void>>();

export function ensureConciergeSession(
	cookies: Cookies,
	secure: boolean,
	input?: {
		url?: URL;
		platform?: App.Platform;
	}
) {
	if (input?.url) {
		resolveIntakeAccess({
			cookies,
			url: input.url,
			platform: input.platform,
			secure
		});
	}

	const existingSessionId = cookies.get(CONCIERGE_SESSION_COOKIE);

	if (existingSessionId) {
		return existingSessionId;
	}

	const sessionId = crypto.randomUUID();
	cookies.set(CONCIERGE_SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: CONCIERGE_SESSION_TTL
	});
	return sessionId;
}

export function getExistingConciergeSessionId(cookies: Cookies) {
	return cookies.get(CONCIERGE_SESSION_COOKIE) ?? null;
}

async function ensureSessionState(sessionId: string, platform?: App.Platform) {
	if (hasConciergeSessionState(sessionId)) {
		return;
	}

	const seedMode = getConciergeSeedMode(platform);
	const db = platform?.env?.DB;

	if (!db) {
		initializeConciergeSession(sessionId, seedMode);
		return;
	}

	const persistedThreads = await loadPersistedSessionThreads(db, sessionId);

	if (persistedThreads) {
		hydrateConciergeSession(sessionId, persistedThreads);
		return;
	}

	initializeConciergeSession(sessionId, seedMode);
	await replacePersistedSessionThreads(db, sessionId, getConciergeSessionSnapshot(sessionId));
}

async function replaceSessionState(sessionId: string, platform?: App.Platform) {
	const db = platform?.env?.DB;

	if (!db) {
		return;
	}

	await replacePersistedSessionThreads(db, sessionId, getConciergeSessionSnapshot(sessionId));
}

async function upsertSessionThreads(
	sessionId: string,
	threadIds: string[],
	platform?: App.Platform
) {
	const db = platform?.env?.DB;

	if (!db || threadIds.length === 0) {
		return;
	}

	const threads = getConciergeSessionSnapshot(sessionId).filter((thread) => threadIds.includes(thread.id));
	if (threads.length === 0) {
		return;
	}

	await upsertPersistedSessionThreads(db, sessionId, threads);
}

async function mutateSession(
	sessionId: string,
	platform: App.Platform | undefined,
	threadIds: string[],
	mutator: () => void
) {
	const previousMutation = sessionMutationQueue.get(sessionId) ?? Promise.resolve();
	const currentMutation = previousMutation.catch(() => {}).then(async () => {
		await ensureSessionState(sessionId, platform);
		mutator();
		await upsertSessionThreads(sessionId, threadIds, platform);
	});

	sessionMutationQueue.set(sessionId, currentMutation);

	try {
		await currentMutation;
	} finally {
		if (sessionMutationQueue.get(sessionId) === currentMutation) {
			sessionMutationQueue.delete(sessionId);
		}
	}
}

export async function getWorkspacePageData(sessionId: string, platform?: App.Platform) {
	await ensureSessionState(sessionId, platform);

	return {
		threadSummaries: getThreadSummariesSnapshot(sessionId),
		latestThreadId: getLatestThreadIdSnapshot(sessionId)
	};
}

export async function getSettingsPageData(sessionId: string, platform?: App.Platform) {
	await ensureSessionState(sessionId, platform);

	return {
		settings: conciergeSettings,
		toolStatusRows: getToolStatusRowsSnapshot(sessionId)
	};
}

export async function getRequiredThreadView(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
): Promise<ThreadViewState> {
	await ensureSessionState(sessionId, platform);

	const threadView = getThreadViewSnapshot(sessionId, threadId);

	if (!threadView) {
		throw error(404, `Unknown intake thread: ${threadId}`);
	}

	return threadView;
}

export async function getRequiredHandoffThreadView(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	const threadView = await getRequiredThreadView(sessionId, threadId, platform);

	if (!threadView.hasHandoff || !threadView.handoffPacket) {
		throw error(404, `No handoff packet is available for thread: ${threadId}`);
	}

	return threadView as ThreadViewState & {
		hasHandoff: true;
		handoffPacket: NonNullable<ThreadViewState['handoffPacket']>;
	};
}

export async function createPersistedConciergeThread(sessionId: string, platform?: App.Platform) {
	await ensureSessionState(sessionId, platform);

	const threadId = createConciergeThread(sessionId);

	await upsertSessionThreads(sessionId, [threadId], platform);
	return threadId;
}

export async function claimPersistedConciergeThread(
	sessionId: string,
	seed: IntakeClaimThreadSeed,
	platform?: App.Platform
) {
	await ensureSessionState(sessionId, platform);

	const threadId = importClaimedConciergeThread(sessionId, seed);
	await upsertSessionThreads(sessionId, [threadId], platform);
	return threadId;
}

export async function resetPersistedConciergeSession(sessionId: string, platform?: App.Platform) {
	resetConciergeSession(sessionId, getConciergeSeedMode(platform));
	await replaceSessionState(sessionId, platform);
}

export async function sendPersistedPrototypeMessage(
	sessionId: string,
	threadId: string,
	body: string,
	options?: {
		recoveredLocationResolution?: PreferredLocationResolution | null;
		locationClarificationNeeded?: boolean;
	},
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		sendPrototypeMessage(sessionId, threadId, body, options);
	});
}

export async function confirmPersistedThreadFields(
	sessionId: string,
	threadId: string,
	fieldKeys: string[],
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		confirmThreadFields(sessionId, threadId, fieldKeys);
	});
}

export async function rejectPersistedThreadFields(
	sessionId: string,
	threadId: string,
	fieldKeys: string[],
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		rejectThreadFields(sessionId, threadId, fieldKeys);
	});
}

export async function capturePersistedThreadConsent(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		captureThreadConsent(sessionId, threadId);
	});
}

export async function bookPersistedThreadAppointment(
	sessionId: string,
	threadId: string,
	slotId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		bookThreadAppointment(sessionId, threadId, slotId);
	});
}

export async function completePersistedThreadReview(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		completeThreadReview(sessionId, threadId);
	});
}

export async function startPersistedStaffingOutreach(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		startThreadStaffingOutreach(sessionId, threadId);
	});
}

export async function submitPersistedThreadToFacility(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		submitThreadToFacility(sessionId, threadId);
	});
}

export async function recordPersistedFacilityInterview(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		recordThreadFacilityInterview(sessionId, threadId);
	});
}

export async function confirmPersistedThreadPlacement(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		confirmThreadPlacement(sessionId, threadId);
	});
}

export async function closePersistedStaffingRequest(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		closeThreadStaffingRequest(sessionId, threadId);
	});
}

export async function startPersistedThreadOnboarding(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		startThreadOnboarding(sessionId, threadId);
	});
}

export async function completePersistedThreadOnboarding(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		completeThreadOnboarding(sessionId, threadId);
	});
}

export async function uploadPersistedThreadAttachments(
	sessionId: string,
	threadId: string,
	uploads: ThreadAttachmentUpload[],
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		uploadThreadAttachments(sessionId, threadId, uploads);
	});
}

export async function applyPersistedIndeedDispositionSync(
	sessionId: string,
	threadId: string,
	update: IndeedDispositionSyncUpdate,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		applyThreadIndeedDispositionSync(sessionId, threadId, update);
	});
}

export async function resolvePersistedThreadReconnect(
	sessionId: string,
	threadId: string,
	platform?: App.Platform
) {
	await mutateSession(sessionId, platform, [threadId], () => {
		resolveThreadReconnect(sessionId, threadId);
	});
}
