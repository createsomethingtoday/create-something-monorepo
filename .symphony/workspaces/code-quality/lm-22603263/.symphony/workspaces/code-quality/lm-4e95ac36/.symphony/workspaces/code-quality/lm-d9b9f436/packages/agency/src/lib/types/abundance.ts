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
