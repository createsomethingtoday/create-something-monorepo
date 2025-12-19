/**
 * Heideggerian Form Experience - Type Definitions
 *
 * These types model the cascading service configuration form
 * and the philosophical tracking that makes the experience educational.
 */

// =============================================================================
// SERVICE CONFIGURATION TYPES
// =============================================================================

export type ServiceType = 'automation' | 'transformation' | 'advisory' | 'development';

// Scope options depend on service type
export type AutomationScope = 'workflow' | 'data' | 'reporting' | 'integration';
export type TransformationScope = 'process' | 'culture' | 'technology' | 'strategy';
export type AdvisoryScope = 'assessment' | 'roadmap' | 'review' | 'coaching';
export type DevelopmentScope = 'web' | 'api' | 'mobile' | 'systems';

export type Scope = AutomationScope | TransformationScope | AdvisoryScope | DevelopmentScope;

export type PricingTier = 'starter' | 'growth' | 'enterprise';

// =============================================================================
// FEATURE DEFINITIONS
// =============================================================================

export interface Feature {
	id: string;
	label: string;
	description: string;
}

export interface ScopeConfig {
	label: string;
	description: string;
	features: Feature[];
}

export interface ServiceTypeConfig {
	label: string;
	description: string;
	scopes: Record<string, ScopeConfig>;
}

// =============================================================================
// DATABASE MODELS
// =============================================================================

export interface ServiceConfiguration {
	id: string;
	session_id: string;
	service_type: ServiceType;
	scope: Scope;
	features: string[]; // Array of feature IDs
	pricing_tier: PricingTier;
	form_completion_ms: number | null;
	validation_failures: number;
	created_at: string;
}

// For API responses
export interface ServiceConfigurationDisplay extends ServiceConfiguration {
	// Computed for display
	featureLabels: string[];
	relativeTime: string;
}

// =============================================================================
// FORM STATE MACHINE
// =============================================================================

export type FormPhase =
	| 'idle' // Initial state, no interaction
	| 'selecting' // User is making a selection
	| 'revealing' // Animating next field reveal
	| 'complete' // All fields filled, ready to submit
	| 'submitting' // Sending to server
	| 'success' // Entry created
	| 'error'; // Submission failed

export interface FormState {
	phase: FormPhase;
	serviceType: ServiceType | null;
	scope: Scope | null;
	features: string[];
	pricingTier: PricingTier | null;
	startTime: number | null;
	validationFailures: number;
	visibleFields: 1 | 2 | 3 | 4; // How many cascade levels are visible
	errors: Record<string, string>;
	errorMessage: string | null;
}

export const initialFormState: FormState = {
	phase: 'idle',
	serviceType: null,
	scope: null,
	features: [],
	pricingTier: null,
	startTime: null,
	validationFailures: 0,
	visibleFields: 1,
	errors: {},
	errorMessage: null
};

// =============================================================================
// PHILOSOPHY EVENT TYPES
// =============================================================================

export type PhilosophyEvent =
	| { type: 'zuhandenheit_flow'; field: string } // Smooth progression
	| { type: 'vorhandenheit_break'; field: string; error: string } // Validation breakdown
	| { type: 'gestell_observation' } // User viewed meta-commentary
	| { type: 'gelassenheit_completion'; durationMs: number }; // Mindful completion

// =============================================================================
// API TYPES
// =============================================================================

export interface SubmitRequest {
	sessionId: string;
	serviceType: ServiceType;
	scope: Scope;
	features: string[];
	pricingTier: PricingTier;
	formCompletionMs: number;
	validationFailures: number;
}

export interface SubmitResponse {
	success: boolean;
	id?: string;
	entry?: ServiceConfiguration;
	error?: string;
}

export interface EntriesResponse {
	entries: ServiceConfiguration[];
	total: number;
}

export interface DeleteResponse {
	success: boolean;
	deleted?: string;
	error?: string;
}
