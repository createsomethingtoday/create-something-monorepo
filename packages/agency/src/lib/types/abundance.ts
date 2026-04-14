/**
 * Abundance Network Types
 * Subtractive approach: Only types needed for core matching
 */

// ============================================
// Seeker Types
// ============================================

export interface Seeker {
	id: string;
	phone: string;
	name: string;
	email?: string;
	brand_name?: string;
	brand_vibe?: string;
	website?: string;
	typical_budget_min?: number;
	typical_budget_max?: number;
	preferred_formats?: string[];
	readiness_score: number;
	status: 'active' | 'inactive' | 'onboarding';
	created_at: string;
	updated_at: string;
}

export interface SeekerInput {
	phone: string;
	name: string;
	email?: string;
	brand_name?: string;
	brand_vibe?: string;
	website?: string;
	typical_budget_min?: number;
	typical_budget_max?: number;
	preferred_formats?: string[];
	readiness_score?: number;
}

// ============================================
// Talent Types
// ============================================

export interface Talent {
	id: string;
	phone: string;
	name: string;
	email?: string;
	portfolio_url?: string;
	instagram?: string;
	skills: string[];
	styles?: string[];
	hourly_rate_min?: number;
	hourly_rate_max?: number;
	availability: 'available' | 'busy' | 'unavailable';
	timezone?: string;
	abundance_index: number;
	status: 'active' | 'inactive' | 'onboarding';
	created_at: string;
	updated_at: string;
}

export interface TalentInput {
	phone: string;
	name: string;
	email?: string;
	portfolio_url?: string;
	instagram?: string;
	skills: string[];
	styles?: string[];
	hourly_rate_min?: number;
	hourly_rate_max?: number;
	availability?: 'available' | 'busy' | 'unavailable';
	timezone?: string;
	abundance_index?: number;
}

// ============================================
// Match Types
// ============================================

export interface Match {
	id: string;
	seeker_id: string;
	talent_id: string;
	job_title?: string;
	job_description?: string;
	deliverables?: string[];
	budget?: number;
	deadline?: string;
	fit_score: number;
	fit_breakdown?: FitBreakdown;
	status: MatchStatus;
	seeker_rating?: number;
	seeker_feedback?: string;
	talent_rating?: number;
	talent_feedback?: string;
	created_at: string;
	resolved_at?: string;
}

export type MatchStatus =
	| 'suggested'
	| 'accepted'
	| 'declined'
	| 'in_progress'
	| 'completed'
	| 'cancelled';

export interface FitBreakdown {
	skills: number;
	budget: number;
	availability: number;
}

export interface MatchRequest {
	seeker_id: string;
	job_title: string;
	job_description?: string;
	deliverables?: string[];
	budget?: number;
	deadline?: string;
	required_skills?: string[];
	preferred_styles?: string[];
}

export interface MatchResult {
	talent: Talent;
	fit_score: number;
	fit_breakdown: FitBreakdown;
}

// ============================================
// Intake Types (Hermeneutic Spiral)
// ============================================

export interface Intake {
	id: string;
	user_id: string;
	user_type: 'seeker' | 'talent';
	intake_type: 'onboarding' | 'new_job' | 'checkin' | 'feedback';
	data: Record<string, unknown>;
	summary?: string;
	previous_intake_id?: string;
	created_at: string;
}

export interface IntakeInput {
	user_id: string;
	user_type: 'seeker' | 'talent';
	intake_type: 'onboarding' | 'new_job' | 'checkin' | 'feedback';
	data: Record<string, unknown>;
	summary?: string;
	previous_intake_id?: string;
}

// ============================================
// Nurse Staffing Foundation Types
// ============================================

export type PersonRole = 'candidate' | 'recruiter' | 'facility_contact' | 'operator' | 'unknown';
export type PersonStatus = 'active' | 'inactive' | 'onboarding';

export interface Person {
	id: string;
	phone?: string;
	email?: string;
	name: string;
	primary_role: PersonRole;
	status: PersonStatus;
	source?: string;
	created_at: string;
	updated_at: string;
}

export interface PersonInput {
	phone?: string;
	email?: string;
	name: string;
	primary_role?: PersonRole;
	status?: PersonStatus;
	source?: string;
}

export type CandidateProfession = 'rn' | 'lpn' | 'lvn' | 'cna' | 'allied' | 'other';
export type CandidateProfileStatus = 'draft' | 'ready_for_review' | 'eligible' | 'inactive';

export interface CandidateProfile {
	id: string;
	person_id: string;
	profession: CandidateProfession;
	specialty_primary?: string;
	specialties: string[];
	years_experience?: number;
	recent_specialty_months?: number;
	contract_preferences?: string[];
	shift_preferences?: string[];
	start_window_start?: string;
	start_window_end?: string;
	travel_radius_miles?: number;
	preferred_locations?: string[];
	home_state?: string;
	compact_license: boolean;
	compact_states?: string[];
	pay_floor_weekly?: number;
	pay_target_weekly?: number;
	available_from?: string;
	recruiter_notes?: string;
	profile_status: CandidateProfileStatus;
	created_at: string;
	updated_at: string;
}

export interface CandidateProfileInput {
	person_id: string;
	profession?: CandidateProfession;
	specialty_primary?: string;
	specialties?: string[];
	years_experience?: number;
	recent_specialty_months?: number;
	contract_preferences?: string[];
	shift_preferences?: string[];
	start_window_start?: string;
	start_window_end?: string;
	travel_radius_miles?: number;
	preferred_locations?: string[];
	home_state?: string;
	compact_license?: boolean;
	compact_states?: string[];
	pay_floor_weekly?: number;
	pay_target_weekly?: number;
	available_from?: string;
	recruiter_notes?: string;
	profile_status?: CandidateProfileStatus;
}

export type CandidateLicenseStatus = 'active' | 'pending' | 'expired' | 'inactive' | 'unknown';

export interface CandidateLicense {
	id: string;
	candidate_profile_id: string;
	license_type: string;
	issuing_state: string;
	license_number?: string;
	compact_privilege: boolean;
	status: CandidateLicenseStatus;
	expires_at?: string;
	verification_source?: string;
	verified_at?: string;
	created_at: string;
	updated_at: string;
}

export interface CandidateLicenseInput {
	candidate_profile_id: string;
	license_type: string;
	issuing_state: string;
	license_number?: string;
	compact_privilege?: boolean;
	status?: CandidateLicenseStatus;
	expires_at?: string;
	verification_source?: string;
	verified_at?: string;
}

export type CandidateCredentialStatus = 'active' | 'pending' | 'expired' | 'unknown';

export interface CandidateCredential {
	id: string;
	candidate_profile_id: string;
	credential_type: string;
	status: CandidateCredentialStatus;
	expires_at?: string;
	verification_source?: string;
	verified_at?: string;
	metadata_json?: string;
	created_at: string;
	updated_at: string;
}

export interface CandidateCredentialInput {
	candidate_profile_id: string;
	credential_type: string;
	status?: CandidateCredentialStatus;
	expires_at?: string;
	verification_source?: string;
	verified_at?: string;
	metadata_json?: string;
}

export type CandidateDocumentType =
	| 'resume'
	| 'skills_checklist'
	| 'reference'
	| 'immunization'
	| 'background_check'
	| 'license_copy'
	| 'consent'
	| 'other';

export type CandidateDocumentStatus = 'missing' | 'pending' | 'received' | 'verified' | 'rejected';

export interface CandidateDocument {
	id: string;
	candidate_profile_id: string;
	document_type: CandidateDocumentType;
	status: CandidateDocumentStatus;
	storage_url?: string;
	consent_scope?: string;
	uploaded_at?: string;
	verified_at?: string;
	metadata_json?: string;
	created_at: string;
	updated_at: string;
}

export interface CandidateDocumentInput {
	candidate_profile_id: string;
	document_type: CandidateDocumentType;
	status?: CandidateDocumentStatus;
	storage_url?: string;
	consent_scope?: string;
	uploaded_at?: string;
	verified_at?: string;
	metadata_json?: string;
}

export type OpeningContractType = 'travel' | 'staff' | 'local_contract' | 'per_diem' | 'other';
export type OpeningStatus = 'open' | 'paused' | 'closed' | 'stale';

export interface Opening {
	id: string;
	external_dedupe_key?: string;
	facility_name: string;
	profession: string;
	specialty: string;
	sub_specialty?: string;
	city?: string;
	state?: string;
	location_label?: string;
	contract_type: OpeningContractType;
	shift_type?: string;
	schedule_summary?: string;
	start_date?: string;
	assignment_length_weeks?: number;
	pay_package_min_weekly?: number;
	pay_package_max_weekly?: number;
	stipend_housing_weekly?: number;
	stipend_meals_weekly?: number;
	license_states?: string[];
	compact_eligible: boolean;
	required_credentials?: string[];
	required_documents?: string[];
	source_count: number;
	status: OpeningStatus;
	first_seen_at: string;
	last_seen_at: string;
	created_at: string;
	updated_at: string;
}

export interface OpeningInput {
	external_dedupe_key?: string;
	facility_name: string;
	profession?: string;
	specialty: string;
	sub_specialty?: string;
	city?: string;
	state?: string;
	location_label?: string;
	contract_type?: OpeningContractType;
	shift_type?: string;
	schedule_summary?: string;
	start_date?: string;
	assignment_length_weeks?: number;
	pay_package_min_weekly?: number;
	pay_package_max_weekly?: number;
	stipend_housing_weekly?: number;
	stipend_meals_weekly?: number;
	license_states?: string[];
	compact_eligible?: boolean;
	required_credentials?: string[];
	required_documents?: string[];
	source_count?: number;
	status?: OpeningStatus;
}

export type SourceListingType = 'travel' | 'staff' | 'local_contract' | 'per_diem' | 'other';
export type SourceListingFreshness = 'fresh' | 'stale' | 'unknown';
export type SourceListingTrustTier = 'primary' | 'secondary' | 'manual' | 'unknown';

export interface SourceListing {
	id: string;
	canonical_opening_id?: string;
	source_slug: string;
	external_listing_id: string;
	source_url: string;
	listing_type: SourceListingType;
	freshness_status: SourceListingFreshness;
	trust_tier: SourceListingTrustTier;
	fetched_at: string;
	raw_payload?: string;
	created_at: string;
}

export interface SourceListingInput {
	canonical_opening_id?: string;
	source_slug: string;
	external_listing_id: string;
	source_url: string;
	listing_type?: SourceListingType;
	freshness_status?: SourceListingFreshness;
	trust_tier?: SourceListingTrustTier;
	fetched_at?: string;
	raw_payload?: string;
}

export type ApplicationStatus =
	| 'draft'
	| 'submitted'
	| 'screening'
	| 'shortlisted'
	| 'interview'
	| 'offer'
	| 'placed'
	| 'closed'
	| 'rejected';

export interface Application {
	id: string;
	candidate_profile_id: string;
	opening_id: string;
	source_listing_id?: string;
	recruiter_person_id?: string;
	external_apply_url?: string;
	status: ApplicationStatus;
	submitted_at?: string;
	last_status_at?: string;
	notes?: string;
	created_at: string;
	updated_at: string;
}

export interface ApplicationInput {
	candidate_profile_id: string;
	opening_id: string;
	source_listing_id?: string;
	recruiter_person_id?: string;
	external_apply_url?: string;
	status?: ApplicationStatus;
	submitted_at?: string;
	last_status_at?: string;
	notes?: string;
}

export type EligibilityDecision = 'eligible' | 'needs_review' | 'ineligible';

export interface EligibilityCheck {
	id: string;
	candidate_profile_id: string;
	opening_id: string;
	decision: EligibilityDecision;
	hard_fail_reasons?: string[];
	missing_requirements?: string[];
	warnings?: string[];
	fit_score?: number;
	evaluated_at: string;
	created_at: string;
}

export interface EligibilityCheckRequest {
	candidate_profile_id: string;
	opening_id: string;
}

export interface EligibilityCheckInput extends EligibilityCheckRequest {
	decision: EligibilityDecision;
	hard_fail_reasons?: string[];
	missing_requirements?: string[];
	warnings?: string[];
	fit_score?: number;
	evaluated_at?: string;
}

export type HandoffStatus = 'open' | 'accepted' | 'completed' | 'cancelled';

export interface Handoff {
	id: string;
	candidate_profile_id?: string;
	opening_id?: string;
	recruiter_person_id?: string;
	queue_slug?: string;
	status: HandoffStatus;
	reason: string;
	sla_due_at?: string;
	acknowledged_at?: string;
	resolved_at?: string;
	notes_json?: string;
	created_at: string;
	updated_at: string;
}

export interface HandoffInput {
	candidate_profile_id?: string;
	opening_id?: string;
	recruiter_person_id?: string;
	queue_slug?: string;
	status?: HandoffStatus;
	reason: string;
	sla_due_at?: string;
	acknowledged_at?: string;
	resolved_at?: string;
	notes_json?: string;
}

export interface CandidateEvent {
	id: string;
	candidate_profile_id?: string;
	opening_id?: string;
	application_id?: string;
	event_type: string;
	source?: string;
	metadata_json?: string;
	event_at: string;
}

export interface CandidateEventInput {
	candidate_profile_id?: string;
	opening_id?: string;
	application_id?: string;
	event_type: string;
	source?: string;
	metadata_json?: string;
	event_at?: string;
}

export interface NurseIntakeDocuments {
	resume_url?: string;
	skills_checklist_url?: string;
	license_copy_url?: string;
}

export interface NurseIntakeConsent {
	granted: boolean;
	scope?: string;
	granted_at?: string;
	disclosure?: string;
}

export interface NurseIntakeContext {
	intake_channel?: string;
	opening_id?: string;
	source_listing_id?: string;
	recruiter_person_id?: string;
	source?: string;
	notes?: string;
}

export interface NurseIntakeInput {
	person: PersonInput & { primary_role?: 'candidate' };
	profile: Omit<CandidateProfileInput, 'person_id'>;
	documents?: NurseIntakeDocuments;
	consent?: NurseIntakeConsent;
	context?: NurseIntakeContext;
}

export interface NurseIntakeResult {
	person_id: string;
	candidate_profile_id: string;
	profile_status: CandidateProfileStatus;
	created_person: boolean;
	created_profile: boolean;
	next_steps: string[];
}

export type NurseMessageChannel = 'sms' | 'email' | 'whatsapp' | 'manual' | 'web';

export interface NurseMessageContact {
	name?: string;
	phone?: string;
	email?: string;
	source?: string;
}

export interface NurseMessagePayload {
	message_id?: string;
	message_type?: string;
	subject?: string;
	content: string;
	received_at?: string;
	raw_payload?: unknown;
}

export interface NurseMessageIntakeInput {
	channel?: NurseMessageChannel;
	contact: NurseMessageContact;
	message: NurseMessagePayload;
	profile?: Partial<Omit<CandidateProfileInput, 'person_id'>>;
	context?: NurseIntakeContext;
}

export interface NurseMessageIntakeResult {
	person_id: string;
	candidate_profile_id: string;
	profile_status: CandidateProfileStatus;
	is_new_candidate: boolean;
	event_type: string;
	next_steps: string[];
}

export type NurseInboxActionType = 'mark_reviewed' | 'assign_recruiter' | 'create_handoff';

export interface NurseInboxRecruiterOption {
	id: string;
	name: string;
	email?: string;
	role: Extract<PersonRole, 'recruiter' | 'operator'>;
	status: PersonStatus;
}

export interface NurseInboxItem {
	id: string;
	event_type: string;
	source?: string;
	event_at: string;
	message_preview?: string;
	subject?: string;
	message_id?: string;
	message_type?: string;
	person_id: string;
	candidate_profile_id: string;
	candidate_name: string;
	phone?: string;
	email?: string;
	profile_status: CandidateProfileStatus;
	profession: CandidateProfession;
	specialty_primary?: string;
	specialties: string[];
	home_state?: string;
	available_from?: string;
	pay_floor_weekly?: number;
	recruiter_notes?: string;
	next_step: string;
	opening?: {
		id?: string;
		facility_name?: string;
		specialty?: string;
		state?: string;
	};
}

export interface NurseInboxSummary {
	total_items: number;
	draft_items: number;
	ready_for_review_items: number;
	eligible_items: number;
	inactive_items: number;
	by_source: Array<{
		source: string;
		count: number;
	}>;
}

export interface NurseInboxResponse {
	items: NurseInboxItem[];
	recruiters: NurseInboxRecruiterOption[];
	total: number;
	limit: number;
	offset: number;
	filters: {
		source?: string;
		profile_status?: CandidateProfileStatus;
	};
	summary: NurseInboxSummary;
}

export interface NurseInboxActionInput {
	action: NurseInboxActionType;
	candidate_profile_id: string;
	recruiter_person_id?: string;
	opening_id?: string;
	note?: string;
	reason?: string;
	queue_slug?: string;
	sla_due_at?: string;
	source?: string;
}

export interface NurseInboxActionResult {
	action: NurseInboxActionType;
	candidate_profile_id: string;
	profile_status: CandidateProfileStatus;
	removed_from_queue: boolean;
	message: string;
	handoff_id?: string;
}

export type NurseHandoffActionType = 'accept' | 'complete' | 'cancel';
export type NurseHandoffSlaState = 'no_sla' | 'on_track' | 'due_soon' | 'overdue' | 'resolved';

export interface NurseHandoffItem {
	id: string;
	status: HandoffStatus;
	reason: string;
	queue_slug?: string;
	sla_due_at?: string;
	acknowledged_at?: string;
	resolved_at?: string;
	created_at: string;
	updated_at: string;
	age_hours: number;
	hours_until_sla?: number;
	sla_state: NurseHandoffSlaState;
	candidate_profile_id?: string;
	candidate_name?: string;
	profile_status?: CandidateProfileStatus;
	profession?: CandidateProfession;
	specialty_primary?: string;
	home_state?: string;
	recruiter?: NurseInboxRecruiterOption;
	opening?: {
		id?: string;
		facility_name?: string;
		specialty?: string;
		state?: string;
	};
	last_note?: string;
	last_updated_by?: string;
	last_updated_at?: string;
}

export interface NurseHandoffSummary {
	total_items: number;
	open_items: number;
	accepted_items: number;
	completed_items: number;
	cancelled_items: number;
	overdue_items: number;
	due_soon_items: number;
	by_queue: Array<{
		queue_slug: string;
		count: number;
	}>;
}

export interface NurseHandoffResponse {
	items: NurseHandoffItem[];
	recruiters: NurseInboxRecruiterOption[];
	total: number;
	limit: number;
	offset: number;
	filters: {
		status?: HandoffStatus | 'all';
		queue_slug?: string;
	};
	summary: NurseHandoffSummary;
}

export interface NurseHandoffActionInput {
	handoff_id: string;
	action: NurseHandoffActionType;
	recruiter_person_id?: string;
	note?: string;
	source?: string;
}

export interface NurseHandoffActionResult {
	handoff_id: string;
	status: HandoffStatus;
	message: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface PaginatedResponse<T> {
	success: boolean;
	data?: T[];
	total?: number;
	offset?: number;
	limit?: number;
	error?: string;
}
