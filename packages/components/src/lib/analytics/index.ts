/**
 * CREATE SOMETHING Analytics
 *
 * Unified analytics tracking for user experience and intent understanding.
 * Export all types, client, and trackers.
 *
 * @packageDocumentation
 */

// Constants
export { PROPERTY_DOMAINS } from './types.js';

// Types
export type {
	Property,
	EventCategory,
	AnalyticsEvent,
	AnalyticsConfig,
	EventBatch,
	BatchResponse,
	// Specific event types
	PageViewEvent,
	RouteChangeEvent,
	BackNavigationEvent,
	ExternalLinkEvent,
	ButtonClickEvent,
	FormStartEvent,
	FormSubmitEvent,
	FormAbandonEvent,
	RageClickEvent,
	SearchQueryEvent,
	SearchResultClickEvent,
	SearchNoResultsEvent,
	SearchAbandonEvent,
	ScrollDepthEvent,
	TimeOnPageEvent,
	ContentCopyEvent,
	ContentLinkClickEvent,
	ErrorDisplayedEvent,
	ValidationFailureEvent,
	NotFoundEvent,
	WebVitalEvent,
	ConversionEvent,
	// User analytics types (for /account visualization)
	UserAnalytics,
	DailyActivityPoint,
	PropertyBreakdown,
	TopPage,
	CategoryBreakdown,
	PropertyAnalytics,
} from './types.js';

export { DEFAULT_CONFIG } from './types.js';

// Client
export {
	AnalyticsClient,
	initAnalytics,
	getAnalytics,
	track,
	isDNTEnabled,
} from './client.js';

// Engagement tracking
export {
	createSessionTracker,
	createScrollTracker,
	createTimeTracker,
	createCopyTracker,
	createLinkTracker,
	createEngagementTracker,
	type EngagementTrackerOptions,
} from './engagement.js';

// Interaction tracking
export {
	createRageClickTracker,
	createFormTracker,
	createCTATracker,
	createErrorTracker,
	createInteractionTracker,
	type InteractionTrackerOptions,
} from './interactions.js';

// Server utilities (import in +server.ts routes)
export {
	processEventBatch,
	updateSessionSummary,
	queryEvents,
	getDailyAggregates,
	type AnalyticsQueryOptions,
} from './server.js';

// Components
export { default as PopularContent } from './PopularContent.svelte';
export { default as UserInteractionsPanel } from './UserInteractionsPanel.svelte';

// Popular content analytics (shared logic for /api/analytics/popular)
export {
	fetchPopularAnalytics,
	extractTitle,
	type PopularContent as PopularContentData,
	type UserReadingHistory,
	type PopularResponse,
	type ContentType,
	type PopularQueryOptions,
} from './popular.js';

// GDPR consent utilities (re-export for convenience)
export {
	type ConsentState,
	getConsentState,
	setConsentState,
	updateAnalyticsConsent,
	hasAnalyticsConsent,
	initializeConsent,
	shouldTrackAnalytics,
} from '../gdpr/consent.js';
