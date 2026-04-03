import { json, type RequestHandler } from '@sveltejs/kit';
import {
	isThreadActionType,
	type ThreadActionRequest
} from '$chat/api-contract';
import {
	getGovernedActionBlockedMessage,
	isGovernedThreadAction
} from '$lib/agency-access';
import { getAgencyAccessStateForRequest } from '$lib/server/agency-access';
import {
	recordIndeedDispositionWriteback,
	shouldAttemptIndeedDispositionWriteback
} from '$lib/server/indeed-mcp';
import {
	getIntakeAccessErrorMessage,
	getIntakeAccessStatusCode,
	resolveIntakeAccess
} from '$lib/server/intake-access';
import {
	bookPersistedThreadAppointment,
	applyPersistedIndeedDispositionSync,
	capturePersistedThreadConsent,
	closePersistedStaffingRequest,
	completePersistedThreadReview,
	completePersistedThreadOnboarding,
	confirmPersistedThreadPlacement,
	confirmPersistedThreadFields,
	ensureConciergeSession,
	getRequiredThreadView,
	recordPersistedFacilityInterview,
	rejectPersistedThreadFields,
	resolvePersistedThreadReconnect,
	startPersistedThreadOnboarding,
	startPersistedStaffingOutreach,
	submitPersistedThreadToFacility
} from '$lib/server/threads/session';

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

const verifiedIntakeActionTypes = new Set<ThreadActionRequest['type']>([
	'book_appointment',
	'complete_review',
	'start_staffing_outreach',
	'submit_to_facility',
	'record_facility_interview',
	'confirm_placement',
	'close_staffing_request',
	'start_onboarding',
	'complete_onboarding'
]);

export const POST: RequestHandler = async ({ cookies, fetch, params, platform, request, url }) => {
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });
	const threadId = params.threadId;

	if (!threadId) {
		return json({ message: 'Thread id is required.' }, { status: 400 });
	}

	const threadView = await getRequiredThreadView(sessionId, threadId, platform);

	let payload: ThreadActionRequest | null = null;

	try {
		payload = (await request.json()) as ThreadActionRequest;
	} catch {
		payload = null;
	}

	if (!payload || !isThreadActionType(payload.type)) {
		return json({ message: 'A valid thread action type is required.' }, { status: 400 });
	}

	if (verifiedIntakeActionTypes.has(payload.type)) {
		const intakeAccess = resolveIntakeAccess({
			cookies,
			url,
			platform,
			secure: url.protocol === 'https:'
		});

		if (!intakeAccess.granted) {
			return json(
				{ message: getIntakeAccessErrorMessage(intakeAccess) },
				{ status: getIntakeAccessStatusCode(intakeAccess) }
			);
		}
	}

	if (isGovernedThreadAction(payload.type)) {
		const agencyAccess = await getAgencyAccessStateForRequest({
			cookies,
			fetch,
			request,
			platform
		});

		if (agencyAccess.status !== 'allowed') {
			return json({ message: getGovernedActionBlockedMessage(agencyAccess) }, { status: 403 });
		}
	}

	const fieldKeys = payload.fieldKeys ?? [];
	const queueStatus = threadView.thread.handoff?.queueStatus ?? null;
	const onboardingStatus = threadView.thread.handoff?.onboardingStatus ?? null;
	let indeedDispositionStatus: 'placement_confirmed' | 'request_closed' | null = null;

	switch (payload.type) {
		case 'confirm_fields':
			if (!isStringArray(fieldKeys) || fieldKeys.length === 0) {
				return json({ message: 'confirm_fields requires at least one field key.' }, { status: 400 });
			}
			await confirmPersistedThreadFields(sessionId, threadId, fieldKeys, platform);
			break;

		case 'reject_fields':
			if (!isStringArray(fieldKeys) || fieldKeys.length === 0) {
				return json({ message: 'reject_fields requires at least one field key.' }, { status: 400 });
			}
			await rejectPersistedThreadFields(sessionId, threadId, fieldKeys, platform);
			break;

		case 'capture_consent':
			await capturePersistedThreadConsent(sessionId, threadId, platform);
			break;

		case 'book_appointment':
			if (typeof payload.slotId !== 'string' || payload.slotId.trim().length === 0) {
				return json({ message: 'book_appointment requires a slot id.' }, { status: 400 });
			}
			if (threadView.nextStep.intent !== 'book_appointment') {
				return json(
					{ message: 'Recruiter review can only be booked after intake blockers clear.' },
					{ status: 409 }
				);
			}
			await bookPersistedThreadAppointment(sessionId, threadId, payload.slotId, platform);
			break;

		case 'complete_review':
			if (threadView.nextStep.intent !== 'complete_review') {
				return json(
					{ message: 'Recruiter review can only be completed after a slot is booked.' },
					{ status: 409 }
				);
			}
			await completePersistedThreadReview(sessionId, threadId, platform);
			break;

		case 'start_staffing_outreach':
			if (threadView.nextStep.intent !== 'start_staffing_outreach') {
				return json(
					{ message: 'Staffing outreach can only start once the staffing packet is queued.' },
					{ status: 409 }
				);
			}
			await startPersistedStaffingOutreach(sessionId, threadId, platform);
			break;

		case 'submit_to_facility':
			if (threadView.nextStep.intent !== 'submit_to_facility') {
				return json(
					{ message: 'Facility submission requires active staffing outreach first.' },
					{ status: 409 }
				);
			}
			await submitPersistedThreadToFacility(sessionId, threadId, platform);
			break;

		case 'record_facility_interview':
			if (threadView.nextStep.intent !== 'record_facility_response') {
				return json(
					{ message: 'Facility response can only be recorded after submission.' },
					{ status: 409 }
				);
			}
			await recordPersistedFacilityInterview(sessionId, threadId, platform);
			break;

		case 'confirm_placement':
			if (threadView.nextStep.intent !== 'confirm_placement') {
				return json(
					{ message: 'Placement can only be confirmed after an interview request.' },
					{ status: 409 }
				);
			}
			await confirmPersistedThreadPlacement(sessionId, threadId, platform);
			indeedDispositionStatus = 'placement_confirmed';
			break;

		case 'close_staffing_request':
			if (queueStatus !== 'submitted' && queueStatus !== 'interview_requested') {
				return json(
					{ message: 'A staffing request can only be closed after submission or interview.' },
					{ status: 409 }
				);
			}
			await closePersistedStaffingRequest(sessionId, threadId, platform);
			indeedDispositionStatus = 'request_closed';
			break;

		case 'start_onboarding':
			if (threadView.nextStep.intent !== 'start_onboarding') {
				return json(
					{ message: 'Onboarding can only start after placement confirmation.' },
					{ status: 409 }
				);
			}
			await startPersistedThreadOnboarding(sessionId, threadId, platform);
			break;

		case 'complete_onboarding':
			if (threadView.nextStep.intent !== 'complete_onboarding' || onboardingStatus !== 'in_progress') {
				return json(
					{ message: 'Onboarding can only complete after the onboarding packet is active.' },
					{ status: 409 }
				);
			}
			await completePersistedThreadOnboarding(sessionId, threadId, platform);
			break;

		case 'resolve_reconnect':
			await resolvePersistedThreadReconnect(sessionId, threadId, platform);
			break;
	}

	let nextThreadView = await getRequiredThreadView(sessionId, threadId, platform);

	if (indeedDispositionStatus && shouldAttemptIndeedDispositionWriteback(nextThreadView.thread)) {
		const writeback = await recordIndeedDispositionWriteback({
			thread: nextThreadView.thread,
			dispositionStatus: indeedDispositionStatus,
			platform,
			fetch
		});

		if (!writeback.skipped) {
			await applyPersistedIndeedDispositionSync(
				sessionId,
				threadId,
				{
					dispositionStatus: writeback.dispositionStatus,
					syncState: writeback.syncState,
					note: writeback.note,
					recordedAt: writeback.recordedAt
				},
				platform
			);
			nextThreadView = await getRequiredThreadView(sessionId, threadId, platform);
		}
	}

	return json({
		ok: true,
		threadId,
		threadView: nextThreadView
	});
};
