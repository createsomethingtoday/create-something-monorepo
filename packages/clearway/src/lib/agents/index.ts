/**
 * CLEARWAY Agent Registry
 *
 * AI-powered agents that recede into invisible use.
 * Philosophy: Users should never think "AI is helping me" —
 * they should think "CLEARWAY just knows what I want."
 */

// Base types and utilities
export { BaseAgent, applyDecay, normalizeWeights } from './base';
export type { AgentContext, AgentResult } from './base';

// Type definitions
export type {
	// Suggestion types
	SlotSuggestion,
	SuggestionReason,
	SuggestionRequest,
	SuggestionResponse,
	AvailableSlot,
	// Preference types
	PreferenceWeights,
	BookingSignal,
	MemberPreferencesAI,
	// Alternative types
	AlternativeRequest,
	AlternativeSuggestion,
	// Admin insight types
	DemandForecast,
	HourlyPrediction,
	ChurnRisk,
	GapStrategy
} from './types';

// User agents
export { SuggestionAgent, getSuggestions } from './user/suggestion-agent';

// Future exports (Phase 2+):
// export { PreferenceAgent, learnFromBooking } from './user/preference-agent';
// export { AlternativeAgent, getAlternatives } from './user/alternative-agent';
// export { ForecastAgent, getForecast } from './admin/forecast-agent';
// export { ChurnAgent, detectChurnRisk } from './admin/churn-agent';
// export { GapStrategyAgent, getGapStrategies } from './admin/gap-strategy-agent';
