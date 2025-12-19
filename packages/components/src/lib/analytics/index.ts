/**
 * CREATE SOMETHING Analytics
 *
 * Unified analytics tracking for user experience and intent understanding.
 * Export all types, client, and trackers.
 *
 * @packageDocumentation
 */

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
} from './types.js';

export { DEFAULT_CONFIG } from './types.js';

// Client
export {
	AnalyticsClient,
	initAnalytics,
	getAnalytics,
	track,
} from './client.js';

// Engagement tracking
export {
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
