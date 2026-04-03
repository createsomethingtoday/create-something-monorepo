import type { ConciergeThread } from '$chat/thread-store';
import { formatRecruiterSlot, getSelectedRecruiterSlot } from './matching-model';
import {
	getConfirmableFields,
	getMissingIntakeFieldLabels,
	getRejectedConfirmableFields,
	hasCollectedIntakeData,
	hasStartedIntake,
	isMatchingReady,
	needsConsent,
	needsDocumentUpload,
	needsToolReconnect
} from './workflow';

export interface NextStepRecommendation {
	label: string;
	description: string;
	intent:
		| 'confirm_fields'
		| 'correct_fields'
		| 'upload_documents'
		| 'book_appointment'
		| 'complete_review'
		| 'start_staffing_outreach'
		| 'submit_to_facility'
		| 'record_facility_response'
		| 'confirm_placement'
		| 'start_onboarding'
		| 'complete_onboarding'
		| 'reconnect_tool'
		| 'wait_for_review'
		| 'wait_for_staffing'
		| 'ready';
	blocked: boolean;
	policyRef: string;
}

function formatLabelList(values: string[]) {
	if (values.length === 0) {
		return '';
	}

	if (values.length === 1) {
		return values[0];
	}

	if (values.length === 2) {
		return `${values[0]} and ${values[1]}`;
	}

	return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

export function determineNextStep(thread: ConciergeThread): NextStepRecommendation {
	if (!hasStartedIntake(thread)) {
		return {
			label: 'Start intake',
			description:
				'The concierge is waiting for the first nurse message before it can build the governed profile.',
			intent: 'confirm_fields',
			blocked: false,
			policyRef: thread.turn.policyRef
		};
	}

	if (!hasCollectedIntakeData(thread)) {
		const missingBasics = getMissingIntakeFieldLabels(thread).map((label) => label.toLowerCase());

		return {
			label: 'Continue intake',
			description:
				`The concierge still needs ${formatLabelList(
					missingBasics
				)} before it can move into secure document collection and recruiter review.`,
			intent: 'confirm_fields',
			blocked: false,
			policyRef: thread.turn.policyRef
		};
	}

	if (thread.handoff?.kind === 'escalation') {
		return {
			label: 'Wait for operator review',
			description:
				'The workflow has already escalated. The next user-visible action is an update from the human review queue.',
			intent: 'wait_for_review',
			blocked: true,
			policyRef: thread.turn.policyRef
		};
	}

	if (thread.handoff?.kind === 'onboarding_queue') {
		const onboardingStatus = thread.handoff.onboardingStatus ?? 'queued';

		if (onboardingStatus === 'queued') {
			return {
				label: 'Start onboarding',
				description:
					'Placement is confirmed and the onboarding packet is queued. Start the onboarding phase to hand the candidate into launch operations.',
				intent: 'start_onboarding',
				blocked: false,
				policyRef: thread.turn.policyRef
			};
		}

		if (onboardingStatus === 'in_progress') {
			return {
				label: 'Complete onboarding',
				description:
					'The onboarding packet is active. Complete the governed onboarding checklist once orientation and compliance steps are covered.',
				intent: 'complete_onboarding',
				blocked: false,
				policyRef: thread.turn.policyRef
			};
		}

		return {
			label: 'Onboarding complete',
			description:
				'The onboarding workflow reached its terminal state. The candidate is ready for start confirmation and downstream launch operations.',
			intent: 'ready',
			blocked: false,
			policyRef: thread.turn.policyRef
		};
	}

	if (thread.handoff?.kind === 'staffing_queue') {
		const queueStatus = thread.handoff.queueStatus ?? 'queued';

		if (queueStatus === 'queued') {
			return {
				label: 'Start staffing outreach',
				description:
					'Recruiter review is complete. The next step is claiming the staffing packet and beginning coordinator outreach.',
				intent: 'start_staffing_outreach',
				blocked: false,
				policyRef: thread.turn.policyRef
			};
		}

		if (queueStatus === 'outreach_started') {
			return {
				label: 'Submit to facility',
				description:
					'Coordinator outreach is underway. The approved staffing packet is ready for facility submission.',
				intent: 'submit_to_facility',
				blocked: false,
				policyRef: thread.turn.policyRef
			};
		}

		if (queueStatus === 'submitted') {
			return {
				label: 'Record facility response',
				description:
					'The staffing packet is submitted. Use the governed response step to record whether the facility wants to move forward.',
				intent: 'record_facility_response',
				blocked: false,
				policyRef: thread.turn.policyRef
			};
		}

		if (queueStatus === 'interview_requested') {
			return {
				label: 'Confirm placement outcome',
				description:
					'The facility requested an interview. The next governed update is the final placement outcome.',
				intent: 'confirm_placement',
				blocked: false,
				policyRef: thread.turn.policyRef
			};
		}

		if (queueStatus === 'placement_confirmed') {
			return {
				label: 'Start onboarding',
				description:
					'The staffing flow reached a successful outcome. Route the confirmed placement into onboarding rather than ending the governed thread here.',
				intent: 'start_onboarding',
				blocked: false,
				policyRef: thread.turn.policyRef
			};
		}

		if (queueStatus === 'closed') {
			return {
				label: 'Request closed',
				description:
					'The facility closed this submission. Reopen matching in a future workflow only if the candidate wants another role.',
				intent: 'ready',
				blocked: false,
				policyRef: thread.turn.policyRef
			};
		}

		return {
			label: 'Wait for facility response',
			description:
				'The staffing packet has been submitted. The next state change should come from the facility response.',
			intent: 'wait_for_staffing',
			blocked: false,
			policyRef: thread.turn.policyRef
		};
	}

	if (getRejectedConfirmableFields(thread).length > 0) {
		return {
			label: 'Correct rejected preference details',
			description:
				'The concierge is waiting on corrected preference details before it can continue with matching.',
			intent: 'correct_fields',
			blocked: true,
			policyRef: thread.turn.policyRef
		};
	}

	if (needsDocumentUpload(thread) || needsConsent(thread)) {
		return {
			label: 'Upload documents and confirm details',
			description:
				'Enough has been inferred to keep the chat natural, but matching remains blocked until consent and supporting documents are captured.',
			intent: 'upload_documents',
			blocked: true,
			policyRef: thread.turn.policyRef
		};
	}

	if (needsToolReconnect(thread)) {
		return {
			label: 'Reconnect blocked tool',
			description:
				'A required downstream system lost auth. Route the user through reconnect before making another tool call.',
			intent: 'reconnect_tool',
			blocked: true,
			policyRef: thread.turn.policyRef
		};
	}

	if (getConfirmableFields(thread).length > 0) {
		return {
			label: 'Confirm profile details',
			description: 'Ask for the minimum explicit confirmations needed to continue safely.',
			intent: 'confirm_fields',
			blocked: false,
			policyRef: thread.turn.policyRef
		};
	}

	if (thread.matching?.status === 'booked') {
		const selectedSlot = getSelectedRecruiterSlot(thread.matching);

		return {
			label: selectedSlot
				? `Complete recruiter review: ${formatRecruiterSlot(selectedSlot)}`
				: 'Complete recruiter review',
			description:
				'The shortlist is staged and the recruiter review is booked. Complete the recruiter pass to queue the governed staffing handoff.',
			intent: 'complete_review',
			blocked: false,
			policyRef: thread.turn.policyRef
		};
	}

	if (isMatchingReady(thread)) {
		return {
			label: 'Book recruiter review',
			description:
				'The concierge has the confirmations, consent, documents, and reconnect state it needs to stage the shortlist and book recruiter follow-up.',
			intent: 'book_appointment',
			blocked: false,
			policyRef: thread.turn.policyRef
		};
	}

	return {
		label: 'Confirm profile details',
		description: 'Ask for the minimum explicit confirmations needed to continue safely.',
		intent: 'confirm_fields',
		blocked: false,
		policyRef: thread.turn.policyRef
	};
}
