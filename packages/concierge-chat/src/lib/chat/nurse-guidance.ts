import {
	formatRecruiterSlot,
	getSelectedRecruiterSlot
} from './matching-model';
import { PREFERRED_LOCATION_LABEL } from './location-resolver';
import type { ConciergeThread, OnboardingQueueStatus, StaffingQueueStatus } from './thread-store';
import {
	getConfirmableFields,
	getMissingIntakeFieldLabels,
	getMissingRequiredDocumentSpecs,
	getRejectedConfirmableFields,
	hasCollectedIntakeData,
	hasStartedIntake,
	isMatchingReady,
	needsConsent,
	needsDocumentUpload,
	needsToolReconnect
} from './workflow';

export interface NurseGuidance {
	eyebrow: string;
	title: string;
	body: string;
	helper?: string;
	tone: 'neutral' | 'warn' | 'good';
	chatReply: string;
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

function getMissingIntakePrompt(label: string) {
	switch (label) {
		case 'compact license status':
			return {
				title: 'Do you have an active compact license?',
				body: 'A quick yes or no is enough here in chat.',
				helper:
					'Once I have that, I will move you into the in-thread document step for your resume and license image.',
				chatReply:
					'Do you have an active compact license? A quick yes or no is enough here in chat. Once I have that, I will move you into the document step.'
			};
		case 'specialty':
			return {
				title: 'What nursing specialty are you targeting?',
				body: 'Reply with the specialty you want this search built around.',
				helper:
					'Once I have that, I will keep building your application here in chat.',
				chatReply:
					'What nursing specialty are you targeting? Reply with the specialty you want this search built around, and I will keep building your application here in chat.'
			};
		case 'preferred shift':
			return {
				title: 'What shift do you want most?',
				body: 'Reply with days, nights, or any shift preference that matters to you.',
				helper:
					'Once I have that, I will keep building your application here in chat.',
				chatReply:
					'What shift do you want most? Reply with days, nights, or any shift preference that matters to you, and I will keep building your application here in chat.'
			};
		case PREFERRED_LOCATION_LABEL.toLowerCase():
			return {
				title: 'What locations should I keep this search focused on?',
				body: 'Tell me the states, city radius, metro, or travel range you want me to use.',
				helper:
					'Common shorthand like DFW, Phoenix, Bay Area, or Texas works here too. Once I have that, I can move you toward the document and review steps here in chat.',
				chatReply:
					'What locations should I keep this search focused on? Tell me the states, city radius, metro, or travel range you want me to use. Common shorthand like DFW or Bay Area works too.'
			};
		default:
			return {
				title: `Tell me your ${label}`,
				body: 'Reply here in chat and I will update your application.',
				helper:
					'Once I have that, I will keep guiding the next step here in the thread.',
				chatReply: `Tell me your ${label} here in chat and I will update your application.`
			};
	}
}

function lowerCaseDocumentTitles(thread: ConciergeThread) {
	return getMissingRequiredDocumentSpecs(thread).map((spec) => spec.title.toLowerCase());
}

function getStaffingQueueGuidance(status: StaffingQueueStatus): NurseGuidance {
	switch (status) {
		case 'outreach_started':
			return {
				eyebrow: 'Concierge',
				title: 'Our staffing team is taking it from here',
				body: 'Your recruiter review is complete and our staffing team is now reaching out on your behalf.',
				helper: 'You do not need to upload anything else right now. I will update you here if a facility asks for more information.',
				tone: 'good',
				chatReply:
					'Your recruiter review is complete and our staffing team is now reaching out on your behalf. You do not need to upload anything else right now.'
			};
		case 'submitted':
			return {
				eyebrow: 'Concierge',
				title: 'Your profile is with the facility',
				body: 'Our team has submitted your profile to the facility.',
				helper: 'You do not need to do anything else right now. I will update you here as soon as we hear back.',
				tone: 'good',
				chatReply:
					'Our team has submitted your profile to the facility. You do not need to do anything else right now, and I will update you here as soon as we hear back.'
			};
		case 'interview_requested':
			return {
				eyebrow: 'Concierge',
				title: 'Good news: the facility wants to interview',
				body: 'The facility asked to move forward with an interview.',
				helper: 'Our team will coordinate the next details with you here.',
				tone: 'good',
				chatReply:
					'Good news: the facility wants to interview. Our team will coordinate the next details with you here.'
			};
		case 'placement_confirmed':
			return {
				eyebrow: 'Concierge',
				title: 'Good news: your placement is confirmed',
				body: 'The facility confirmed your placement and our onboarding team is stepping in next.',
				helper: 'You do not need to log in anywhere else. We will ask for anything remaining here in chat.',
				tone: 'good',
				chatReply:
					'Good news: your placement is confirmed. Our onboarding team is stepping in next, and we will ask for anything remaining here in chat.'
			};
		case 'closed':
			return {
				eyebrow: 'Concierge',
				title: 'This request is closed for now',
				body: 'This specific request has been closed.',
				helper: 'If you want another role, reply here and I can reopen matching for you.',
				tone: 'warn',
				chatReply:
					'This specific request has been closed. If you want another role, reply here and I can reopen matching for you.'
			};
		default:
			return {
				eyebrow: 'Concierge',
				title: 'Our recruiting team is reviewing your packet',
				body: 'Your booking is complete and the review packet is in motion.',
				helper: 'You do not need to do anything else right now. I will update you here if anything else is needed.',
				tone: 'good',
				chatReply:
					'Your booking is complete and the review packet is in motion. You do not need to do anything else right now.'
			};
	}
}

function getOnboardingGuidance(status: OnboardingQueueStatus): NurseGuidance {
	switch (status) {
		case 'in_progress':
			return {
				eyebrow: 'Concierge',
				title: 'Onboarding is in progress',
				body: 'Our onboarding team is working through the final checklist for your start.',
				helper: 'You do not need a separate login. If anything else is needed, we will ask for it here in chat.',
				tone: 'good',
				chatReply:
					'Our onboarding team is working through the final checklist for your start. If anything else is needed, we will ask for it here in chat.'
			};
		case 'completed':
			return {
				eyebrow: 'Concierge',
				title: 'You are start-ready',
				body: 'Your onboarding checklist is complete and you are cleared for the next launch step.',
				helper: 'We will use this chat for any final operational updates.',
				tone: 'good',
				chatReply:
					'Your onboarding checklist is complete and you are start-ready. We will use this chat for any final operational updates.'
			};
		default:
			return {
				eyebrow: 'Concierge',
				title: 'Onboarding is next',
				body: 'Your placement is confirmed and our onboarding team is taking it from here.',
				helper: 'You do not need to upload anything else right now unless I ask for it here in chat.',
				tone: 'good',
				chatReply:
					'Your placement is confirmed and our onboarding team is taking it from here. You do not need to upload anything else right now unless I ask for it here in chat.'
			};
	}
}

export function getNurseGuidance(
	thread: ConciergeThread,
	options?: { intakeVerified?: boolean }
): NurseGuidance {
	const intakeVerified = options?.intakeVerified;
	const confirmableFields = getConfirmableFields(thread);
	const missingBasics = getMissingIntakeFieldLabels(thread).map((label) => label.toLowerCase());
	const rejectedFields = getRejectedConfirmableFields(thread);
	const uploadPending = needsDocumentUpload(thread);
	const consentPending = needsConsent(thread);
	const reconnectPending = needsToolReconnect(thread);
	const selectedSlot = getSelectedRecruiterSlot(thread.matching);
	const missingDocuments = lowerCaseDocumentTitles(thread);

	if (thread.handoff?.kind === 'staffing_queue') {
		return getStaffingQueueGuidance(thread.handoff.queueStatus ?? 'queued');
	}

	if (thread.handoff?.kind === 'onboarding_queue') {
		return getOnboardingGuidance(thread.handoff.onboardingStatus ?? 'queued');
	}

	if (thread.handoff?.kind === 'escalation') {
		return {
			eyebrow: 'Concierge',
			title: 'Our team is reviewing one detail manually',
			body: 'I escalated part of this application for manual review.',
			helper: 'You do not need to log in anywhere else. I will update you here when that review is finished.',
			tone: 'warn',
			chatReply:
				'I escalated part of this application for manual review. You do not need to log in anywhere else, and I will update you here when that review is finished.'
		};
	}

	if (thread.matching?.status === 'booked' && isMatchingReady(thread)) {
		return {
			eyebrow: 'Concierge',
			title: 'You are booked for recruiter review',
			body: selectedSlot
				? `Your recruiter review is set for ${formatRecruiterSlot(selectedSlot)}.`
				: 'Your recruiter review is booked.',
			helper:
				'You do not need to upload anything else or sign in anywhere else right now. Our team will take it from here and follow up if anything else is needed.',
			tone: 'good',
			chatReply: selectedSlot
				? `Your recruiter review is set for ${formatRecruiterSlot(selectedSlot)}. You do not need to upload anything else or sign in anywhere else right now.`
				: 'Your recruiter review is booked. You do not need to upload anything else or sign in anywhere else right now.'
		};
	}

	if (isMatchingReady(thread)) {
		return {
			eyebrow: 'Concierge',
			title: 'Choose a recruiter review time below',
			body: 'I have what I need to move you into recruiter review.',
			helper: 'Pick the time that works best for you in the booking card below. Once you book, our team will take it from there.',
			tone: 'good',
			chatReply:
				'I have what I need to move you into recruiter review. Pick the time that works best for you in the booking card below.'
		};
	}

	if (!hasStartedIntake(thread)) {
		return {
			eyebrow: 'Concierge',
			title: 'Start by telling me what kind of role you want',
			body: 'You can answer in plain language. I will build your application while we chat.',
			helper: 'A good first message is your specialty, preferred shift, and where you want to work.',
			tone: 'neutral',
			chatReply:
				'Tell me what kind of role you want in plain language, and I will build your application while we chat.'
		};
	}

	if (!hasCollectedIntakeData(thread)) {
		if (missingBasics.length === 1) {
			const prompt = getMissingIntakePrompt(missingBasics[0]);

			return {
				eyebrow: 'Concierge',
				title: prompt.title,
				body: prompt.body,
				helper: prompt.helper,
				tone: 'neutral',
				chatReply: prompt.chatReply
			};
		}

		return {
			eyebrow: 'Concierge',
			title: 'Keep going in chat',
			body: `I still need your ${formatLabelList(missingBasics)} before I can move you into the document step.`,
			helper:
				'Reply naturally here in chat. Once I have those basics, I will ask for your resume and compact license image right here in this thread.',
			tone: 'neutral',
			chatReply: `I still need your ${formatLabelList(
				missingBasics
			)} before I can move you into the document step. Reply naturally here in chat and I will guide it from there.`
		};
	}

	if (rejectedFields.length > 0) {
		return {
			eyebrow: 'Concierge',
			title: 'Send the corrected details in chat',
			body: `I still need updated information for ${formatLabelList(
				rejectedFields.map((field) => field.label.toLowerCase())
			)}.`,
			helper: 'Reply in chat with the corrected details and I will update your application.',
			tone: 'warn',
			chatReply: `Please send the corrected ${formatLabelList(
				rejectedFields.map((field) => field.label.toLowerCase())
			)} here in chat and I will update your application.`
		};
	}

	if (confirmableFields.length > 0 && uploadPending) {
		return {
			eyebrow: 'Concierge',
			title:
				intakeVerified === false
					? 'Confirm your details, then verify your email to upload here in chat'
					: 'Confirm your details, then upload your documents here in chat',
			body: `I have enough to move forward, but I still need confirmation for ${formatLabelList(
				confirmableFields.map((field) => field.label.toLowerCase())
			)} and ${formatLabelList(missingDocuments)}.`,
			helper:
				intakeVerified === false
					? 'Use the confirmation card below, then verify your email in this thread. The upload card will stay right here in chat.'
					: 'Use the confirmation card below, then upload the required files in the upload card right here in chat.',
			tone: 'warn',
			chatReply: `I have enough to move forward, but I still need confirmation for ${formatLabelList(
				confirmableFields.map((field) => field.label.toLowerCase())
			)} and ${formatLabelList(missingDocuments)} before I can unlock recruiter review.`
		};
	}

	if (confirmableFields.length > 0) {
		return {
			eyebrow: 'Concierge',
			title: 'Confirm the highlighted details below',
			body: `I still need an explicit yes or edit for ${formatLabelList(
				confirmableFields.map((field) => field.label.toLowerCase())
			)}.`,
			helper: 'Use the confirmation card below or reply in chat with corrections.',
			tone: 'warn',
			chatReply: `I still need an explicit yes or edit for ${formatLabelList(
				confirmableFields.map((field) => field.label.toLowerCase())
			)} before I can keep moving.`
		};
	}

	if (uploadPending) {
		return {
			eyebrow: 'Concierge',
			title:
				intakeVerified === false
					? 'Verify your email, then upload your documents here in chat'
					: 'Upload your documents here in chat',
			body: `Next I need your ${formatLabelList(missingDocuments)}.`,
			helper:
				intakeVerified === false
					? 'First verify your email in this thread. Then use the upload card below to attach the files right here in chat.'
					: 'Use the upload card below to attach the files right here in chat. You do not need .agency or another login.',
			tone: 'warn',
			chatReply: `Next I need your ${formatLabelList(missingDocuments)}. Use the upload card below here in chat when you are ready.`
		};
	}

	if (consentPending) {
		return {
			eyebrow: 'Concierge',
			title: 'Confirm consent to keep moving',
			body: 'I have the profile details and documents I need, but I still need your consent before I continue.',
			helper: 'Use the consent card below in this thread.',
			tone: 'warn',
			chatReply:
				'I have the profile details and documents I need, but I still need your consent before I continue. Use the consent card below in this thread.'
		};
	}

	if (reconnectPending) {
		return {
			eyebrow: 'Concierge',
			title: 'I am reconnecting one verification step',
			body: 'Your application is still in motion, but one verification dependency needs to recover before I can continue.',
			helper: 'You do not need another nurse login here. I will keep the thread updated as soon as it clears.',
			tone: 'warn',
			chatReply:
				'Your application is still in motion, but one verification dependency needs to recover before I can continue. You do not need another nurse login here.'
		};
	}

	return {
		eyebrow: 'Concierge',
		title: 'Keep going in chat',
		body: 'Reply here in plain language and I will guide the next step.',
		helper: 'When I need a file or a confirmation, the right card will appear directly in this thread.',
		tone: 'neutral',
		chatReply:
			'Reply here in plain language and I will guide the next step. When I need a file or a confirmation, the right card will appear directly in this thread.'
	};
}
