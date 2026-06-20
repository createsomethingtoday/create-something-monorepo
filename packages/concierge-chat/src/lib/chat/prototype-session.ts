import { createHandoffPacket } from '$lib/handoff/create-packet';
import { buildProfileAudit } from '$lib/profile/audit';
import type { ProfileFieldEvent } from '$lib/profile/types';
import { seedThreads } from '$demo/concierge';
import type { ChatArtifact } from './artifact-model';
import {
	getRequiredDocumentSpecByKey,
	REQUIRED_DOCUMENT_SPECS,
	type RequiredDocumentKey
} from './document-requirements';
import type { IntakeClaimImportedDocument, IntakeClaimThreadSeed } from '$lib/intake/claim-seed';
import {
	formatRecruiterSlot,
	getSelectedMatchingOpportunity,
	getSelectedRecruiterSlot,
	type MatchingOpportunity,
	type MatchingState,
	type RecruiterReviewSlot
} from './matching-model';
import {
	getMatchingFacilitiesForPreferredLocation,
	normalizePreferredLocationLabel,
	PREFERRED_LOCATION_LABEL,
	resolvePreferredLocation,
	type PreferredLocationResolution
} from './location-resolver';
import { getNurseGuidance } from './nurse-guidance';
import { determineNextStep, type NextStepRecommendation } from './next-step';
import {
	toThreadSummary,
	type ConciergeThread,
	type OnboardingQueueStatus,
	type StaffingQueueStatus
} from './thread-store';
import {
	getConfirmableFields,
	hasCollectedIntakeData,
	hasStartedIntake,
	getMissingIntakeFieldLabels,
	getMissingRequiredDocumentSpecs,
	getProfileField,
	getReconnectTool,
	getRejectedConfirmableFields,
	getUploadedDocumentArtifact,
	hasHandoffPacket,
	isMatchingReady,
	needsConsent,
	needsDocumentUpload,
	needsToolReconnect
} from './workflow';
import { splitWidgetsByPlacement } from '$lib/widgets/select';
import type { ConciergeWidget } from '$widgets/types';
import { buildControlPlaneBridgeHref } from '$lib/control-plane';

export interface ThreadViewState {
	thread: ConciergeThread;
	nextStep: NextStepRecommendation;
	profileAudit: ReturnType<typeof buildProfileAudit>;
	inlineWidgets: ConciergeWidget[];
	railWidgets: ConciergeWidget[];
	handoffPacket: ReturnType<typeof createHandoffPacket>;
	hasHandoff: boolean;
}

export interface ToolStatusRow {
	threadId: string;
	threadTitle: string;
	name: string;
	status: 'connected' | 'action_required' | 'queued';
	note: string;
	actionHref?: string;
}

export interface ThreadAttachmentUpload {
	documentKey: RequiredDocumentKey;
	fileName: string;
	contentType: string;
	byteSize: number;
	storageKey: string;
	href: string;
}

export interface IndeedDispositionSyncUpdate {
	dispositionStatus: string | null;
	syncState:
		| 'not_linked'
		| 'recorded_local_only'
		| 'synced_remote'
		| 'sync_error';
	note: string;
	recordedAt: string;
}

const POLICY_REF = 'policy.progressive-profile-governance.v1';
const PROFILE_SNAPSHOT_ID = 'profile_snapshot_1';
const INDEED_APPLICATION_RECEIPT_ID = 'indeed_application_receipt_1';
const INDEED_DISPOSITION_RECEIPT_ID = 'indeed_disposition_receipt_1';
const TOOL_ACTION_ID = 'tool_action_1';
const CONSENT_ARTIFACT_ID = 'consent_receipt_1';
const SHORTLIST_ARTIFACT_ID = 'shortlist_packet_1';
const APPOINTMENT_ARTIFACT_ID = 'appointment_confirmation_1';
const REVIEW_SUMMARY_ARTIFACT_ID = 'review_summary_1';
const STAFFING_HANDOFF_ARTIFACT_ID = 'staffing_handoff_packet_1';
const STAFFING_OUTREACH_ARTIFACT_ID = 'staffing_outreach_note_1';
const FACILITY_SUBMISSION_ARTIFACT_ID = 'facility_submission_1';
const FACILITY_RESPONSE_ARTIFACT_ID = 'facility_response_1';
const PLACEMENT_CONFIRMATION_ARTIFACT_ID = 'placement_confirmation_1';
const STAFFING_CLOSURE_ARTIFACT_ID = 'staffing_closure_1';
const ONBOARDING_HANDOFF_ARTIFACT_ID = 'onboarding_handoff_packet_1';
const ONBOARDING_COMPLETION_ARTIFACT_ID = 'onboarding_completion_1';
const DOCUMENT_ARTIFACT_IDS: Record<RequiredDocumentKey, string> = {
	resume_pdf: 'upload_resume_1',
	compact_license_image: 'upload_compact_license_1'
};
const MATCHING_ARTIFACT_IDS = new Set([
	SHORTLIST_ARTIFACT_ID,
	APPOINTMENT_ARTIFACT_ID,
	REVIEW_SUMMARY_ARTIFACT_ID
]);

const MAX_IN_MEMORY_SESSIONS = 250;
const SESSION_IDLE_TTL_MS = 1000 * 60 * 30;
const threadsBySession = new Map<string, ConciergeThread[]>();
const sessionAccessTimes = new Map<string, number>();
export type ConciergeSessionSeedMode = 'demo' | 'empty';

export function getThreadSummariesSnapshot(sessionId: string) {
	return orderThreads(getSessionThreads(sessionId)).map((thread) => toThreadSummary(thread));
}

export function getLatestThreadIdSnapshot(sessionId: string) {
	return getThreadSummariesSnapshot(sessionId)[0]?.id ?? null;
}

export function getToolStatusRowsSnapshot(sessionId: string) {
	return orderThreads(getSessionThreads(sessionId)).flatMap((thread) =>
		thread.connectedTools.map((tool) => ({
			threadId: thread.id,
			threadTitle: thread.title,
			name: tool.name,
			status: tool.status,
			note: tool.note,
			actionHref: tool.actionHref
		}))
	);
}

export function getThreadViewSnapshot(sessionId: string, threadId: string) {
	const thread = getSessionThreads(sessionId).find((candidate) => candidate.id === threadId);
	return thread ? buildThreadView(thread) : null;
}

export function getConciergeSessionSnapshot(sessionId: string) {
	return structuredClone(getSessionThreads(sessionId));
}

export function hydrateConciergeSession(sessionId: string, threads: ConciergeThread[]) {
	threadsBySession.set(
		sessionId,
		threads.map((thread) => refreshThread(structuredClone(thread)))
	);
	touchSession(sessionId);
}

export function hasConciergeSessionState(sessionId: string) {
	pruneInactiveSessions();
	return threadsBySession.has(sessionId);
}

export function initializeConciergeSession(
	sessionId: string,
	seedMode: ConciergeSessionSeedMode = 'demo'
) {
	threadsBySession.set(sessionId, createInitialThreads(seedMode));
	touchSession(sessionId);
}

export function resetConciergeSession(
	sessionId: string,
	seedMode: ConciergeSessionSeedMode = 'demo'
) {
	threadsBySession.set(sessionId, createInitialThreads(seedMode));
	touchSession(sessionId);
}

export function createConciergeThread(sessionId: string) {
	const thread = refreshThread(buildBlankThread());
	threadsBySession.set(sessionId, [thread, ...getSessionThreads(sessionId)]);
	touchSession(sessionId);
	return thread.id;
}

export function importClaimedConciergeThread(sessionId: string, seed: IntakeClaimThreadSeed) {
	const existingThread = getSessionThreads(sessionId).find(
		(thread) => thread.integrationRefs?.indeed?.indeedApplyId === seed.application.indeedApplyId
	);

	if (existingThread) {
		return existingThread.id;
	}

	const thread = refreshThread(buildClaimedThread(seed));
	threadsBySession.set(sessionId, [thread, ...getSessionThreads(sessionId)]);
	touchSession(sessionId);
	return thread.id;
}

export function confirmThreadFields(sessionId: string, threadId: string, fieldKeys: string[]) {
	updateThread(sessionId, threadId, (thread) => {
		const confirmedFields = confirmFields(thread, fieldKeys);
		if (confirmedFields.length === 0) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Confirmed ${confirmedFields.length} preference field${confirmedFields.length === 1 ? '' : 's'} in the intake thread.`
		);
		appendAssistantMessage(
			thread,
			`I confirmed ${formatLabelList(confirmedFields.map((field) => field.label))} in your profile. ${getNurseGuidance(thread).chatReply}`,
			[snapshotId]
		);
	});
}

export function rejectThreadFields(sessionId: string, threadId: string, fieldKeys: string[]) {
	updateThread(sessionId, threadId, (thread) => {
		const rejectedFields = rejectFields(thread, fieldKeys);
		if (rejectedFields.length === 0) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Rejected ${rejectedFields.length} preference field${rejectedFields.length === 1 ? '' : 's'} in the intake thread.`
		);
		appendAssistantMessage(
			thread,
			`I marked ${formatLabelList(rejectedFields.map((field) => field.label))} for correction. ${getNurseGuidance(thread).chatReply}`,
			[snapshotId]
		);
	});
}

export function captureThreadConsent(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		if (!needsConsent(thread)) {
			return;
		}

		const artifactId = captureConsent(thread);
		const snapshotId = updateProfileSnapshot(
			thread,
			'Captured background-check consent in the intake thread.'
		);
		appendAssistantMessage(
			thread,
			`Consent captured. ${getNurseGuidance(thread).chatReply}`,
			[artifactId, snapshotId]
		);
	});
}

export function uploadThreadAttachments(
	sessionId: string,
	threadId: string,
	uploads: ThreadAttachmentUpload[]
) {
	updateThread(sessionId, threadId, (thread) => {
		if (uploads.length === 0) {
			return;
		}

		const artifactIds = attachUploadedDocuments(thread, uploads);
		if (artifactIds.length === 0) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Captured ${artifactIds.length} credential upload${artifactIds.length === 1 ? '' : 's'} in the intake thread.`
		);
		appendAssistantMessage(
			thread,
			`I added ${formatLabelList(
				uploads
					.map((upload) => getRequiredDocumentSpecByKey(upload.documentKey)?.title)
					.filter((title): title is string => Boolean(title))
			)} to your application. ${getNurseGuidance(thread).chatReply}`,
			[...artifactIds, snapshotId]
		);
	});
}

export function resolveThreadReconnect(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		if (!needsToolReconnect(thread)) {
			return;
		}

		resolveReconnect(thread);
		const snapshotId = updateProfileSnapshot(
			thread,
			'Reconnected the credentialing dependency for this intake thread.'
		);
		appendAssistantMessage(
			thread,
			`That verification step is connected again. ${getNurseGuidance(thread).chatReply}`,
			[TOOL_ACTION_ID, snapshotId]
		);
	});
}

export function applyThreadIndeedDispositionSync(
	sessionId: string,
	threadId: string,
	update: IndeedDispositionSyncUpdate
) {
	updateThread(sessionId, threadId, (thread) => {
		const indeed = thread.integrationRefs?.indeed;
		if (!indeed) {
			return;
		}

		indeed.dispositionStatus = update.dispositionStatus;
		indeed.dispositionSyncState = update.syncState;
		indeed.lastSyncedAt = update.recordedAt;
		indeed.lastError = update.syncState === 'sync_error' ? update.note : null;

		upsertArtifact(thread, {
			id: INDEED_DISPOSITION_RECEIPT_ID,
			kind: 'indeed_disposition_receipt',
			title:
				update.syncState === 'sync_error'
					? 'Indeed disposition sync failed'
					: 'Indeed disposition recorded',
			summary: update.note,
			createdAt: update.recordedAt,
			status: update.syncState === 'sync_error' ? 'blocked' : 'ready',
			source: 'indeed mcp'
		});
	});
}

export function bookThreadAppointment(sessionId: string, threadId: string, slotId: string) {
	updateThread(sessionId, threadId, (thread) => {
		const booking = bookRecruiterReview(thread, slotId);
		if (!booking) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Booked recruiter review for ${formatRecruiterSlot(booking.slot)}.`
		);
		appendAssistantMessage(
			thread,
			`${thread.matching?.recruiterName ?? 'The recruiter'} is booked for ${formatRecruiterSlot(
				booking.slot
			)}. ${getNurseGuidance(thread).chatReply}`,
			[booking.artifactId, SHORTLIST_ARTIFACT_ID, snapshotId]
		);
	});
}

export function completeThreadReview(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		const completion = completeRecruiterReview(thread);
		if (!completion) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Queued staffing handoff for ${completion.primaryMatch.roleTitle} after recruiter review.`
		);
		appendAssistantMessage(
			thread,
			`Recruiter review is complete. ${getNurseGuidance(thread).chatReply}`,
			[
				SHORTLIST_ARTIFACT_ID,
				APPOINTMENT_ARTIFACT_ID,
				REVIEW_SUMMARY_ARTIFACT_ID,
				STAFFING_HANDOFF_ARTIFACT_ID,
				snapshotId
			]
		);
	});
}

export function startThreadStaffingOutreach(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		const queueUpdate = startStaffingOutreach(thread);
		if (!queueUpdate) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Started staffing outreach for ${queueUpdate.roleTitle} at ${queueUpdate.facility}.`
		);
		appendAssistantMessage(
			thread,
			getNurseGuidance(thread).chatReply,
			[STAFFING_HANDOFF_ARTIFACT_ID, STAFFING_OUTREACH_ARTIFACT_ID, snapshotId]
		);
	});
}

export function submitThreadToFacility(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		const submission = submitStaffingPacket(thread);
		if (!submission) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Submitted ${submission.roleTitle} at ${submission.facility} to the facility lane.`
		);
		appendAssistantMessage(
			thread,
			getNurseGuidance(thread).chatReply,
			[STAFFING_HANDOFF_ARTIFACT_ID, FACILITY_SUBMISSION_ARTIFACT_ID, snapshotId]
		);
	});
}

export function recordThreadFacilityInterview(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		const response = recordFacilityInterview(thread);
		if (!response) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Recorded facility interview request for ${response.roleTitle} at ${response.facility}.`
		);
		appendAssistantMessage(
			thread,
			getNurseGuidance(thread).chatReply,
			[STAFFING_HANDOFF_ARTIFACT_ID, FACILITY_RESPONSE_ARTIFACT_ID, snapshotId]
		);
	});
}

export function confirmThreadPlacement(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		const placement = confirmPlacement(thread);
		if (!placement) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Confirmed placement for ${placement.roleTitle} at ${placement.facility}.`
		);
		appendAssistantMessage(
			thread,
			getNurseGuidance(thread).chatReply,
			[
				STAFFING_HANDOFF_ARTIFACT_ID,
				FACILITY_RESPONSE_ARTIFACT_ID,
				PLACEMENT_CONFIRMATION_ARTIFACT_ID,
				snapshotId
			]
		);
	});
}

export function closeThreadStaffingRequest(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		const closure = closeStaffingRequest(thread);
		if (!closure) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Recorded closure for ${closure.roleTitle} at ${closure.facility}.`
		);
		appendAssistantMessage(
			thread,
			getNurseGuidance(thread).chatReply,
			[STAFFING_HANDOFF_ARTIFACT_ID, STAFFING_CLOSURE_ARTIFACT_ID, snapshotId]
		);
	});
}

export function startThreadOnboarding(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		const onboarding = startOnboarding(thread);
		if (!onboarding) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Started onboarding handoff for ${onboarding.roleTitle} at ${onboarding.facility}.`
		);
		appendAssistantMessage(
			thread,
			getNurseGuidance(thread).chatReply,
			[ONBOARDING_HANDOFF_ARTIFACT_ID, PLACEMENT_CONFIRMATION_ARTIFACT_ID, snapshotId]
		);
	});
}

export function completeThreadOnboarding(sessionId: string, threadId: string) {
	updateThread(sessionId, threadId, (thread) => {
		const completion = completeOnboarding(thread);
		if (!completion) {
			return;
		}

		const snapshotId = updateProfileSnapshot(
			thread,
			`Completed onboarding for ${completion.roleTitle} at ${completion.facility}.`
		);
		appendAssistantMessage(
			thread,
			getNurseGuidance(thread).chatReply,
			[
				ONBOARDING_HANDOFF_ARTIFACT_ID,
				ONBOARDING_COMPLETION_ARTIFACT_ID,
				PLACEMENT_CONFIRMATION_ARTIFACT_ID,
				snapshotId
			]
		);
	});
}

export function sendPrototypeMessage(
	sessionId: string,
	threadId: string,
	body: string,
	options?: {
		recoveredLocationResolution?: PreferredLocationResolution | null;
		locationClarificationNeeded?: boolean;
	}
) {
	const trimmedBody = body.trim();
	if (!trimmedBody) {
		return;
	}

	updateThread(sessionId, threadId, (thread) => {
		appendUserMessage(thread, trimmedBody);

		const lowerBody = trimmedBody.toLowerCase();
		const compactLicenseFollowUp = applyCompactLicenseFollowUp(thread, lowerBody);
		const extractedLabels = extractFieldsFromMessage(thread, trimmedBody, {
			recoveredLocationResolution: options?.recoveredLocationResolution
		});
		const appliedActions: string[] = [];
		const evidence: string[] = [];

		if (compactLicenseFollowUp) {
			appliedActions.push(compactLicenseFollowUp.actionLabel);
			evidence.push(
				updateProfileSnapshot(thread, compactLicenseFollowUp.snapshotSummary)
			);
		}

		if (extractedLabels.length > 0) {
			appliedActions.push(`captured ${formatLabelList(extractedLabels)} from the conversation`);
			evidence.push(
				updateProfileSnapshot(
					thread,
					`Updated the progressive profile from chat with ${formatLabelList(extractedLabels)}.`
				)
			);
		}

		if (!compactLicenseFollowUp && getRejectedConfirmableFields(thread).length > 0) {
			reopenRejectedFields(thread, trimmedBody);
			appliedActions.push('reopened the rejected preference fields for follow-up');
			evidence.push(updateProfileSnapshot(thread, 'Reopened rejected preference fields after user follow-up.'));
		}

		if (
			!compactLicenseFollowUp &&
			matchesConfirmationCue(lowerBody) &&
			getConfirmableFields(thread).length > 0
		) {
			const confirmedFields = confirmFields(
				thread,
				getConfirmableFields(thread).map((field) => field.key)
			);

			if (confirmedFields.length > 0) {
				appliedActions.push(`confirmed ${confirmedFields.length} profile field${confirmedFields.length === 1 ? '' : 's'}`);
				evidence.push(
					updateProfileSnapshot(
						thread,
						`Confirmed ${confirmedFields.length} preference field${confirmedFields.length === 1 ? '' : 's'} from the composer.`
					)
				);
			}
		}

		if (matchesConsentCue(lowerBody) && needsConsent(thread)) {
			evidence.push(captureConsent(thread));
			appliedActions.push('captured background-check consent');
			evidence.push(updateProfileSnapshot(thread, 'Captured consent from the composer.'));
		}

		if (matchesReconnectCue(lowerBody) && needsToolReconnect(thread)) {
			resolveReconnect(thread);
			appliedActions.push('cleared the credentialing reconnect hold');
			evidence.push(TOOL_ACTION_ID, updateProfileSnapshot(thread, 'Resolved the reconnect blocker from the composer.'));
		}

		refreshThread(thread);
		const assistantBody = composeAssistantReply(thread, appliedActions, {
			locationClarificationNeeded: options?.locationClarificationNeeded === true
		});
		appendAssistantMessage(thread, assistantBody, uniqueStrings(evidence));
	});
}

function createInitialThreads(seedMode: ConciergeSessionSeedMode = 'demo') {
	if (seedMode === 'empty') {
		return [];
	}

	return structuredClone(seedThreads).map((thread) => refreshThread(thread));
}

function getSessionThreads(sessionId: string) {
	pruneInactiveSessions();
	const existingThreads = threadsBySession.get(sessionId);
	if (existingThreads) {
		touchSession(sessionId);
		return existingThreads;
	}

	const initialThreads = createInitialThreads('empty');
	threadsBySession.set(sessionId, initialThreads);
	touchSession(sessionId);
	return initialThreads;
}

function orderThreads(threads: ConciergeThread[]) {
	return [...threads].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function buildThreadView(thread: ConciergeThread): ThreadViewState {
	const widgets = splitWidgetsByPlacement(thread);

	return {
		thread,
		nextStep: determineNextStep(thread),
		profileAudit: buildProfileAudit(thread.profile),
		inlineWidgets: widgets.inline,
		railWidgets: widgets.rail,
		handoffPacket: createHandoffPacket(thread),
		hasHandoff: hasHandoffPacket(thread)
	};
}

function updateThread(sessionId: string, threadId: string, mutator: (thread: ConciergeThread) => void) {
	const nextThreads = getSessionThreads(sessionId).map((thread) => {
		if (thread.id !== threadId) {
			return thread;
		}

		const draft = structuredClone(thread);
		mutator(draft);
		refreshThread(draft);
		return draft;
	});

	threadsBySession.set(sessionId, nextThreads);
	touchSession(sessionId);
}

function pruneInactiveSessions(now = Date.now()) {
	for (const [sessionId, lastAccessAt] of sessionAccessTimes) {
		if (now - lastAccessAt <= SESSION_IDLE_TTL_MS) {
			continue;
		}

		sessionAccessTimes.delete(sessionId);
		threadsBySession.delete(sessionId);
	}

	if (threadsBySession.size <= MAX_IN_MEMORY_SESSIONS) {
		return;
	}

	const oldestSessions = [...sessionAccessTimes.entries()].sort((left, right) => left[1] - right[1]);
	for (const [sessionId] of oldestSessions) {
		if (threadsBySession.size <= MAX_IN_MEMORY_SESSIONS) {
			break;
		}

		sessionAccessTimes.delete(sessionId);
		threadsBySession.delete(sessionId);
	}
}

function touchSession(sessionId: string) {
	const now = Date.now();
	sessionAccessTimes.set(sessionId, now);
	pruneInactiveSessions(now);
}

function buildBlankThread(): ConciergeThread {
	const timestamp = createTimestamp();
	const threadId = `nurse-intake-${Date.now().toString(36)}`;

	return {
		id: threadId,
		title: 'New nurse application',
		subtitle: 'Tell Concierge what role you want',
		userName: 'New nurse candidate',
		updatedAt: timestamp,
		status: 'awaiting_user',
		pendingAction: 'Start with specialty, preferred shift, and location.',
		badges: ['Guided chat', 'New application'],
		messages: [
			{
				id: createMessageId('assistant'),
				role: 'assistant',
				author: 'Concierge',
				body:
					"I'll guide this step by step here in chat. Start by telling me your specialty, preferred shift, and where you want to work. When I need a file or confirmation, I'll ask for it directly in this thread.",
				createdAt: timestamp
			}
		],
		widgets: [],
		profile: {
			completion: 0,
			confirmedCount: 0,
			inferredCount: 0,
			candidateCount: 0,
			missingRequired: [],
			blockers: [],
			fields: []
		},
		artifacts: [],
		turn: {
			stage: 'idle',
			summary: 'The application is waiting for the first message.',
			blockers: [],
			nextActionLabel: 'Start intake',
			policyRef: POLICY_REF
		},
		connectedTools: [
			{
				name: 'Credentialing Hub',
				status: 'connected',
				note: 'Ready for live verification once credential review begins.'
			},
			{
				name: 'Staffing CRM',
				status: 'connected',
				note: 'Ready for writeback once the nurse profile is confirmed.'
			},
			{
				name: 'SMS Alerts',
				status: 'connected',
				note: 'Candidate can receive shortlist updates when matching unlocks.'
			}
		],
		integrationRefs: undefined
	};
}

function buildClaimedThread(seed: IntakeClaimThreadSeed): ConciergeThread {
	const thread = buildBlankThread();
	const importedAt = normalizeImportedTimestamp(seed.importedAt);
	const applicantName = seed.applicant.name?.trim() || 'Indeed applicant';

	thread.id = buildClaimedThreadId(seed);
	thread.title = 'Continue your application';
	thread.subtitle = seed.application.roleTitle
		? `Imported from Indeed Apply for ${seed.application.roleTitle}`
		: 'Imported from Indeed Apply';
	thread.userName = applicantName;
	thread.updatedAt = importedAt;
	thread.badges = ['Indeed Apply', 'Imported application'];
	thread.messages = [];
	thread.artifacts = [];
	thread.widgets = [];
	thread.profile.fields = [];
	thread.matching = undefined;
	thread.handoff = undefined;
	const importedDocumentIds = attachImportedClaimDocuments(thread, seed.documents ?? [], importedAt);
	thread.integrationRefs = {
		indeed: {
			source: 'indeed_apply',
			localApplicationId: seed.application.localApplicationId?.trim() || undefined,
			localJobId: seed.application.localJobId?.trim() || undefined,
			referenceNumber: seed.application.referenceNumber?.trim() || undefined,
			indeedApplyId: seed.application.indeedApplyId.trim(),
			applicantEmail: seed.applicant.email?.trim() || undefined,
			applicantPhone: seed.applicant.phone?.trim() || undefined,
			resumeArtifactRef: importedDocumentIds.includes(DOCUMENT_ARTIFACT_IDS.resume_pdf)
				? DOCUMENT_ARTIFACT_IDS.resume_pdf
				: null,
			dispositionSyncState: 'claimed_in_abundance',
			webhookReceivedAt: importedAt,
			claimedAt: importedAt,
			lastSyncedAt: importedAt
		}
	};

	seedImportedProfileFields(thread, seed, importedAt, importedDocumentIds);
	ensurePendingConsentField(thread, importedAt);
	upsertArtifact(thread, createIndeedApplicationReceipt(seed, importedAt));
	const snapshotId = updateProfileSnapshot(
		thread,
		'Imported the Indeed Apply submission and prepared the next guided intake step.'
	);
	refreshThread(thread);

	thread.messages = [
		{
			id: createMessageId('assistant'),
			role: 'assistant',
			author: 'Concierge',
			body: composeClaimImportMessage(thread, seed, importedDocumentIds),
			createdAt: importedAt,
			evidence: uniqueStrings([
				INDEED_APPLICATION_RECEIPT_ID,
				snapshotId,
				...importedDocumentIds
			])
		}
	];
	thread.updatedAt = importedAt;
	return refreshThread(thread);
}

function buildClaimedThreadId(seed: IntakeClaimThreadSeed) {
	const stableSuffix = seed.application.indeedApplyId
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);

	return stableSuffix ? `indeed-${stableSuffix}` : `indeed-${Date.now().toString(36)}`;
}

function normalizeImportedTimestamp(value?: string) {
	if (!value) {
		return createTimestamp();
	}

	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? createTimestamp() : new Date(parsed).toISOString();
}

function seedImportedProfileFields(
	thread: ConciergeThread,
	seed: IntakeClaimThreadSeed,
	importedAt: string,
	importedDocumentIds: string[]
) {
	const resumeArtifactIds = importedDocumentIds.includes(DOCUMENT_ARTIFACT_IDS.resume_pdf)
		? [DOCUMENT_ARTIFACT_IDS.resume_pdf]
		: [];
	const compactLicenseArtifactIds = importedDocumentIds.includes(
		DOCUMENT_ARTIFACT_IDS.compact_license_image
	)
		? [DOCUMENT_ARTIFACT_IDS.compact_license_image]
		: [];

	const appendField = (
		field: Omit<ProfileFieldEvent, 'sourceMessageIds' | 'sourceArtifactIds' | 'updatedAt'> & {
			sourceArtifactIds?: string[];
			updatedAt?: string;
		}
	) => {
		upsertProfileField(thread, {
			...field,
			sourceMessageIds: [],
			sourceArtifactIds: field.sourceArtifactIds ?? [],
			updatedAt: field.updatedAt ?? importedAt
		});
	};

	const name = seed.applicant.name?.trim();
	if (name) {
		appendField({
			key: 'legal_name',
			label: 'Legal name',
			value: name,
			status: 'confirmed',
			confidence: 0.99,
			fieldClass: 'identity',
			confirmedBy: 'agent',
			note: 'Imported from Indeed Apply.'
		});
	}

	const email = seed.applicant.email?.trim();
	if (email) {
		appendField({
			key: 'primary_email',
			label: 'Primary email',
			value: email,
			status: 'confirmed',
			confidence: 0.99,
			fieldClass: 'contact',
			confirmedBy: 'agent',
			note: 'Imported from Indeed Apply.'
		});
	}

	const phone = seed.applicant.phone?.trim();
	if (phone) {
		appendField({
			key: 'primary_phone',
			label: 'Primary phone',
			value: phone,
			status: 'confirmed',
			confidence: 0.99,
			fieldClass: 'contact',
			confirmedBy: 'agent',
			note: 'Imported from Indeed Apply.'
		});
	}

	const specialty = seed.profile?.specialty?.trim();
	if (specialty) {
		appendField({
			key: 'specialty',
			label: 'Specialty',
			value: specialty,
			status: 'confirmed',
			confidence: 0.98,
			fieldClass: 'regulated',
			confirmedBy: 'agent',
			note: 'Imported from Indeed Apply screener answers.'
		});
	}

	const preferredShift = seed.profile?.preferredShift?.trim();
	if (preferredShift) {
		appendField({
			key: 'preferred_shift',
			label: 'Preferred shift',
			value: preferredShift,
			status: 'confirmed',
			confidence: 0.97,
			fieldClass: 'preference',
			confirmedBy: 'agent',
			note: 'Imported from Indeed Apply screener answers.'
		});
	}

	const preferredRegion = seed.profile?.preferredRegion?.trim();
	if (preferredRegion) {
		appendField({
			key: 'preferred_region',
			label: PREFERRED_LOCATION_LABEL,
			value: normalizePreferredLocationLabel(preferredRegion) ?? preferredRegion,
			status: 'confirmed',
			confidence: 0.95,
			fieldClass: 'preference',
			confirmedBy: 'agent',
			note: 'Imported from Indeed Apply screener answers.'
		});
	} else if (seed.application.location?.trim()) {
		const normalizedPreferredLocation =
			normalizePreferredLocationLabel(seed.application.location.trim()) ??
			seed.application.location.trim();
		appendField({
			key: 'preferred_region',
			label: PREFERRED_LOCATION_LABEL,
			value: normalizedPreferredLocation,
			status: 'candidate',
			confidence: 0.74,
			fieldClass: 'preference',
			note: 'Inferred from the Indeed Apply role location and still needs confirmation.'
		});
	}

	const compactLicense = normalizeCompactLicenseValue(seed.profile?.compactLicense);
	if (compactLicense) {
		appendField({
			key: 'compact_license',
			label: 'Compact license',
			value: compactLicense,
			status: 'confirmed',
			confidence: 0.98,
			fieldClass: 'credential',
			confirmedBy: 'agent',
			note: 'Imported from Indeed Apply screener answers.',
			sourceArtifactIds: compactLicenseArtifactIds
		});
	}

	appendField({
		key: 'indeed_apply_id',
		label: 'Indeed Apply ID',
		value: seed.application.indeedApplyId.trim(),
		status: 'confirmed',
		confidence: 1,
		fieldClass: 'external_write_key',
		confirmedBy: 'agent',
		note: 'External reference imported from Indeed Apply.'
	});

	if (seed.application.localApplicationId?.trim()) {
		appendField({
			key: 'indeed_local_application_id',
			label: 'Indeed local application ID',
			value: seed.application.localApplicationId.trim(),
			status: 'confirmed',
			confidence: 1,
			fieldClass: 'external_write_key',
			confirmedBy: 'agent',
			note: 'External reference imported from Indeed Apply.'
		});
	}

	if (seed.application.localJobId?.trim()) {
		appendField({
			key: 'indeed_local_job_id',
			label: 'Indeed local job ID',
			value: seed.application.localJobId.trim(),
			status: 'confirmed',
			confidence: 1,
			fieldClass: 'external_write_key',
			confirmedBy: 'agent',
			note: 'External reference imported from Indeed Apply.'
		});
	}

	if (seed.application.referenceNumber?.trim()) {
		appendField({
			key: 'indeed_reference_number',
			label: 'Indeed reference number',
			value: seed.application.referenceNumber.trim(),
			status: 'confirmed',
			confidence: 1,
			fieldClass: 'external_write_key',
			confirmedBy: 'agent',
			note: 'External reference imported from Indeed Apply.'
		});
	}

	if (resumeArtifactIds.length > 0) {
		const specialtyField = getProfileField(thread, 'specialty');
		if (specialtyField) {
			specialtyField.sourceArtifactIds = uniqueStrings([
				...specialtyField.sourceArtifactIds,
				...resumeArtifactIds
			]);
		}
	}
}

function attachImportedClaimDocuments(
	thread: ConciergeThread,
	documents: IntakeClaimImportedDocument[],
	importedAt: string
) {
	const artifactIds: string[] = [];

	for (const document of documents) {
		const spec = getRequiredDocumentSpecByKey(document.documentKey);
		if (!spec) {
			continue;
		}

		const artifactId = DOCUMENT_ARTIFACT_IDS[document.documentKey];
		artifactIds.push(artifactId);
		upsertArtifact(thread, {
			id: artifactId,
			kind: 'upload',
			title: spec.title,
			summary:
				document.documentKey === 'resume_pdf'
					? `Imported ${document.fileName ?? 'the resume submitted through Indeed Apply'}.`
					: `Imported ${document.fileName ?? spec.title.toLowerCase()} from Indeed Apply.`,
			createdAt: importedAt,
			status: 'ready',
			source: 'indeed apply',
			documentKey: document.documentKey,
			fileName: document.fileName,
			contentType: document.contentType,
			byteSize: document.byteSize
		});
	}

	return artifactIds;
}

function ensurePendingConsentField(thread: ConciergeThread, importedAt: string) {
	if (getProfileField(thread, 'background_check_consent')) {
		return;
	}

	upsertProfileField(thread, {
		key: 'background_check_consent',
		label: 'Background-check consent',
		value: 'Pending',
		status: 'candidate',
		confidence: 0.3,
		fieldClass: 'consent',
		sourceMessageIds: [],
		sourceArtifactIds: [],
		updatedAt: importedAt,
		note: 'Explicit consent is still required before governed staffing writes.'
	});
}

function createIndeedApplicationReceipt(seed: IntakeClaimThreadSeed, importedAt: string): ChatArtifact {
	const roleDetail = seed.application.roleTitle?.trim()
		? ` for ${seed.application.roleTitle.trim()}`
		: '';
	const referenceDetail = seed.application.referenceNumber?.trim()
		? ` Reference ${seed.application.referenceNumber.trim()}.`
		: '';

	return {
		id: INDEED_APPLICATION_RECEIPT_ID,
		kind: 'indeed_application_receipt',
		title: 'Indeed application imported',
		summary: `Imported your Indeed Apply submission${roleDetail}.${referenceDetail}`.replace(
			/\.\s*\./g,
			'. '
		).trim(),
		createdAt: importedAt,
		status: 'ready',
		source: 'indeed apply'
	};
}

function composeClaimImportMessage(
	thread: ConciergeThread,
	seed: IntakeClaimThreadSeed,
	importedDocumentIds: string[]
) {
	const importedResume = importedDocumentIds.includes(DOCUMENT_ARTIFACT_IDS.resume_pdf);
	const roleDetail = seed.application.roleTitle?.trim()
		? ` for ${seed.application.roleTitle.trim()}`
		: '';
	const importedResumeDetail = importedResume
		? ' and the resume you submitted there'
		: '';

	return `I imported your Indeed application${roleDetail}${importedResumeDetail}. We can continue here in chat, and I will only ask for what is still missing. ${getNurseGuidance(thread).chatReply}`;
}

function normalizeCompactLicenseValue(value?: string) {
	const trimmed = value?.trim();
	if (!trimmed) {
		return null;
	}

	const lowerValue = trimmed.toLowerCase();
	if (/\b(active|yes|compact)\b/.test(lowerValue)) {
		return 'Active';
	}

	if (/\b(no|inactive|not active|not compact)\b/.test(lowerValue)) {
		return 'Not active';
	}

	return trimmed;
}

function refreshThread(thread: ConciergeThread) {
	thread.turn.policyRef ||= POLICY_REF;
	refreshProfileCounts(thread);

	if (thread.handoff) {
		refreshHandoffThread(thread);
		return thread;
	}

	refreshPrototypeIntakeThread(thread);
	return thread;
}

function clearMatchingProgress(thread: ConciergeThread) {
	thread.matching = undefined;
	thread.artifacts = thread.artifacts.filter((artifact) => !MATCHING_ARTIFACT_IDS.has(artifact.id));
}

function extractFieldsFromMessage(
	thread: ConciergeThread,
	body: string,
	options?: {
		recoveredLocationResolution?: PreferredLocationResolution | null;
	}
) {
	const lowerBody = body.toLowerCase();
	const messageId = thread.messages.at(-1)?.id;
	const sourceMessageIds = messageId ? [messageId] : [];
	const extractedLabels: string[] = [];

	const specialty =
		extractSpecialty(lowerBody) ??
		(lowerBody.includes('nurse') ? 'Travel nurse' : null);

	if (specialty) {
		if (
			upsertProfileField(thread, {
				key: 'specialty',
				label: 'Specialty',
				value: specialty,
				status: 'confirmed',
				confidence: 0.97,
				fieldClass: 'regulated',
				sourceMessageIds,
				sourceArtifactIds: [],
				updatedAt: createTimestamp(),
				confirmedBy: 'user'
			})
		) {
			extractedLabels.push('specialty');
		}
	}

	const preferredShift = extractPreferredShift(lowerBody);
	if (preferredShift) {
		if (
			upsertProfileField(thread, {
				key: 'preferred_shift',
				label: 'Preferred shift',
				value: preferredShift,
				status: 'inferred',
				confidence: 0.92,
				fieldClass: 'preference',
				sourceMessageIds,
				sourceArtifactIds: [],
				updatedAt: createTimestamp(),
				note: 'Derived from the latest application message.'
			})
		) {
			extractedLabels.push('preferred shift');
		}
	}

	const preferredRegion =
		resolvePreferredLocation(body, {
			requestedByPrompt: isPreferredLocationFollowUpPrompt(getLatestAssistantPrompt(thread)?.body),
			currentValue: getProfileField(thread, 'preferred_region')?.value
		}) ?? options?.recoveredLocationResolution ?? null;
	if (preferredRegion) {
		if (
			upsertProfileField(thread, {
				key: 'preferred_region',
				label: PREFERRED_LOCATION_LABEL,
				value: preferredRegion.value,
				status: preferredRegion.status,
				confidence: preferredRegion.confidence,
				fieldClass: 'preference',
				sourceMessageIds,
				sourceArtifactIds: [],
				updatedAt: createTimestamp(),
				confirmedBy: preferredRegion.confirmedBy,
				note: preferredRegion.note
			})
		) {
			extractedLabels.push(`preferred location as ${preferredRegion.value}`);
		}
	}

	const contractStart = extractContractStart(lowerBody);
	if (contractStart) {
		if (
			upsertProfileField(thread, {
				key: 'contract_start',
				label: 'Contract start',
				value: contractStart,
				status: 'candidate',
				confidence: 0.82,
				fieldClass: 'preference',
				sourceMessageIds,
				sourceArtifactIds: [],
				updatedAt: createTimestamp(),
				note: 'Month captured, but the exact start date still needs confirmation.'
			})
		) {
			extractedLabels.push('start timing');
		}
	}

	if (lowerBody.includes('compact license')) {
		if (
			upsertProfileField(thread, {
				key: 'compact_license',
				label: 'Compact license',
				value: 'Active',
				status: 'confirmed',
				confidence: 0.93,
				fieldClass: 'credential',
				sourceMessageIds,
				sourceArtifactIds: [],
				updatedAt: createTimestamp(),
				confirmedBy: 'user'
			})
		) {
			extractedLabels.push('compact license');
		}
	}

	if (!getProfileField(thread, 'background_check_consent') && extractedLabels.length > 0) {
		upsertProfileField(thread, {
			key: 'background_check_consent',
			label: 'Background-check consent',
			value: 'Pending',
			status: 'candidate',
			confidence: 0.3,
			fieldClass: 'consent',
			sourceMessageIds: [],
			sourceArtifactIds: [],
			updatedAt: createTimestamp(),
			note: 'Explicit user confirmation required before external writes.'
		});
	}

	return extractedLabels;
}

function upsertProfileField(thread: ConciergeThread, field: ProfileFieldEvent) {
	const existingField = getProfileField(thread, field.key);

	if (!existingField) {
		thread.profile.fields = [...thread.profile.fields, field];
		return true;
	}

	if (existingField.status === 'confirmed' && field.status !== 'confirmed') {
		return false;
	}

	if (existingField.value === field.value && existingField.status === field.status) {
		existingField.sourceMessageIds = uniqueStrings([
			...existingField.sourceMessageIds,
			...field.sourceMessageIds
		]);
		existingField.updatedAt = field.updatedAt;
		existingField.note = field.note ?? existingField.note;
		return false;
	}

	Object.assign(existingField, {
		...field,
		sourceMessageIds: uniqueStrings([...existingField.sourceMessageIds, ...field.sourceMessageIds]),
		sourceArtifactIds: uniqueStrings([...existingField.sourceArtifactIds, ...field.sourceArtifactIds]),
		confirmedBy: field.confirmedBy ?? existingField.confirmedBy
	});

	return true;
}

function refreshProfileCounts(thread: ConciergeThread) {
	thread.profile.confirmedCount = thread.profile.fields.filter((field) => field.status === 'confirmed').length;
	thread.profile.inferredCount = thread.profile.fields.filter((field) => field.status === 'inferred').length;
	thread.profile.candidateCount = thread.profile.fields.filter((field) => field.status === 'candidate').length;
}

function refreshHandoffThread(thread: ConciergeThread) {
	switch (thread.handoff?.kind) {
		case 'staffing_queue':
			refreshStaffingHandoffThread(thread);
			return;
		case 'onboarding_queue':
			refreshOnboardingHandoffThread(thread);
			return;
		default:
			refreshEscalationHandoffThread(thread);
	}
}

function createHandoffWidget(
	thread: ConciergeThread,
	title: string,
	tone: 'danger' | 'good',
	statusLabel: string,
	actionLabel: string
): ConciergeWidget {
	return {
		id: 'widget-handoff',
		type: 'handoff',
		title,
		placement: 'inline',
		priority: 10,
		data: {
			kind: thread.handoff?.kind ?? 'escalation',
			tone,
			statusLabel,
			queueName: thread.handoff?.queueName ?? 'Nurse credentialing review',
			eta: thread.handoff?.eta ?? '12 minutes',
			reasonCodes:
				thread.handoff?.reasonCodes ?? ['conflicting_evidence', 'regulated_field', 'external_write_blocked'],
			summary:
				thread.handoff?.summary ??
				(tone === 'danger'
					? 'A recruiter will compare the uploaded image with portal records before any downstream write occurs.'
					: 'Recruiter review is complete and the packet is ready for downstream operations.'),
			actionLabel
		}
	};
}

function createHandoffProfileWidget(thread: ConciergeThread, nextPrompt: string): ConciergeWidget {
	return {
		id: 'widget-profile-progress',
		type: 'profile_progress',
		title: 'Profile Progress',
		placement: 'rail',
		priority: 20,
		data: {
			completion: thread.profile.completion,
			confirmedCount: thread.profile.confirmedCount,
			inferredCount: thread.profile.inferredCount,
			missingFields: thread.profile.missingRequired,
			nextPrompt
		}
	};
}

function refreshEscalationHandoffThread(thread: ConciergeThread) {
	thread.status = 'handoff_ready';
	thread.pendingAction = 'Human review required before external write.';
	thread.badges = ['Escalated', 'Human handoff'];
	thread.turn.stage = 'handoff_ready';
	thread.turn.summary =
		thread.handoff?.summary ??
		'The workflow is blocked on a regulated field conflict and has been queued for human review.';
	thread.turn.blockers = ['Do not write license data until reviewed.'];
	thread.turn.nextActionLabel = determineNextStep(thread).label;
	thread.widgets = [
		createHandoffWidget(thread, 'Human review queued', 'danger', 'Review queued', 'Open handoff packet'),
		createHandoffProfileWidget(thread, 'Awaiting operator review before submission.')
	];
}

function refreshStaffingHandoffThread(thread: ConciergeThread) {
	const queueStatus = thread.handoff?.queueStatus ?? 'queued';

	thread.connectedTools = thread.connectedTools.map((tool) => {
		if (tool.name === 'Credentialing Hub') {
			return {
				...tool,
				status: 'connected',
				note: getCredentialingHubNote(queueStatus),
				actionHref: undefined
			};
		}

		if (tool.name === 'Staffing CRM') {
			return {
				...tool,
				status: getStaffingCrmStatus(queueStatus),
				note: getStaffingCrmNote(queueStatus),
				actionHref: undefined
			};
		}

		if (tool.name === 'SMS Alerts') {
			return {
				...tool,
				status: getSmsAlertsStatus(queueStatus),
				note: getSmsAlertsNote(queueStatus),
				actionHref: undefined
			};
		}

		return tool;
	});

	thread.status = 'active';
	thread.pendingAction = getStaffingPendingAction(queueStatus);
	thread.badges = getStaffingBadges(queueStatus);
	thread.turn.stage = 'idle';
	thread.turn.summary =
		thread.handoff?.summary ??
		'Recruiter review is complete and the governed staffing packet is queued for downstream coordination.';
	thread.turn.blockers = [];
	thread.turn.nextActionLabel = determineNextStep(thread).label;
	thread.widgets = [
		createHandoffWidget(
			thread,
			getStaffingHandoffTitle(queueStatus),
			'good',
			getStaffingQueueStatusLabel(queueStatus),
			'Open staffing packet'
		),
		buildStaffingQueueWidget(thread),
		createHandoffProfileWidget(thread, getStaffingProfilePrompt(queueStatus))
	];

	if (shouldShowFacilityResponseWidget(queueStatus)) {
		thread.widgets.splice(2, 0, buildFacilityResponseWidget(thread));
	}

	if (shouldShowOnboardingQueueWidget(thread)) {
		thread.widgets.splice(thread.widgets.length - 1, 0, buildOnboardingQueueWidget(thread));
	}
}

function refreshOnboardingHandoffThread(thread: ConciergeThread) {
	const onboardingStatus = thread.handoff?.onboardingStatus ?? 'queued';

	thread.connectedTools = thread.connectedTools.map((tool) => {
		if (tool.name === 'Credentialing Hub') {
			return {
				...tool,
				status: 'connected',
				note: getOnboardingCredentialingHubNote(onboardingStatus),
				actionHref: undefined
			};
		}

		if (tool.name === 'Staffing CRM') {
			return {
				...tool,
				status: 'connected',
				note: getOnboardingStaffingCrmNote(onboardingStatus),
				actionHref: undefined
			};
		}

		if (tool.name === 'SMS Alerts') {
			return {
				...tool,
				status: getOnboardingSmsAlertsStatus(onboardingStatus),
				note: getOnboardingSmsAlertsNote(onboardingStatus),
				actionHref: undefined
			};
		}

		return tool;
	});

	thread.status = 'active';
	thread.pendingAction = getOnboardingPendingAction(onboardingStatus);
	thread.badges = getOnboardingBadges(onboardingStatus);
	thread.turn.stage = 'idle';
	thread.turn.summary =
		thread.handoff?.summary ??
		'Placement is confirmed and the onboarding packet is active for launch operations.';
	thread.turn.blockers = [];
	thread.turn.nextActionLabel = determineNextStep(thread).label;
	thread.widgets = [
		createHandoffWidget(
			thread,
			getOnboardingHandoffTitle(onboardingStatus),
			'good',
			getOnboardingStatusLabel(onboardingStatus),
			'Open onboarding packet'
		),
		buildOnboardingQueueWidget(thread),
		createHandoffProfileWidget(thread, getOnboardingProfilePrompt(onboardingStatus))
	];
}

function getOnboardingCredentialingHubNote(status: OnboardingQueueStatus) {
	return status === 'completed'
		? 'Compliance evidence is archived with the completed onboarding packet.'
		: 'Compliance evidence is attached to the active onboarding packet.';
}

function getOnboardingStaffingCrmNote(status: OnboardingQueueStatus) {
	return status === 'completed'
		? 'Candidate is cleared to start and onboarding is complete.'
		: 'Placement is routed into onboarding launch operations.';
}

function getOnboardingSmsAlertsStatus(status: OnboardingQueueStatus): 'connected' | 'queued' {
	return status === 'completed' ? 'connected' : 'queued';
}

function getOnboardingSmsAlertsNote(status: OnboardingQueueStatus) {
	return status === 'completed'
		? 'Start confirmation is ready to send to the candidate.'
		: 'Offer and orientation updates are queued from onboarding.';
}

function getOnboardingPendingAction(status: OnboardingQueueStatus) {
	switch (status) {
		case 'completed':
			return 'Onboarding is complete and the candidate is ready to start.';
		case 'in_progress':
			return 'Onboarding launch tasks are in progress.';
		default:
			return 'Onboarding is queued to begin.';
	}
}

function getOnboardingBadges(status: OnboardingQueueStatus) {
	switch (status) {
		case 'completed':
			return ['Onboarding complete', 'Start ready'];
		case 'in_progress':
			return ['Onboarding active', 'Launch packet'];
		default:
			return ['Onboarding queued', 'Placement confirmed'];
	}
}

function getOnboardingHandoffTitle(status: OnboardingQueueStatus) {
	switch (status) {
		case 'completed':
			return 'Onboarding complete';
		case 'in_progress':
			return 'Onboarding in progress';
		default:
			return 'Onboarding queued';
	}
}

function getOnboardingProfilePrompt(status: OnboardingQueueStatus) {
	switch (status) {
		case 'completed':
			return 'Candidate is cleared to start and the onboarding packet is complete.';
		case 'in_progress':
			return 'Finish compliance and orientation steps to complete onboarding.';
		default:
			return 'Start the onboarding handoff from the confirmed placement packet.';
	}
}

function getCredentialingHubNote(status: StaffingQueueStatus) {
	switch (status) {
		case 'outreach_started':
			return 'Verification evidence stays attached while coordinator outreach is active.';
		case 'submitted':
			return 'Verification evidence is archived with the submitted staffing packet.';
		case 'interview_requested':
			return 'Verification evidence is available while interview coordination proceeds.';
		case 'placement_confirmed':
			return 'Verification evidence is approved for onboarding handoff.';
		case 'closed':
			return 'Verification evidence is archived with the closed staffing trail.';
		default:
			return 'Verification evidence is attached to the queued staffing packet.';
	}
}

function getStaffingCrmStatus(status: StaffingQueueStatus): 'connected' | 'queued' {
	return status === 'queued' || status === 'outreach_started' ? 'queued' : 'connected';
}

function getStaffingCrmNote(status: StaffingQueueStatus) {
	switch (status) {
		case 'outreach_started':
			return 'Coordinator outreach is active and facility submission is next.';
		case 'submitted':
			return 'Facility submission is recorded and waiting on response.';
		case 'interview_requested':
			return 'Facility interview requested. Awaiting final placement outcome.';
		case 'placement_confirmed':
			return 'Placement confirmed. Ready for onboarding handoff.';
		case 'closed':
			return 'Facility request closed. Matching can reopen if needed.';
		default:
			return 'Governed staffing packet is queued for coordinator import.';
	}
}

function getSmsAlertsStatus(status: StaffingQueueStatus): 'connected' | 'queued' {
	return status === 'outreach_started' ? 'queued' : 'connected';
}

function getSmsAlertsNote(status: StaffingQueueStatus) {
	switch (status) {
		case 'outreach_started':
			return 'Candidate outreach update is queued from staffing operations.';
		case 'submitted':
			return 'Ready to send facility-response updates when they arrive.';
		case 'interview_requested':
			return 'Interview request can be sent from the governed thread.';
		case 'placement_confirmed':
			return 'Placement confirmation is ready to send to the candidate.';
		case 'closed':
			return 'Closure update is ready to send to the candidate.';
		default:
			return 'Ready to send staffing outreach updates once the packet is picked up.';
	}
}

function getStaffingPendingAction(status: StaffingQueueStatus) {
	switch (status) {
		case 'outreach_started':
			return 'Staffing coordinator outreach is in progress.';
		case 'submitted':
			return 'Facility submission is waiting on response.';
		case 'interview_requested':
			return 'Facility interview request is recorded and awaiting final outcome.';
		case 'placement_confirmed':
			return 'Placement is confirmed and ready for onboarding handoff.';
		case 'closed':
			return 'This staffing request is closed.';
		default:
			return 'Staffing handoff packet is queued for coordinator outreach.';
	}
}

function getStaffingBadges(status: StaffingQueueStatus) {
	switch (status) {
		case 'outreach_started':
			return ['Outreach active', 'Coordinator assigned'];
		case 'submitted':
			return ['Submitted', 'Facility pending'];
		case 'interview_requested':
			return ['Interview requested', 'Outcome pending'];
		case 'placement_confirmed':
			return ['Placement confirmed', 'Onboarding ready'];
		case 'closed':
			return ['Request closed', 'Matching can reopen'];
		default:
			return ['Review complete', 'Staffing handoff'];
	}
}

function getStaffingHandoffTitle(status: StaffingQueueStatus) {
	switch (status) {
		case 'outreach_started':
			return 'Staffing outreach active';
		case 'submitted':
			return 'Facility submission recorded';
		case 'interview_requested':
			return 'Facility interview requested';
		case 'placement_confirmed':
			return 'Placement confirmed';
		case 'closed':
			return 'Staffing request closed';
		default:
			return 'Staffing packet queued';
	}
}

function getStaffingProfilePrompt(status: StaffingQueueStatus) {
	switch (status) {
		case 'outreach_started':
			return 'Coordinator outreach is active and facility submission is next.';
		case 'submitted':
			return 'Record the facility response once it arrives.';
		case 'interview_requested':
			return 'Interview is requested. Confirm the final placement outcome next.';
		case 'placement_confirmed':
			return 'Placement is confirmed and ready for onboarding.';
		case 'closed':
			return 'This staffing request closed. Reopen matching only if the candidate wants another role.';
		default:
			return 'Packet is ready for staffing coordinator pickup.';
	}
}

function shouldShowFacilityResponseWidget(status: StaffingQueueStatus) {
	return (
		status === 'submitted' ||
		status === 'interview_requested' ||
		status === 'placement_confirmed' ||
		status === 'closed'
	);
}

function shouldShowOnboardingQueueWidget(thread: ConciergeThread) {
	if (thread.handoff?.kind === 'onboarding_queue') {
		return true;
	}

	return (
		thread.handoff?.kind === 'staffing_queue' &&
		(thread.handoff.queueStatus ?? 'queued') === 'placement_confirmed'
	);
}

function refreshPrototypeIntakeThread(thread: ConciergeThread) {
	const intakeStarted = hasStartedIntake(thread);
	const intakeDataReady = hasCollectedIntakeData(thread);
	const confirmableFields = getConfirmableFields(thread);
	const rejectedFields = getRejectedConfirmableFields(thread);
	const uploadPending = needsDocumentUpload(thread);
	const consentPending = needsConsent(thread);
	const reconnectPending = needsToolReconnect(thread);

	if (
		thread.matching &&
		(!intakeDataReady ||
			rejectedFields.length > 0 ||
			confirmableFields.length > 0 ||
			uploadPending ||
			consentPending ||
			reconnectPending)
	) {
		clearMatchingProgress(thread);
	}

	const readyForMatching = isMatchingReady(thread);
	const matchingState = readyForMatching ? ensureMatchingOutcome(thread) : undefined;

	thread.connectedTools = thread.connectedTools.map((tool) => {
		if (tool.name === 'Credentialing Hub') {
			return reconnectPending
				? {
						...tool,
						status: 'action_required',
						note: 'Reconnect required before the next verification call.',
						actionHref: buildControlPlaneBridgeHref('mcp-access', {
							threadId: thread.id,
							tool: 'credentialing-hub'
						})
					}
				: {
						...tool,
						status: 'connected',
						note: 'Connected and ready for live verification.',
						actionHref: undefined
					};
		}

		if (tool.name === 'Staffing CRM') {
			return {
				...tool,
				status: 'connected',
				note: consentPending
					? 'Ready for writeback after consent.'
					: matchingState?.status === 'booked'
						? 'Shortlist synced and recruiter review is booked.'
						: matchingState
							? 'Shortlist is staged for recruiter review.'
							: 'Ready for writeback when matching is triggered.',
				actionHref: undefined
			};
		}

		if (tool.name === 'SMS Alerts') {
			return {
				...tool,
				status: 'connected',
				note:
					matchingState?.status === 'booked'
						? 'Candidate can receive the recruiter review confirmation immediately.'
						: readyForMatching
							? 'Candidate can receive shortlist updates as soon as matching runs.'
							: 'Candidate can receive shortlist updates once matching unlocks.',
				actionHref: undefined
			};
		}

		return tool;
	});

	thread.status = readyForMatching || intakeStarted ? 'active' : 'awaiting_user';
	thread.badges = [
		'AI-native concierge',
		...(intakeStarted && !intakeDataReady ? ['Needs intake details'] : []),
		...(consentPending ? ['Needs consent'] : []),
		...(reconnectPending ? ['Tool reconnect'] : []),
		...(matchingState?.status === 'booked'
			? ['Review booked']
			: matchingState
				? ['Shortlist ready']
				: readyForMatching
					? ['Ready for matching']
					: [])
	];
	thread.pendingAction = getPendingAction(
		thread,
		confirmableFields,
		rejectedFields,
		uploadPending,
		consentPending,
		reconnectPending,
		readyForMatching,
		matchingState
	);
	thread.profile.missingRequired = getMissingRequirements(
		thread,
		confirmableFields,
		rejectedFields,
		uploadPending,
		consentPending,
		reconnectPending
	);
	thread.profile.blockers = getProfileBlockers(
		thread,
		confirmableFields,
		rejectedFields,
		uploadPending,
		consentPending,
		reconnectPending
	);
	thread.profile.completion = calculatePrototypeCompletion(
		intakeStarted,
		intakeDataReady,
		confirmableFields,
		rejectedFields,
		uploadPending,
		consentPending,
		reconnectPending,
		readyForMatching
	);
	thread.turn.stage = getTurnStage(
		intakeStarted,
		confirmableFields,
		rejectedFields,
		uploadPending,
		consentPending,
		reconnectPending,
		readyForMatching,
		matchingState
	);
	thread.turn.summary = getTurnSummary(
		thread,
		intakeStarted,
		intakeDataReady,
		rejectedFields,
		uploadPending,
		consentPending,
		reconnectPending,
		readyForMatching,
		matchingState
	);
	thread.turn.blockers = getTurnBlockers(
		thread,
		confirmableFields,
		rejectedFields,
		uploadPending,
		consentPending,
		reconnectPending
	);
	thread.turn.nextActionLabel = determineNextStep(thread).label;
	thread.widgets = buildPrototypeWidgets(thread, {
		confirmableFields,
		uploadPending,
		consentPending,
		reconnectPending,
		readyForMatching,
		matchingState
	});
}

function buildPrototypeWidgets(
	thread: ConciergeThread,
	state: {
		confirmableFields: ProfileFieldEvent[];
		uploadPending: boolean;
		consentPending: boolean;
		reconnectPending: boolean;
		readyForMatching: boolean;
		matchingState?: MatchingState;
	}
): ConciergeWidget[] {
	const widgets: ConciergeWidget[] = [
		{
			id: 'widget-profile-progress',
			type: 'profile_progress',
			title: 'Profile Progress',
			placement: 'rail',
			priority: 10,
			data: {
				completion: thread.profile.completion,
				confirmedCount: thread.profile.confirmedCount,
				inferredCount: thread.profile.inferredCount,
				missingFields: thread.profile.missingRequired,
				nextPrompt:
					!hasCollectedIntakeData(thread)
						? `Share ${formatLabelList(
								getMissingIntakeFieldLabels(thread).map((label) => label.toLowerCase())
							)} in chat.`
						: state.matchingState?.status === 'booked'
						? `Recruiter review is booked with ${state.matchingState.recruiterName}.`
						: state.matchingState
							? 'Matching is unlocked. Review the shortlist and book the recruiter follow-up.'
							: 'Clear the remaining blockers to unlock matching.'
			}
		}
	];

	if (hasCollectedIntakeData(thread) && state.confirmableFields.length > 0) {
		widgets.push({
			id: 'widget-field-confirmation',
			type: 'field_confirmation',
			title: 'Confirm inferred details',
			placement: 'inline',
			priority: 20,
			data: {
				description:
					'These values are strong inferences from the conversation, but they still need an explicit yes before matching unlocks.',
				fields: state.confirmableFields.map((field) => ({
					key: field.key,
					label: field.label,
					value: field.value,
					status: field.status,
					confidence: field.confidence,
					fieldClass: field.fieldClass,
					note: field.note
				})),
				confirmLabel: 'Looks right',
				rejectLabel: 'Need edits'
			}
		});
	}

	if (state.uploadPending) {
		const documentEntries = REQUIRED_DOCUMENT_SPECS.map((spec) => {
			const artifact = getUploadedDocumentArtifact(thread, spec.key);
			return {
				key: spec.key,
				title: spec.title,
				acceptedTypes: spec.acceptedTypes,
				accept: spec.accept,
				status: artifact ? 'uploaded' : 'needed',
				fileName: artifact?.fileName,
				byteSize: artifact?.byteSize,
				href: artifact?.href
			} as const;
		});
		const uploadedCount = documentEntries.filter((document) => document.status === 'uploaded').length;

		widgets.push({
			id: 'widget-document-upload',
			type: 'document_upload',
			title: 'Upload credential packet',
			placement: 'inline',
			priority: 30,
			data: {
				description:
					'Please upload your resume PDF and compact license image right here in chat before I move you into recruiter review.',
				documents: documentEntries,
				status:
					uploadedCount === 0
						? 'needed'
						: uploadedCount === documentEntries.length
							? 'uploaded'
							: 'partial',
				uploadLabel:
					uploadedCount === 0 ? 'Upload documents' : 'Upload remaining documents'
			}
		});
	}

	if (state.consentPending) {
		widgets.push({
			id: 'widget-consent',
			type: 'consent',
			title: 'Authorize background-check workflow',
			placement: 'inline',
			priority: 40,
			data: {
				body:
					'Before CREATE SOMETHING can write your profile into the staffing workflow, we need explicit consent for background-check and compliance screening.',
				policyReference: POLICY_REF,
				status: 'needed',
				confirmLabel: 'I consent'
			}
		});
	}

	if (state.reconnectPending) {
		const reconnectTool = getReconnectTool(thread);

		if (reconnectTool) {
			widgets.push({
				id: 'widget-tool-reconnect',
				type: 'tool_reconnect',
				title: 'Reconnect credentialing portal',
				placement: 'rail',
				priority: 50,
				data: {
					toolName: reconnectTool.name,
					reason: reconnectTool.note,
					status: 'required',
					connectHref:
						reconnectTool.actionHref ??
						buildControlPlaneBridgeHref('mcp-access', {
							threadId: thread.id,
							tool: 'credentialing-hub'
						}),
					reconnectLabel: 'Mark recovered'
				}
			});
		}
	}

	if (state.matchingState) {
		const selectedSlot = getSelectedRecruiterSlot(state.matchingState);

		widgets.push({
			id: 'widget-appointment-picker',
			type: 'appointment_picker',
			title:
				state.matchingState.status === 'booked'
					? 'Recruiter review confirmed'
					: 'Review shortlist and book recruiter follow-up',
			placement: 'inline',
			priority: 60,
				data: {
					description:
						state.matchingState.status === 'booked'
							? 'Your recruiter review is booked. You do not need to do anything else right now unless I ask for more information here in chat.'
						: 'I found aligned travel nurse openings for you. Pick the recruiter review time that works best below.',
				recruiterName: state.matchingState.recruiterName,
				recruiterTitle: state.matchingState.recruiterTitle,
				status: state.matchingState.status,
				selectedSlotId: state.matchingState.selectedSlotId,
				bookedLabel: selectedSlot ? formatRecruiterSlot(selectedSlot) : undefined,
				matches: state.matchingState.shortlist,
				slots: state.matchingState.slots.map((slot) => ({
					id: slot.id,
					label: slot.label,
					window: slot.window,
					availability: slot.availability
				})),
				confirmLabel:
					state.matchingState.status === 'booked'
						? 'Recruiter review booked'
						: 'Book recruiter review',
				completionLabel:
					state.matchingState.status === 'booked'
						? 'Complete recruiter review'
						: undefined
			}
		});
	}

	return widgets;
}

function buildStaffingQueueWidget(thread: ConciergeThread): ConciergeWidget {
	const queueStatus = thread.handoff?.queueStatus ?? 'queued';
	const coordinatorName = thread.handoff?.coordinatorName ?? 'Leah Patel';
	const roleTitle = thread.handoff?.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff?.facility ?? 'Assigned facility';

	return {
		id: 'widget-staffing-queue',
		type: 'staffing_queue',
		title: 'Staffing operations',
		placement: 'inline',
		priority: 15,
		data: {
			status: queueStatus,
			statusLabel: getStaffingQueueStatusLabel(queueStatus),
			coordinatorName,
			roleTitle,
			facility,
			description: getStaffingQueueDescription(queueStatus, roleTitle, facility),
			completedSteps: getStaffingQueueCompletedSteps(
				queueStatus,
				coordinatorName,
				roleTitle,
				facility
			),
			pendingSteps: getStaffingQueuePendingSteps(
				queueStatus,
				coordinatorName,
				roleTitle,
				facility
			),
			actionLabel:
				queueStatus === 'queued'
					? 'Start staffing outreach'
					: queueStatus === 'outreach_started'
						? 'Submit to facility'
						: undefined,
			actionType:
				queueStatus === 'queued'
					? 'start_staffing_outreach'
					: queueStatus === 'outreach_started'
						? 'submit_to_facility'
						: undefined,
			actionPendingLabel:
				queueStatus === 'queued' ? 'Starting outreach...' : 'Submitting packet...'
		}
	};
}

function buildFacilityResponseWidget(thread: ConciergeThread): ConciergeWidget {
	const queueStatus = thread.handoff?.queueStatus ?? 'submitted';
	const coordinatorName = thread.handoff?.coordinatorName ?? 'Leah Patel';
	const roleTitle = thread.handoff?.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff?.facility ?? 'Assigned facility';
	const responseStatus =
		queueStatus === 'queued' || queueStatus === 'outreach_started' ? 'submitted' : queueStatus;

	return {
		id: 'widget-facility-response',
		type: 'facility_response',
		title: 'Facility response',
		placement: 'inline',
		priority: 18,
		data: {
			status: responseStatus,
			statusLabel: getStaffingQueueStatusLabel(responseStatus),
			summary: getFacilityResponseSummary(responseStatus, roleTitle, facility),
			detail: getFacilityResponseDetail(responseStatus, coordinatorName, roleTitle, facility),
			completedSteps: getFacilityResponseCompletedSteps(responseStatus, roleTitle, facility),
			pendingSteps: getFacilityResponsePendingSteps(responseStatus, roleTitle, facility),
			actions: getFacilityResponseActions(responseStatus)
		}
	};
}

function buildOnboardingQueueWidget(thread: ConciergeThread): ConciergeWidget {
	const ownerName =
		thread.handoff?.kind === 'onboarding_queue'
			? thread.handoff.onboardingOwnerName ?? 'Ari Scott'
			: 'Ari Scott';
	const roleTitle = thread.handoff?.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff?.facility ?? 'Assigned facility';
	const startDate =
		thread.handoff?.kind === 'onboarding_queue'
			? thread.handoff.startDate ?? getTargetStartDate()
			: getTargetStartDate();
	const onboardingStatus =
		thread.handoff?.kind === 'onboarding_queue'
			? thread.handoff.onboardingStatus ?? 'queued'
			: 'queued';

	return {
		id: 'widget-onboarding-queue',
		type: 'onboarding_queue',
		title: 'Onboarding operations',
		placement: 'inline',
		priority: 19,
		data: {
			status: onboardingStatus,
			statusLabel: getOnboardingStatusLabel(onboardingStatus),
			ownerName,
			roleTitle,
			facility,
			startDate,
			description: getOnboardingDescription(onboardingStatus, roleTitle, facility, startDate),
			completedSteps: getOnboardingCompletedSteps(onboardingStatus, ownerName, startDate),
			pendingSteps: getOnboardingPendingSteps(onboardingStatus, facility, startDate),
			actionLabel:
				onboardingStatus === 'queued'
					? 'Start onboarding'
					: onboardingStatus === 'in_progress'
						? 'Complete onboarding'
						: undefined,
			actionType:
				onboardingStatus === 'queued'
					? 'start_onboarding'
					: onboardingStatus === 'in_progress'
						? 'complete_onboarding'
						: undefined,
			actionPendingLabel:
				onboardingStatus === 'queued' ? 'Starting onboarding...' : 'Completing onboarding...'
		}
	};
}

function ensureMatchingOutcome(thread: ConciergeThread) {
	if (thread.matching) {
		thread.matching.selectedOpportunityId ||= thread.matching.shortlist[0]?.id;
		upsertArtifact(thread, createShortlistArtifact(thread.matching));
		return thread.matching;
	}

	const matchingState: MatchingState = {
		status: 'ready',
		recruiterName: 'Maya Chen',
		recruiterTitle: 'Travel Nurse Recruiting Lead',
		generatedAt: createTimestamp(),
		shortlist: buildMatchingShortlist(thread),
		slots: buildRecruiterReviewSlots()
	};
	matchingState.selectedOpportunityId = matchingState.shortlist[0]?.id;

	thread.matching = matchingState;
	upsertArtifact(thread, createShortlistArtifact(matchingState));
	return matchingState;
}

function createShortlistArtifact(matchingState: MatchingState): ChatArtifact {
	return {
		id: SHORTLIST_ARTIFACT_ID,
		kind: 'shortlist_packet',
		title: 'Role shortlist ready',
		summary: `${matchingState.shortlist.length} aligned travel nurse openings staged for recruiter review.`,
		createdAt: matchingState.generatedAt,
		status: 'ready',
		source: 'matching engine'
	};
}

function buildMatchingShortlist(thread: ConciergeThread): MatchingOpportunity[] {
	const specialtyValue = getProfileField(thread, 'specialty')?.value ?? 'Travel nurse';
	const shiftValue = getProfileField(thread, 'preferred_shift')?.value ?? '12-hour nights';
	const startValue = getProfileField(thread, 'contract_start')?.value ?? 'Next available start';
	const regionValue =
		getProfileField(thread, 'preferred_region')?.value ?? 'Texas and nearby states';
	const lowerSpecialty = specialtyValue.toLowerCase();

	const roles = lowerSpecialty.includes('icu')
		? ['ICU Float RN', 'Cardiac ICU RN', 'Trauma ICU RN']
		: lowerSpecialty.includes('er')
			? ['ER RN', 'ED Observation RN', 'Trauma Intake RN']
			: ['Acute Care RN', 'Float Pool RN', 'Stepdown RN'];

	const facilities = getMatchingFacilitiesForPreferredLocation(regionValue);

	const payPackages = ['$2,420/week net', '$2,510/week net', '$2,680/week net'];

	return roles.map((roleTitle, index) => ({
		id: `match-${index + 1}`,
		roleTitle,
		facility: facilities[index]?.[0] ?? 'Regional hospital',
		location: facilities[index]?.[1] ?? 'Travel market',
		payPackage: payPackages[index] ?? '$2,400/week net',
		shift: shiftValue,
		startWindow: startValue
	}));
}

function buildRecruiterReviewSlots(): RecruiterReviewSlot[] {
	const now = new Date();
	const dayFormatter = new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric'
	});
	const timeFormatter = new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short'
	});
	const slotBlueprints = [
		{ id: 'slot-1', daysAhead: 1, hour: 10, minute: 0, availability: 'open' as const },
		{ id: 'slot-2', daysAhead: 1, hour: 14, minute: 30, availability: 'limited' as const },
		{ id: 'slot-3', daysAhead: 2, hour: 11, minute: 0, availability: 'open' as const }
	];

	return slotBlueprints.map((slot) => {
		const date = new Date(now);
		date.setDate(date.getDate() + slot.daysAhead);
		date.setHours(slot.hour, slot.minute, 0, 0);

		return {
			id: slot.id,
			label: dayFormatter.format(date),
			window: `${timeFormatter.format(date)} • 25 min video review`,
			availability: slot.availability,
			baseAvailability: slot.availability
		};
	});
}

function bookRecruiterReview(thread: ConciergeThread, slotId: string) {
	if (!slotId) {
		return null;
	}

	if (!isMatchingReady(thread)) {
		return null;
	}

	const matchingState = ensureMatchingOutcome(thread);
	if (matchingState.status === 'booked' || matchingState.status === 'completed') {
		return null;
	}

	const selectedSlot = matchingState.slots.find((slot) => slot.id === slotId);
	if (!selectedSlot || selectedSlot.availability === 'held') {
		return null;
	}

	const now = createTimestamp();
	matchingState.status = 'booked';
	matchingState.selectedSlotId = selectedSlot.id;
	matchingState.bookedAt = now;
	matchingState.slots = matchingState.slots.map((slot) =>
		slot.id === selectedSlot.id ? { ...slot, availability: 'held' } : slot
	);

	upsertArtifact(thread, {
		id: APPOINTMENT_ARTIFACT_ID,
		kind: 'appointment_confirmation',
		title: 'Recruiter review booked',
		summary: `Booked ${formatRecruiterSlot(selectedSlot)} with ${matchingState.recruiterName}.`,
		createdAt: now,
		status: 'ready',
		source: 'review scheduler'
	});

	return {
		slot: selectedSlot,
		artifactId: APPOINTMENT_ARTIFACT_ID
	};
}

function completeRecruiterReview(thread: ConciergeThread) {
	const matchingState = ensureMatchingOutcome(thread);
	if (matchingState.status !== 'booked') {
		return null;
	}

	const selectedSlot = getSelectedRecruiterSlot(matchingState);
	const primaryMatch = getSelectedMatchingOpportunity(matchingState);
	if (!selectedSlot || !primaryMatch) {
		return null;
	}

	const now = createTimestamp();
	matchingState.status = 'completed';
	matchingState.reviewCompletedAt = now;
	thread.handoff = {
		kind: 'staffing_queue',
		queueName: 'Travel nurse staffing queue',
		eta: '6 minutes',
		reasonCodes: ['review_complete', 'packet_ready', 'coordinator_assignment_pending'],
		summary:
			'Recruiter review is complete and the governed staffing packet is queued for coordinator outreach.',
		operatorBrief: `${thread.userName} reviewed the shortlist with ${matchingState.recruiterName} and is aligned on ${primaryMatch.roleTitle} at ${primaryMatch.facility}. Resume, compact license image, consent receipt, and the recruiter review confirmation are attached for staffing coordination.`,
		pendingTasks: getStaffingQueuePacketTasks('queued', primaryMatch.roleTitle, primaryMatch.facility),
		queueStatus: 'queued',
		coordinatorName: 'Leah Patel',
		roleTitle: primaryMatch.roleTitle,
		facility: primaryMatch.facility
	};

	upsertArtifact(thread, {
		id: REVIEW_SUMMARY_ARTIFACT_ID,
		kind: 'review_summary',
		title: 'Recruiter review summary',
		summary: `Cleared ${primaryMatch.roleTitle} for staffing outreach after ${formatRecruiterSlot(selectedSlot)}.`,
		createdAt: now,
		status: 'ready',
		source: 'recruiter review'
	});
	upsertArtifact(thread, {
		id: STAFFING_HANDOFF_ARTIFACT_ID,
		kind: 'handoff_packet',
		title: 'Staffing handoff packet',
		summary: `Governed staffing packet queued for ${primaryMatch.roleTitle}.`,
		createdAt: now,
		status: 'ready',
		source: 'handoff engine'
	});

	return {
		slot: selectedSlot,
		primaryMatch
	};
}

function startStaffingOutreach(thread: ConciergeThread) {
	if (thread.handoff?.kind !== 'staffing_queue') {
		return null;
	}

	const queueStatus = thread.handoff.queueStatus ?? 'queued';
	if (queueStatus !== 'queued') {
		return null;
	}

	const now = createTimestamp();
	const roleTitle = thread.handoff.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff.facility ?? 'Assigned facility';
	const coordinatorName = thread.handoff.coordinatorName ?? 'Leah Patel';

	thread.handoff = {
		...thread.handoff,
		queueStatus: 'outreach_started',
		eta: '4 minutes',
		reasonCodes: ['review_complete', 'coordinator_assigned', 'outreach_in_progress'],
		summary:
			'Staffing coordinator outreach is underway and the facility submission packet is being finalized.',
		operatorBrief: `${coordinatorName} claimed the packet for ${roleTitle} at ${facility}. Candidate outreach is active and the facility submission is the next governed step.`,
		pendingTasks: getStaffingQueuePacketTasks('outreach_started', roleTitle, facility)
	};

	upsertArtifact(thread, {
		id: STAFFING_OUTREACH_ARTIFACT_ID,
		kind: 'staffing_outreach_note',
		title: 'Staffing outreach started',
		summary: `${coordinatorName} started outreach for ${roleTitle} at ${facility}.`,
		createdAt: now,
		status: 'ready',
		source: 'staffing queue'
	});

	return {
		coordinatorName,
		roleTitle,
		facility
	};
}

function submitStaffingPacket(thread: ConciergeThread) {
	if (thread.handoff?.kind !== 'staffing_queue') {
		return null;
	}

	if ((thread.handoff.queueStatus ?? 'queued') !== 'outreach_started') {
		return null;
	}

	const now = createTimestamp();
	const roleTitle = thread.handoff.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff.facility ?? 'Assigned facility';
	const coordinatorName = thread.handoff.coordinatorName ?? 'Leah Patel';

	thread.handoff = {
		...thread.handoff,
		queueStatus: 'submitted',
		eta: '24 hours',
		reasonCodes: ['submission_sent', 'candidate_notified', 'facility_response_pending'],
		summary:
			'The staffing packet has been submitted and the thread is now waiting on facility response.',
		operatorBrief: `${coordinatorName} submitted ${roleTitle} at ${facility} from the governed staffing packet. Candidate notification is queued and the next update should come from the facility response.`,
		pendingTasks: getStaffingQueuePacketTasks('submitted', roleTitle, facility)
	};

	upsertArtifact(thread, {
		id: FACILITY_SUBMISSION_ARTIFACT_ID,
		kind: 'facility_submission',
		title: 'Facility submission recorded',
		summary: `${roleTitle} at ${facility} was submitted from the staffing packet.`,
		createdAt: now,
		status: 'ready',
		source: 'staffing queue'
	});

	return {
		roleTitle,
		facility
	};
}

function recordFacilityInterview(thread: ConciergeThread) {
	if (thread.handoff?.kind !== 'staffing_queue') {
		return null;
	}

	if ((thread.handoff.queueStatus ?? 'queued') !== 'submitted') {
		return null;
	}

	const now = createTimestamp();
	const roleTitle = thread.handoff.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff.facility ?? 'Assigned facility';
	const coordinatorName = thread.handoff.coordinatorName ?? 'Leah Patel';

	thread.handoff = {
		...thread.handoff,
		queueStatus: 'interview_requested',
		eta: 'Same day',
		reasonCodes: ['facility_interview_requested', 'candidate_update_pending', 'outcome_pending'],
		summary:
			'The facility requested an interview and the governed thread is coordinating the final placement outcome.',
		operatorBrief: `${coordinatorName} received an interview request from ${facility} for ${roleTitle}. Candidate coordination and the final placement outcome are the next governed steps.`,
		pendingTasks: getStaffingQueuePacketTasks('interview_requested', roleTitle, facility)
	};

	upsertArtifact(thread, {
		id: FACILITY_RESPONSE_ARTIFACT_ID,
		kind: 'facility_response',
		title: 'Facility interview requested',
		summary: `${facility} requested an interview for ${roleTitle}.`,
		createdAt: now,
		status: 'ready',
		source: 'staffing queue'
	});

	return {
		roleTitle,
		facility
	};
}

function confirmPlacement(thread: ConciergeThread) {
	if (thread.handoff?.kind !== 'staffing_queue') {
		return null;
	}

	if ((thread.handoff.queueStatus ?? 'queued') !== 'interview_requested') {
		return null;
	}

	const now = createTimestamp();
	const roleTitle = thread.handoff.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff.facility ?? 'Assigned facility';
	const coordinatorName = thread.handoff.coordinatorName ?? 'Leah Patel';

	thread.handoff = {
		...thread.handoff,
		queueStatus: 'placement_confirmed',
		eta: 'Complete',
		reasonCodes: ['placement_confirmed', 'candidate_notified', 'onboarding_ready'],
		summary:
			'The facility confirmed the placement and the governed thread is ready for onboarding handoff.',
		operatorBrief: `${coordinatorName} confirmed the placement for ${roleTitle} at ${facility}. The staffing packet is complete and the next downstream step is onboarding handoff.`,
		pendingTasks: getStaffingQueuePacketTasks('placement_confirmed', roleTitle, facility)
	};

	upsertArtifact(thread, {
		id: PLACEMENT_CONFIRMATION_ARTIFACT_ID,
		kind: 'placement_confirmation',
		title: 'Placement confirmed',
		summary: `${facility} confirmed the placement for ${roleTitle}.`,
		createdAt: now,
		status: 'ready',
		source: 'staffing queue'
	});

	return {
		roleTitle,
		facility
	};
}

function closeStaffingRequest(thread: ConciergeThread) {
	if (thread.handoff?.kind !== 'staffing_queue') {
		return null;
	}

	const queueStatus = thread.handoff.queueStatus ?? 'queued';
	if (queueStatus !== 'submitted' && queueStatus !== 'interview_requested') {
		return null;
	}

	const now = createTimestamp();
	const roleTitle = thread.handoff.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff.facility ?? 'Assigned facility';
	const coordinatorName = thread.handoff.coordinatorName ?? 'Leah Patel';

	thread.handoff = {
		...thread.handoff,
		queueStatus: 'closed',
		eta: 'Closed',
		reasonCodes: ['facility_declined', 'candidate_update_required', 'matching_reopen_recommended'],
		summary:
			'The facility closed this submission. The governed audit trail is preserved and matching can reopen later if needed.',
		operatorBrief: `${coordinatorName} recorded that ${facility} closed the submission for ${roleTitle}. Notify the candidate and reopen matching only if they want another role.`,
		pendingTasks: getStaffingQueuePacketTasks('closed', roleTitle, facility)
	};

	upsertArtifact(thread, {
		id: STAFFING_CLOSURE_ARTIFACT_ID,
		kind: 'staffing_closure',
		title: 'Staffing request closed',
		summary: `${facility} closed the submission for ${roleTitle}.`,
		createdAt: now,
		status: 'ready',
		source: 'staffing queue'
	});

	return {
		roleTitle,
		facility
	};
}

function startOnboarding(thread: ConciergeThread) {
	if (thread.handoff?.kind !== 'staffing_queue') {
		return null;
	}

	if ((thread.handoff.queueStatus ?? 'queued') !== 'placement_confirmed') {
		return null;
	}

	const now = createTimestamp();
	const roleTitle = thread.handoff.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff.facility ?? 'Assigned facility';
	const ownerName = 'Ari Scott';
	const startDate = getTargetStartDate();

	thread.handoff = {
		kind: 'onboarding_queue',
		queueName: 'Travel nurse onboarding queue',
		eta: '2 hours',
		reasonCodes: ['placement_confirmed', 'launch_packet_active', 'orientation_pending'],
		summary:
			'Placement is confirmed and the onboarding packet is now active for launch operations.',
		operatorBrief: `${ownerName} picked up onboarding for ${roleTitle} at ${facility}. Orientation planning, compliance review, and start-date confirmation are now running from the governed onboarding packet.`,
		pendingTasks: getOnboardingPacketTasks('in_progress', facility, startDate),
		onboardingStatus: 'in_progress',
		onboardingOwnerName: ownerName,
		roleTitle,
		facility,
		startDate
	};

	upsertArtifact(thread, {
		id: ONBOARDING_HANDOFF_ARTIFACT_ID,
		kind: 'onboarding_handoff_packet',
		title: 'Onboarding handoff packet',
		summary: `Launch packet activated for ${roleTitle} at ${facility}.`,
		createdAt: now,
		status: 'ready',
		source: 'onboarding queue'
	});

	return {
		ownerName,
		roleTitle,
		facility,
		startDate
	};
}

function completeOnboarding(thread: ConciergeThread) {
	if (thread.handoff?.kind !== 'onboarding_queue') {
		return null;
	}

	if ((thread.handoff.onboardingStatus ?? 'queued') !== 'in_progress') {
		return null;
	}

	const now = createTimestamp();
	const roleTitle = thread.handoff.roleTitle ?? 'Travel nurse placement';
	const facility = thread.handoff.facility ?? 'Assigned facility';
	const ownerName = thread.handoff.onboardingOwnerName ?? 'Ari Scott';
	const startDate = thread.handoff.startDate ?? getTargetStartDate();

	thread.handoff = {
		...thread.handoff,
		onboardingStatus: 'completed',
		eta: 'Complete',
		reasonCodes: ['orientation_confirmed', 'compliance_cleared', 'start_ready'],
		summary:
			'Onboarding is complete and the governed thread now reflects a start-ready candidate.',
		operatorBrief: `${ownerName} completed onboarding for ${roleTitle} at ${facility}. Orientation is confirmed, compliance is clear, and the candidate is ready for the ${startDate} start target.`,
		pendingTasks: getOnboardingPacketTasks('completed', facility, startDate)
	};

	upsertArtifact(thread, {
		id: ONBOARDING_COMPLETION_ARTIFACT_ID,
		kind: 'onboarding_completion',
		title: 'Onboarding complete',
		summary: `${roleTitle} at ${facility} is cleared to start on ${startDate}.`,
		createdAt: now,
		status: 'ready',
		source: 'onboarding queue'
	});

	return {
		roleTitle,
		facility
	};
}

function getStaffingQueueStatusLabel(status: StaffingQueueStatus) {
	switch (status) {
		case 'outreach_started':
			return 'Coordinator outreach active';
		case 'submitted':
			return 'Submitted to facility';
		case 'interview_requested':
			return 'Interview requested';
		case 'placement_confirmed':
			return 'Placement confirmed';
		case 'closed':
			return 'Request closed';
		default:
			return 'Queued for outreach';
	}
}

function getStaffingQueueDescription(
	status: StaffingQueueStatus,
	roleTitle: string,
	facility: string
) {
	switch (status) {
		case 'outreach_started':
			return `Coordinator outreach is active for ${roleTitle} at ${facility}. Submit the approved staffing packet next.`;
		case 'submitted':
			return `${roleTitle} at ${facility} is submitted. The next meaningful state change is the facility response.`;
		case 'interview_requested':
			return `${facility} requested an interview for ${roleTitle}. Confirm the final outcome once the interview is resolved.`;
		case 'placement_confirmed':
			return `${roleTitle} at ${facility} is confirmed. The governed staffing packet is ready for onboarding handoff.`;
		case 'closed':
			return `${facility} closed the request for ${roleTitle}. The audit trail is preserved if matching needs to reopen later.`;
		default:
			return `${roleTitle} at ${facility} is approved from recruiter review and waiting on staffing coordinator pickup.`;
	}
}

function getStaffingQueueCompletedSteps(
	status: StaffingQueueStatus,
	coordinatorName: string,
	roleTitle: string,
	facility: string
) {
	const completed = [
		'Recruiter review completed',
		`Primary role selected: ${roleTitle}`,
		'Governed staffing packet assembled'
	];

	if (
		status === 'outreach_started' ||
		status === 'submitted' ||
		status === 'interview_requested' ||
		status === 'placement_confirmed' ||
		status === 'closed'
	) {
		completed.push(`${coordinatorName} claimed the staffing packet`, 'Candidate outreach started');
	}

	if (
		status === 'submitted' ||
		status === 'interview_requested' ||
		status === 'placement_confirmed' ||
		status === 'closed'
	) {
		completed.push(`Submitted ${roleTitle} at ${facility}`, 'Candidate submission update queued');
	}

	if (status === 'interview_requested' || status === 'placement_confirmed') {
		completed.push(`Interview requested by ${facility}`);
	}

	if (status === 'placement_confirmed') {
		completed.push('Placement confirmed');
	}

	if (status === 'closed') {
		completed.push('Facility closed the staffing request');
	}

	return completed;
}

function getStaffingQueuePendingSteps(
	status: StaffingQueueStatus,
	coordinatorName: string,
	roleTitle: string,
	facility: string
) {
	switch (status) {
		case 'outreach_started':
			return [
				`Submit ${roleTitle} at ${facility} into the staffing CRM`,
				'Send candidate the submission update',
				'Monitor for facility follow-up questions'
			];
		case 'submitted':
			return [
				'Wait for facility response',
				'Send interview or decline update back into the thread',
				'Escalate only if credential questions reopen'
			];
		case 'interview_requested':
			return [
				'Confirm the final placement outcome',
				'Send interview scheduling details to the candidate',
				'Escalate only if credential questions reopen'
			];
		case 'placement_confirmed':
			return [
				'Route the candidate into onboarding handoff',
				'Send the placement confirmation to the candidate',
				'Archive the staffing packet trail'
			];
		case 'closed':
			return [
				'Send the closure update to the candidate',
				'Reopen matching only if the candidate wants another role',
				'Archive the staffing packet trail'
			];
		default:
			return [
				`${coordinatorName} picks up the packet`,
				`Prepare ${roleTitle} at ${facility} for staffing CRM submission`,
				'Send candidate the initial staffing outreach update'
			];
	}
}

function getStaffingQueuePacketTasks(
	status: StaffingQueueStatus,
	roleTitle: string,
	facility: string
) {
	switch (status) {
		case 'outreach_started':
			return [
				`Submit ${roleTitle} at ${facility} into the staffing CRM.`,
				'Send the candidate a staffing update once the submission is recorded.',
				'Monitor any credential follow-up from the facility.'
			];
		case 'submitted':
			return [
				'Monitor the facility response window.',
				'Update the candidate as soon as the facility responds.',
				'Escalate only if credential questions reopen.'
			];
		case 'interview_requested':
			return [
				'Confirm the final placement outcome.',
				'Send the interview request and timing details to the candidate.',
				'Escalate only if credential questions reopen.'
			];
		case 'placement_confirmed':
			return [
				'Route the placement into onboarding handoff.',
				'Send the candidate a placement confirmation update.',
				'Archive the staffing packet trail.'
			];
		case 'closed':
			return [
				'Send the closure update to the candidate.',
				'Reopen matching only if the candidate wants another role.',
				'Archive the staffing packet trail.'
			];
		default:
			return [
				`Route ${roleTitle} at ${facility} to a staffing coordinator.`,
				'Start candidate outreach from the governed packet.',
				'Prepare the facility submission handoff.'
			];
	}
}

function getFacilityResponseSummary(
	status: Extract<StaffingQueueStatus, 'submitted' | 'interview_requested' | 'placement_confirmed' | 'closed'>,
	roleTitle: string,
	facility: string
) {
	switch (status) {
		case 'interview_requested':
			return `${facility} requested an interview for ${roleTitle}.`;
		case 'placement_confirmed':
			return `${roleTitle} at ${facility} is confirmed.`;
		case 'closed':
			return `${facility} closed the staffing request for ${roleTitle}.`;
		default:
			return `${roleTitle} at ${facility} is waiting on facility response.`;
	}
}

function getFacilityResponseDetail(
	status: Extract<StaffingQueueStatus, 'submitted' | 'interview_requested' | 'placement_confirmed' | 'closed'>,
	coordinatorName: string,
	roleTitle: string,
	facility: string
) {
	switch (status) {
		case 'interview_requested':
			return `${coordinatorName} recorded the interview request and is waiting on the final placement decision for ${roleTitle} at ${facility}.`;
		case 'placement_confirmed':
			return `${coordinatorName} recorded the successful outcome. The next workflow after this state is onboarding handoff.`;
		case 'closed':
			return `${coordinatorName} recorded the closure. The audit trail stays attached if the candidate wants to reopen matching later.`;
		default:
			return `Use this governed step to record whether ${facility} wants to move forward with ${roleTitle} or close the request.`;
	}
}

function getFacilityResponseCompletedSteps(
	status: Extract<StaffingQueueStatus, 'submitted' | 'interview_requested' | 'placement_confirmed' | 'closed'>,
	roleTitle: string,
	facility: string
) {
	const completed = [`Submitted ${roleTitle} at ${facility}`];

	if (status === 'interview_requested' || status === 'placement_confirmed') {
		completed.push('Facility interview request recorded');
	}

	if (status === 'placement_confirmed') {
		completed.push('Placement confirmed');
	}

	if (status === 'closed') {
		completed.push('Facility closure recorded');
	}

	return completed;
}

function getFacilityResponsePendingSteps(
	status: Extract<StaffingQueueStatus, 'submitted' | 'interview_requested' | 'placement_confirmed' | 'closed'>,
	roleTitle: string,
	facility: string
) {
	switch (status) {
		case 'interview_requested':
			return [
				`Confirm the final outcome for ${roleTitle} at ${facility}`,
				'Send interview coordination details to the candidate',
				'Escalate only if credential questions reopen'
			];
		case 'placement_confirmed':
			return [
				'Route the candidate into onboarding handoff',
				'Send the placement confirmation update',
				'Archive the staffing packet trail'
			];
		case 'closed':
			return [
				'Send the closure update to the candidate',
				'Reopen matching only if the candidate wants another role',
				'Archive the staffing packet trail'
			];
		default:
			return [
				`Record whether ${facility} wants to interview or close ${roleTitle}`,
				'Send the facility-response update to the candidate',
				'Escalate only if credential questions reopen'
			];
	}
}

function getFacilityResponseActions(
	status: Extract<StaffingQueueStatus, 'submitted' | 'interview_requested' | 'placement_confirmed' | 'closed'>
) {
	switch (status) {
		case 'interview_requested':
			return [
				{
					label: 'Confirm placement',
					type: 'confirm_placement' as const,
					pendingLabel: 'Confirming placement...',
					tone: 'primary' as const
				},
				{
					label: 'Mark request closed',
					type: 'close_staffing_request' as const,
					pendingLabel: 'Closing request...',
					tone: 'danger' as const
				}
			];
		case 'placement_confirmed':
		case 'closed':
			return [];
		default:
			return [
				{
					label: 'Record interview request',
					type: 'record_facility_interview' as const,
					pendingLabel: 'Recording interview...',
					tone: 'primary' as const
				},
				{
					label: 'Mark request closed',
					type: 'close_staffing_request' as const,
					pendingLabel: 'Closing request...',
					tone: 'danger' as const
				}
			];
	}
}

function getOnboardingStatusLabel(status: OnboardingQueueStatus) {
	switch (status) {
		case 'in_progress':
			return 'Onboarding active';
		case 'completed':
			return 'Start ready';
		default:
			return 'Ready for onboarding';
	}
}

function getOnboardingDescription(
	status: OnboardingQueueStatus,
	roleTitle: string,
	facility: string,
	startDate: string
) {
	switch (status) {
		case 'completed':
			return `${roleTitle} at ${facility} is cleared to start on ${startDate}. The governed onboarding packet is complete.`;
		case 'in_progress':
			return `${roleTitle} at ${facility} is in onboarding for a ${startDate} start target. Complete compliance and orientation tasks next.`;
		default:
			return `${roleTitle} at ${facility} is ready to route into onboarding for a ${startDate} start target.`;
	}
}

function getOnboardingCompletedSteps(
	status: OnboardingQueueStatus,
	ownerName: string,
	startDate: string
) {
	const completed = ['Placement confirmed', 'Onboarding handoff packet assembled'];

	if (status === 'in_progress' || status === 'completed') {
		completed.push(`${ownerName} claimed the onboarding packet`, `Start target set: ${startDate}`);
	}

	if (status === 'completed') {
		completed.push('Compliance checklist cleared', 'Orientation details confirmed');
	}

	return completed;
}

function getOnboardingPendingSteps(
	status: OnboardingQueueStatus,
	facility: string,
	startDate: string
) {
	switch (status) {
		case 'completed':
			return [
				'Send the final start confirmation to the candidate',
				`Confirm day-one reporting details for ${facility}`,
				'Archive the onboarding packet trail'
			];
		case 'in_progress':
			return [
				'Finalize compliance checklist',
				`Confirm orientation details for ${facility}`,
				`Confirm the ${startDate} start target with the candidate`
			];
		default:
			return [
				'Route the confirmed placement into onboarding',
				'Assign an onboarding owner',
				'Set the candidate start target'
			];
	}
}

function getOnboardingPacketTasks(
	status: Extract<OnboardingQueueStatus, 'in_progress' | 'completed'>,
	facility: string,
	startDate: string
) {
	if (status === 'completed') {
		return [
			'Send the final start confirmation to the candidate.',
			`Confirm day-one reporting details for ${facility}.`,
			'Archive the onboarding packet trail.'
		];
	}

	return [
		'Finalize compliance checklist.',
		`Confirm orientation details for ${facility}.`,
		`Confirm the ${startDate} start target with the candidate.`
	];
}

function getTargetStartDate() {
	return 'Mon, Apr 6';
}

function calculatePrototypeCompletion(
	intakeStarted: boolean,
	intakeDataReady: boolean,
	confirmableFields: ProfileFieldEvent[],
	rejectedFields: ProfileFieldEvent[],
	uploadPending: boolean,
	consentPending: boolean,
	reconnectPending: boolean,
	readyForMatching: boolean
) {
	if (!intakeDataReady) {
		return intakeStarted ? 12 : 0;
	}

	if (readyForMatching) {
		return 100;
	}

	let completion = 72;

	if (confirmableFields.length === 0 && rejectedFields.length === 0) {
		completion += 10;
	}

	if (!uploadPending) {
		completion += 8;
	}

	if (!consentPending) {
		completion += 5;
	}

	if (!reconnectPending) {
		completion += 5;
	}

	return Math.min(100, completion);
}

function getPendingAction(
	thread: ConciergeThread,
	confirmableFields: ProfileFieldEvent[],
	rejectedFields: ProfileFieldEvent[],
	uploadPending: boolean,
	consentPending: boolean,
	reconnectPending: boolean,
	readyForMatching: boolean,
	matchingState?: MatchingState
) {
	if (!hasStartedIntake(thread)) {
		return 'Start with specialty, preferred shift, and location.';
	}

	if (!hasCollectedIntakeData(thread)) {
		return `Share ${formatLabelList(
			getMissingIntakeFieldLabels(thread).map((label) => label.toLowerCase())
		)} in chat.`;
	}

	if (matchingState?.status === 'booked') {
		const selectedSlot = getSelectedRecruiterSlot(matchingState);
		return selectedSlot
			? `Complete recruiter review on ${formatRecruiterSlot(selectedSlot)}.`
			: 'Complete the booked recruiter review.';
	}

	if (readyForMatching) {
		return 'Review the shortlist and book recruiter follow-up.';
	}

	if (rejectedFields.length > 0) {
		return 'Send corrected preference details.';
	}

	if (confirmableFields.length > 0 && uploadPending) {
		const missingDocuments = getMissingRequiredDocumentSpecs(thread).map((spec) =>
			spec.title.toLowerCase()
		);
		return `Confirm ${confirmableFields.length} inferred field${confirmableFields.length === 1 ? '' : 's'} and upload ${formatLabelList(missingDocuments)}.`;
	}

	if (uploadPending) {
		const missingDocuments = getMissingRequiredDocumentSpecs(thread).map((spec) =>
			spec.title.toLowerCase()
		);
		return `Upload ${formatLabelList(missingDocuments)}.`;
	}

	if (consentPending) {
		return 'Capture background-check consent.';
	}

	if (reconnectPending) {
		return 'Reconnect Credentialing Hub.';
	}

	if (confirmableFields.length > 0) {
		return 'Confirm the inferred profile details.';
	}

	return 'Continue the nurse intake thread.';
}

function getMissingRequirements(
	thread: ConciergeThread,
	confirmableFields: ProfileFieldEvent[],
	rejectedFields: ProfileFieldEvent[],
	uploadPending: boolean,
	consentPending: boolean,
	reconnectPending: boolean
) {
	return [
		...(!hasCollectedIntakeData(thread) ? getMissingIntakeFieldLabels(thread) : []),
		...rejectedFields.map((field) => `Correct ${field.label.toLowerCase()}`),
		...confirmableFields.map((field) => `Confirm ${field.label.toLowerCase()}`),
		...(uploadPending
			? getMissingRequiredDocumentSpecs(thread).map((spec) => spec.title)
			: []),
		...(consentPending ? ['Background-check consent'] : []),
		...(reconnectPending ? ['Credentialing Hub reconnect'] : [])
	];
}

function getProfileBlockers(
	thread: ConciergeThread,
	confirmableFields: ProfileFieldEvent[],
	rejectedFields: ProfileFieldEvent[],
	uploadPending: boolean,
	consentPending: boolean,
	reconnectPending: boolean
) {
	const missingBasics = getMissingIntakeFieldLabels(thread);

	return [
		...(missingBasics.length > 0
			? [
					`${formatLabelList(missingBasics)} ${
						missingBasics.length === 1 ? 'is' : 'are'
					} still required before secure document collection can begin.`
				]
			: []),
		...(rejectedFields.length > 0 ? ['Corrected preference details are required before matching.'] : []),
		...(confirmableFields.length > 0 ? ['Explicit confirmation is still required for inferred preference fields.'] : []),
		...(uploadPending
			? [
					`${formatLabelList(
						getMissingRequiredDocumentSpecs(thread).map((spec) => spec.title)
					)} ${getMissingRequiredDocumentSpecs(thread).length === 1 ? 'is' : 'are'} required before role matching.`
				]
			: []),
		...(consentPending ? ['Background-check consent is required before external writes.'] : []),
		...(reconnectPending ? ['Credentialing Hub must reconnect before live verification can resume.'] : [])
	];
}

function getTurnStage(
	intakeStarted: boolean,
	confirmableFields: ProfileFieldEvent[],
	rejectedFields: ProfileFieldEvent[],
	uploadPending: boolean,
	consentPending: boolean,
	reconnectPending: boolean,
	readyForMatching: boolean,
	matchingState?: MatchingState
) {
	if (!intakeStarted) {
		return 'idle';
	}

	if (matchingState?.status === 'booked') {
		return 'idle';
	}

	if (readyForMatching) {
		return 'idle';
	}

	if (uploadPending || consentPending) {
		return 'awaiting_upload';
	}

	if (rejectedFields.length > 0 || confirmableFields.length > 0) {
		return 'awaiting_confirmation';
	}

	if (reconnectPending) {
		return 'awaiting_tool_auth';
	}

	return 'idle';
}

function getTurnSummary(
	thread: ConciergeThread,
	intakeStarted: boolean,
	intakeDataReady: boolean,
	rejectedFields: ProfileFieldEvent[],
	uploadPending: boolean,
	consentPending: boolean,
	reconnectPending: boolean,
	readyForMatching: boolean,
	matchingState?: MatchingState
) {
	if (!intakeStarted) {
		return 'The application is waiting for the first message.';
	}

	if (!intakeDataReady) {
		return `The concierge is still gathering ${formatLabelList(
			getMissingIntakeFieldLabels(thread).map((label) => label.toLowerCase())
		)} before it can ask for documents or unlock recruiter review.`;
	}

	if (matchingState?.status === 'booked') {
		const selectedSlot = getSelectedRecruiterSlot(matchingState);
		return selectedSlot
			? `The shortlist is staged and recruiter review is booked for ${formatRecruiterSlot(selectedSlot)}. Complete the review to queue staffing handoff.`
			: 'The shortlist is staged and recruiter review is already booked.';
	}

	if (readyForMatching) {
		return 'The concierge has enough confirmed information to stage aligned roles and route the nurse into recruiter review without another intake form.';
	}

	if (rejectedFields.length > 0) {
		return 'The concierge is waiting on corrected preference details before it can unlock matching.';
	}

	if (uploadPending || consentPending) {
		return 'The concierge has enough information to avoid more interrogation, but it is still missing consent and supporting documents.';
	}

	if (reconnectPending) {
		return 'The concierge is ready for matching, but live verification is still blocked on a governed tool reconnect.';
	}

	return 'The concierge is still collecting the minimum explicit confirmations needed to continue safely.';
}

function getTurnBlockers(
	thread: ConciergeThread,
	confirmableFields: ProfileFieldEvent[],
	rejectedFields: ProfileFieldEvent[],
	uploadPending: boolean,
	consentPending: boolean,
	reconnectPending: boolean
) {
	return [
		...(!hasCollectedIntakeData(thread)
			? getMissingIntakeFieldLabels(thread).map((label) => `Share ${label.toLowerCase()}.`)
			: []),
		...rejectedFields.map((field) => `Correct ${field.label}.`),
		...confirmableFields.map((field) => `Confirm ${field.label}.`),
		...(uploadPending
			? getMissingRequiredDocumentSpecs(thread).map((spec) => `Upload ${spec.title}.`)
			: []),
		...(consentPending ? ['Capture background-check consent.'] : []),
		...(reconnectPending ? ['Reconnect Credentialing Hub.'] : [])
	];
}

function confirmFields(thread: ConciergeThread, fieldKeys: string[]) {
	const now = createTimestamp();

	return thread.profile.fields.reduce<ProfileFieldEvent[]>((confirmed, field) => {
		if (!fieldKeys.includes(field.key) || field.status === 'confirmed') {
			return confirmed;
		}

		field.status = 'confirmed';
		field.confirmedBy = 'user';
		field.confidence = Math.max(field.confidence, 0.98);
		field.updatedAt = now;
		field.note = 'Confirmed in the intake thread.';
		confirmed.push(field);
		return confirmed;
	}, []);
}

function rejectFields(thread: ConciergeThread, fieldKeys: string[]) {
	const now = createTimestamp();

	return thread.profile.fields.reduce<ProfileFieldEvent[]>((rejected, field) => {
		if (!fieldKeys.includes(field.key) || field.status === 'rejected') {
			return rejected;
		}

		field.status = 'rejected';
		field.confirmedBy = undefined;
		field.updatedAt = now;
		field.note = 'Rejected in the intake thread and waiting on corrected details.';
		rejected.push(field);
		return rejected;
	}, []);
}

function reopenRejectedFields(thread: ConciergeThread, correctionNote: string) {
	const now = createTimestamp();

	for (const field of getRejectedConfirmableFields(thread)) {
		field.status = 'candidate';
		field.updatedAt = now;
		field.note = `Follow-up requested in chat: ${correctionNote}`;
	}
}

function captureConsent(thread: ConciergeThread) {
	const now = createTimestamp();
	const consentField = getProfileField(thread, 'background_check_consent');
	if (consentField) {
		consentField.value = 'Captured';
		consentField.status = 'confirmed';
		consentField.confirmedBy = 'user';
		consentField.confidence = 1;
		consentField.updatedAt = now;
		consentField.note = 'Consent captured in the intake thread.';
		consentField.sourceArtifactIds = uniqueStrings([...consentField.sourceArtifactIds, CONSENT_ARTIFACT_ID]);
	}

	upsertArtifact(thread, {
		id: CONSENT_ARTIFACT_ID,
		kind: 'consent_receipt',
		title: 'Background-check consent receipt',
		summary: 'Consent captured from the chat surface.',
		createdAt: now,
		status: 'ready',
		source: 'chat'
	});

	return CONSENT_ARTIFACT_ID;
}

function attachUploadedDocuments(
	thread: ConciergeThread,
	uploads: ThreadAttachmentUpload[]
) {
	const now = createTimestamp();
	const artifactIds: string[] = [];

	for (const upload of uploads) {
		const spec = getRequiredDocumentSpecByKey(upload.documentKey);
		if (!spec) {
			continue;
		}

		const artifactId = DOCUMENT_ARTIFACT_IDS[upload.documentKey];
		artifactIds.push(artifactId);
		upsertArtifact(thread, {
			id: artifactId,
			kind: 'upload',
			title: spec.title,
			summary: `Uploaded ${upload.fileName} from the nurse thread.`,
			createdAt: now,
			status: 'ready',
			source: 'thread attachment',
			href: upload.href,
			documentKey: upload.documentKey,
			fileName: upload.fileName,
			contentType: upload.contentType,
			byteSize: upload.byteSize,
			storageKey: upload.storageKey
		});

		if (upload.documentKey === 'compact_license_image') {
			const compactLicense = getProfileField(thread, 'compact_license');
			if (compactLicense) {
				compactLicense.sourceArtifactIds = uniqueStrings([
					...compactLicense.sourceArtifactIds,
					artifactId
				]);
				compactLicense.updatedAt = now;
			}
		}
	}

	return artifactIds;
}

function resolveReconnect(thread: ConciergeThread) {
	const now = createTimestamp();

	thread.connectedTools = thread.connectedTools.map((tool) =>
		tool.name === 'Credentialing Hub'
			? {
					...tool,
					status: 'connected',
					note: 'Connected and ready for live verification.',
					actionHref: undefined
				}
			: tool
	);

	upsertArtifact(thread, {
		id: TOOL_ACTION_ID,
		kind: 'tool_action',
		title: 'License verification',
		summary: 'Credentialing Hub is reconnected and ready for the next verification call.',
		createdAt: now,
		status: 'ready',
		source: 'credential recovery'
	});
}

function updateProfileSnapshot(thread: ConciergeThread, summary: string) {
	upsertArtifact(thread, {
		id: PROFILE_SNAPSHOT_ID,
		kind: 'profile_snapshot',
		title: 'Profile snapshot v3',
		summary,
		createdAt: createTimestamp(),
		status: 'ready',
		source: 'progressive profiler'
	});

	return PROFILE_SNAPSHOT_ID;
}

function upsertArtifact(thread: ConciergeThread, artifact: ChatArtifact) {
	const artifactIndex = thread.artifacts.findIndex((item) => item.id === artifact.id);
	if (artifactIndex >= 0) {
		thread.artifacts[artifactIndex] = artifact;
		return;
	}

	thread.artifacts = [...thread.artifacts, artifact];
}

function appendUserMessage(thread: ConciergeThread, body: string) {
	const timestamp = createTimestamp();
	thread.messages = [
		...thread.messages,
		{
			id: createMessageId('user'),
			role: 'user',
			author: thread.userName,
			body,
			createdAt: timestamp
		}
	];
	thread.updatedAt = timestamp;
}

function appendAssistantMessage(thread: ConciergeThread, body: string, evidence: string[] = []) {
	const timestamp = createTimestamp();
	thread.messages = [
		...thread.messages,
		{
			id: createMessageId('assistant'),
			role: 'assistant',
			author: 'Concierge',
			body,
			createdAt: timestamp,
			evidence: evidence.length > 0 ? uniqueStrings(evidence) : undefined
		}
	];
	thread.updatedAt = timestamp;
}

function composeAssistantReply(
	thread: ConciergeThread,
	appliedActions: string[],
	options?: { locationClarificationNeeded?: boolean }
) {
	const guidance = getNurseGuidance(thread);
	const clarificationSuffix =
		options?.locationClarificationNeeded === true
			? ' I did not map that location cleanly yet. Reply with the metro, state, or travel radius you want me to use and I will lock it in here.'
			: '';

	if (appliedActions.length > 0) {
		return `I updated your application: ${formatLabelList(appliedActions)}. ${guidance.chatReply}${clarificationSuffix}`;
	}

	return `${guidance.chatReply}${clarificationSuffix}`;
}

function applyCompactLicenseFollowUp(thread: ConciergeThread, input: string) {
	if (!isCompactLicenseFollowUpPrompt(getLatestAssistantPrompt(thread)?.body)) {
		return null;
	}

	const messageId = thread.messages.at(-1)?.id;
	const sourceMessageIds = messageId ? [messageId] : [];
	const now = createTimestamp();

	if (matchesNegativeCue(input)) {
		upsertProfileField(thread, {
			key: 'compact_license',
			label: 'Compact license',
			value: 'Not active',
			status: 'confirmed',
			confidence: 0.99,
			fieldClass: 'credential',
			sourceMessageIds,
			sourceArtifactIds: [],
			updatedAt: now,
			confirmedBy: 'user',
			note: 'Marked as not active from the compact-license follow-up in chat.'
		});

		return {
			actionLabel: 'captured compact license status as not active',
			snapshotSummary: 'Captured that the nurse does not have an active compact license from a direct yes/no follow-up in chat.'
		};
	}

	if (matchesAffirmativeCue(input)) {
		upsertProfileField(thread, {
			key: 'compact_license',
			label: 'Compact license',
			value: 'Active',
			status: 'confirmed',
			confidence: 0.99,
			fieldClass: 'credential',
			sourceMessageIds,
			sourceArtifactIds: [],
			updatedAt: now,
			confirmedBy: 'user',
			note: 'Confirmed directly from the compact-license follow-up in chat.'
		});

		return {
			actionLabel: 'captured active compact license status',
			snapshotSummary: 'Confirmed active compact license status from a direct yes/no follow-up in chat.'
		};
	}

	return null;
}

function getLatestAssistantPrompt(thread: ConciergeThread) {
	return [...thread.messages]
		.slice(0, -1)
		.reverse()
		.find((message) => message.role === 'assistant');
}

function isCompactLicenseFollowUpPrompt(body?: string) {
	return /\bdo you have an active compact license\b/.test(body?.toLowerCase() ?? '');
}

function isPreferredLocationFollowUpPrompt(body?: string) {
	const normalizedBody = body?.toLowerCase() ?? '';
	return (
		normalizedBody.includes('what locations should i keep this search focused on') ||
		normalizedBody.includes('tell me the states, city radius, metro, or travel range') ||
		normalizedBody.includes('tell me your preferred location')
	);
}

function matchesAffirmativeCue(input: string) {
	return /\b(yes|yeah|yep|affirmative|i do|i have one|active)\b/.test(input);
}

function matchesConfirmationCue(input: string) {
	return /\b(yes|yep|correct|confirm|looks right|that works)\b/.test(input);
}

function matchesNegativeCue(input: string) {
	return /\b(no|nope|not yet|do not|don't|dont|not active|inactive)\b/.test(input);
}

function matchesConsentCue(input: string) {
	return /\b(consent|authorize|approved|approve)\b/.test(input);
}

function matchesReconnectCue(input: string) {
	return /\b(reconnect|reconnected|connected again|signed in)\b/.test(input);
}

function extractSpecialty(input: string) {
	if (/\bicu\b/.test(input)) {
		return 'ICU nurse';
	}

	if (/\b(er|ed|emergency room)\b/.test(input)) {
		return 'ER nurse';
	}

	if (/\bmed[\s-]?surg\b/.test(input)) {
		return 'Med-surg nurse';
	}

	if (/\btelemetry\b/.test(input)) {
		return 'Telemetry nurse';
	}

	if (/\blabor and delivery|l&d\b/.test(input)) {
		return 'Labor and delivery nurse';
	}

	return null;
}

function extractPreferredShift(input: string) {
	const parts: string[] = [];

	if (/\bnight|nights\b/.test(input)) {
		parts.push('Nights');
	}

	if (/\bday|days\b/.test(input)) {
		parts.push('Days');
	}

	if (/\bweekend|weekends\b/.test(input)) {
		parts.push('weekends okay');
	}

	return parts.length > 0 ? parts.join(', ') : null;
}

function extractContractStart(input: string) {
	if (/\bapril\b/.test(input)) {
		return 'April 2026';
	}

	if (/\bmay\b/.test(input)) {
		return 'May 2026';
	}

	if (/\bjune\b/.test(input)) {
		return 'June 2026';
	}

	if (/\b13[- ]?week\b/.test(input)) {
		return '13-week contract window';
	}

	return null;
}

function formatLabelList(items: string[]) {
	if (items.length === 0) {
		return 'none';
	}

	if (items.length === 1) {
		return items[0];
	}

	if (items.length === 2) {
		return `${items[0]} and ${items[1]}`;
	}

	return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function uniqueStrings(items: string[]) {
	return [...new Set(items)];
}

let messageCounter = 0;

function createMessageId(prefix: string) {
	messageCounter += 1;
	return `${prefix}-${Date.now()}-${messageCounter}`;
}

function createTimestamp() {
	return new Date().toISOString();
}
