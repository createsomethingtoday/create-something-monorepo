import type { ThreadViewState } from './prototype-session';

export const CONCIERGE_SESSION_DEPENDENCY = 'app:concierge-session';
export const CONCIERGE_THREAD_MUTATION_EVENT = 'concierge-thread-mutated';

export const threadActionTypes = [
	'confirm_fields',
	'reject_fields',
	'capture_consent',
	'book_appointment',
	'complete_review',
	'start_staffing_outreach',
	'submit_to_facility',
	'record_facility_interview',
	'confirm_placement',
	'close_staffing_request',
	'start_onboarding',
	'complete_onboarding',
	'resolve_reconnect'
] as const;

export type ThreadActionType = (typeof threadActionTypes)[number];

export interface ThreadActionRequest {
	type: ThreadActionType;
	fieldKeys?: string[];
	slotId?: string;
}

export interface ThreadCreateResponse {
	ok: true;
	threadId: string;
}

export interface ThreadMutationResponse {
	ok: true;
	threadId: string;
	threadView: ThreadViewState;
}

export interface ThreadAttachmentUploadResponse extends ThreadMutationResponse {
	uploaded: Array<{
		documentKey: string;
		title: string;
		fileName: string;
		byteSize: number;
	}>;
}

export interface SessionResetResponse {
	ok: true;
}

export interface AgencyAccessPreviewResponse {
	ok: true;
	mode: string | null;
}

export interface IntakeVerificationRequestResponse {
	ok: true;
	mode: 'email' | 'preview';
	email: string;
	expiresAt: string;
	previewCode?: string;
}

export interface IntakeVerificationVerifyResponse {
	ok: true;
	email: string;
	grantExpiresAt: string;
}

export function isThreadActionType(value: string): value is ThreadActionType {
	return threadActionTypes.includes(value as ThreadActionType);
}
