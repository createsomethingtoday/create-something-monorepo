export type ArtifactKind =
	| 'profile_snapshot'
	| 'indeed_application_receipt'
	| 'consent_receipt'
	| 'upload'
	| 'shortlist_packet'
	| 'appointment_confirmation'
	| 'review_summary'
	| 'staffing_outreach_note'
	| 'facility_submission'
	| 'facility_response'
	| 'placement_confirmation'
	| 'staffing_closure'
	| 'onboarding_handoff_packet'
	| 'onboarding_completion'
	| 'handoff_packet'
	| 'indeed_disposition_receipt'
	| 'tool_action';

export interface ChatArtifact {
	id: string;
	kind: ArtifactKind;
	title: string;
	summary: string;
	createdAt: string;
	status: 'ready' | 'pending' | 'blocked';
	source: string;
	href?: string;
	documentKey?: string;
	fileName?: string;
	contentType?: string;
	byteSize?: number;
	storageKey?: string;
}
