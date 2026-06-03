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

export interface StaffOnboardingConsent {
	background_check: boolean;
	compliance_screening: boolean;
	submitted_at?: string;
	source?: string;
}

export interface StaffOnboardingInput {
	phone: string;
	name: string;
	email?: string;
	specialties?: string[];
	skills?: string[];
	license_type?: string;
	license_state?: string;
	shift_preference?: string;
	contract_preference?: string;
	desired_location?: string;
	start_date?: string;
	hourly_rate_min?: number;
	hourly_rate_max?: number;
	availability?: 'available' | 'busy' | 'unavailable';
	timezone?: string;
	profile_url?: string;
	resume_url?: string;
	source?: string;
	notes?: string;
	metadata?: Record<string, unknown>;
	consent: StaffOnboardingConsent;
}

export interface StaffOnboardingResponse {
	action: 'created' | 'updated';
	talent: Talent;
	intake: {
		id: string;
		user_id: string;
		user_type: 'talent';
		intake_type: 'onboarding';
	};
	seeker_deactivated: boolean;
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

// ============================================
// Public Jobs Types
// ============================================

export type PublicJobProvider = 'abundance_jobs_mcp' | 'bright_data' | 'rapidapi' | 'manual' | 'unknown';
export type PublicJobStatus = 'open' | 'closed' | 'expired' | 'unknown';
export type PublicJobIngestionStatus = 'pending' | 'running' | 'snapshot_pending' | 'succeeded' | 'failed';

export interface PublicJob {
	id: string;
	provider: PublicJobProvider | string;
	source_system: string;
	source_url?: string;
	external_job_id: string;
	raw_payload_hash: string;
	title: string;
	employer?: string;
	city?: string;
	state?: string;
	country?: string;
	location_text?: string;
	specialty?: string;
	discipline?: string;
	employment_type?: string;
	shift?: string;
	duration?: string;
	start_date?: string;
	pay_min?: number;
	pay_max?: number;
	pay_text?: string;
	currency?: string;
	openings?: number;
	status: PublicJobStatus;
	application_url?: string;
	posted_at?: string;
	last_seen_at: string;
	fetched_at: string;
	normalized_at: string;
	provider_snapshot_id?: string;
	raw_payload_json: string;
	raw_payload_expires_at?: string;
	metadata_json: string;
	created_at?: string;
	updated_at?: string;
}

export interface NormalizedPublicJobInput {
	provider: PublicJobProvider | string;
	source_system: string;
	source_url?: string;
	external_job_id?: string;
	title: string;
	employer?: string;
	city?: string;
	state?: string;
	country?: string;
	location_text?: string;
	specialty?: string;
	discipline?: string;
	employment_type?: string;
	shift?: string;
	duration?: string;
	start_date?: string;
	pay_min?: number;
	pay_max?: number;
	pay_text?: string;
	currency?: string;
	openings?: number;
	status?: PublicJobStatus;
	application_url?: string;
	posted_at?: string;
	fetched_at?: string;
	normalized_at?: string;
	last_seen_at?: string;
	provider_snapshot_id?: string;
	raw_payload: Record<string, unknown>;
	raw_payload_expires_at?: string;
	metadata?: Record<string, unknown>;
}

export interface PublicJobSearchFilters {
	provider?: string;
	source_system?: string;
	status?: PublicJobStatus;
	state?: string;
	specialty?: string;
	query?: string;
	limit?: number;
	offset?: number;
}

export interface PublicJobIngestionRun {
	id: string;
	provider: PublicJobProvider | string;
	source_system?: string;
	status: PublicJobIngestionStatus;
	provider_snapshot_id?: string;
	requested_filters_json: string;
	result_count: number;
	error?: string;
	metadata_json: string;
	started_at: string;
	finished_at?: string;
	created_at?: string;
}
