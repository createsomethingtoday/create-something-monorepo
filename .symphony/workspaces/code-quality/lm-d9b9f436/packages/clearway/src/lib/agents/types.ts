/**
 * Agent Types
 *
 * Core types for the CLEARWAY AI Agent system.
 * Philosophy: AI must be invisible (Zuhandenheit).
 */

// ============================================================================
// Suggestion Types
// ============================================================================

export interface SlotSuggestion {
	courtId: string;
	courtName: string;
	startTime: string; // ISO 8601
	endTime: string;
	score: number; // 0-1, higher = more confident
	reason: SuggestionReason;
}

export type SuggestionReason =
	| 'frequent_time' // User often books this time
	| 'frequent_court' // User often books this court
	| 'frequent_day' // User often books this day of week
	| 'pattern_match' // Multiple factors align
	| 'new_user'; // Fallback for users without history

export interface SuggestionRequest {
	facilityId: string;
	memberId?: string; // Optional - anonymous users get generic suggestions
	memberEmail?: string; // Alternative lookup
	date: string; // YYYY-MM-DD
	availableSlots: AvailableSlot[];
}

export interface AvailableSlot {
	courtId: string;
	courtName: string;
	startTime: string;
	endTime: string;
	priceCents: number | null;
}

export interface SuggestionResponse {
	suggestions: SlotSuggestion[];
	personalized: boolean; // true if based on member history
	computeTimeMs: number;
}

// ============================================================================
// Preference Learning Types
// ============================================================================

export interface PreferenceWeights {
	timeWeights: Record<number, number>; // Hour (0-23) → weight
	courtWeights: Record<string, number>; // Court ID → weight
	dayWeights: Record<number, number>; // Day of week (0-6) → weight
}

export interface BookingSignal {
	facilityId: string;
	memberId: string;
	courtId: string;
	courtName: string;
	startTime: string; // ISO 8601
	bookingSource: 'web' | 'sms' | 'staff' | 'api' | 'waitlist';
}

// ============================================================================
// Alternative Suggestion Types
// ============================================================================

export interface AlternativeRequest {
	facilityId: string;
	requestedCourtId: string;
	requestedTime: string; // ISO 8601
	availableSlots: AvailableSlot[];
	memberPreferences?: PreferenceWeights;
}

export interface AlternativeSuggestion {
	courtId: string;
	courtName: string;
	startTime: string;
	similarity: number; // 0-1, how similar to requested
	differenceType: 'same_time_different_court' | 'different_time_same_court' | 'nearby_option';
}

// ============================================================================
// Admin Insight Types
// ============================================================================

export interface DemandForecast {
	date: string;
	dayOfWeek: number;
	hourlyPredictions: HourlyPrediction[];
	confidence: number;
	expectedBookings: number;
	expectedRevenueCents: number;
}

export interface HourlyPrediction {
	hour: number;
	expectedUtilization: number; // 0-1
	isPeakHour: boolean;
}

export interface ChurnRisk {
	memberId: string;
	memberName: string;
	memberEmail: string;
	riskScore: number; // 0-1
	lastBookingDate: string | null;
	bookingTrend: 'declining' | 'stable' | 'inactive';
	daysSinceLastBooking: number;
	recommendedAction: 'personal_outreach' | 'automated_campaign' | 'monitor';
}

export interface GapStrategy {
	date: string;
	hour: number;
	courtIds: string[];
	currentUtilization: number;
	strategy: 'notification' | 'discount' | 'waitlist';
	targetMembers?: string[]; // Member IDs who might book
	discountPercent?: number;
	reason: string;
}

// ============================================================================
// Extended Member Preferences (AI-enabled)
// ============================================================================

export interface MemberPreferencesAI {
	// Existing fields
	preferred_courts?: string[];
	preferred_times?: string[];
	notification_sms?: boolean;
	notification_email?: boolean;

	// AI preference weights
	timeWeights?: Record<number, number>;
	courtWeights?: Record<string, number>;
	dayWeights?: Record<number, number>;

	// Privacy controls
	ai_personalization?: boolean; // Default: true
}
