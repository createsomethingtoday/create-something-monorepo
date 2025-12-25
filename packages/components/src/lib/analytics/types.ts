/**
 * Unified Analytics Event Schema
 *
 * Consistent event tracking across all CREATE SOMETHING properties.
 * Philosophy: Each data point must answer a specific question about user intent.
 *
 * @packageDocumentation
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * CREATE SOMETHING property identifiers
 */
export type Property = 'space' | 'io' | 'agency' | 'ltd' | 'lms';

/**
 * Domain to property mapping for cross-property detection
 * Single source of truth for property identification
 */
export const PROPERTY_DOMAINS: Record<string, Property> = {
	'createsomething.space': 'space',
	'createsomething.io': 'io',
	'createsomething.agency': 'agency',
	'createsomething.ltd': 'ltd',
	'learn.createsomething.space': 'lms',
};

/**
 * Event categories aligned with user intent discovery
 */
export type EventCategory =
	| 'navigation' // Page views, route changes, back navigation
	| 'interaction' // Clicks, hovers, form interactions
	| 'search' // Search queries, filters, results
	| 'content' // Scroll depth, time on page, copy events
	| 'conversion' // Goal completions, signups, deploys
	| 'error' // Errors, validation failures, 404s
	| 'performance'; // Core Web Vitals, load times

/**
 * Unified analytics event structure
 */
export interface AnalyticsEvent {
	/** Unique event identifier */
	eventId: string;
	/** Session identifier (persists across page views) */
	sessionId: string;
	/** Authenticated user ID (optional) */
	userId?: string;
	/** Which property this event occurred on */
	property: Property;
	/** Property user came from (for cross-property tracking) */
	sourceProperty?: Property;
	/** ISO 8601 timestamp */
	timestamp: string;
	/** Current page URL */
	url: string;
	/** Previous page URL */
	referrer?: string;
	/** Event category */
	category: EventCategory;
	/** Specific action within category */
	action: string;
	/** Target element or content ID */
	target?: string;
	/** Numeric value (scroll %, duration, etc.) */
	value?: number;
	/** Additional context */
	metadata?: Record<string, unknown>;
}

// =============================================================================
// NAVIGATION EVENTS
// =============================================================================

export interface PageViewEvent extends AnalyticsEvent {
	category: 'navigation';
	action: 'page_view';
	metadata?: {
		title?: string;
		loadTime?: number;
	};
}

export interface RouteChangeEvent extends AnalyticsEvent {
	category: 'navigation';
	action: 'route_change';
	metadata?: {
		fromPath?: string;
		toPath?: string;
	};
}

export interface BackNavigationEvent extends AnalyticsEvent {
	category: 'navigation';
	action: 'back_navigation';
}

export interface SessionEndEvent extends AnalyticsEvent {
	category: 'navigation';
	action: 'session_end';
	/** Session duration in seconds */
	value: number;
}

export interface PropertyTransitionEvent extends AnalyticsEvent {
	category: 'navigation';
	action: 'property_transition';
	metadata: {
		sourceProperty: Property;
		targetProperty: Property;
	};
}

export interface ExternalLinkEvent extends AnalyticsEvent {
	category: 'navigation';
	action: 'external_link';
	target: string; // URL
}

// =============================================================================
// INTERACTION EVENTS
// =============================================================================

export interface ButtonClickEvent extends AnalyticsEvent {
	category: 'interaction';
	action: 'button_click';
	target: string; // Button ID or text
	metadata?: {
		buttonType?: 'cta' | 'nav' | 'action';
	};
}

export interface FormStartEvent extends AnalyticsEvent {
	category: 'interaction';
	action: 'form_start';
	target: string; // Form ID
}

export interface FormSubmitEvent extends AnalyticsEvent {
	category: 'interaction';
	action: 'form_submit';
	target: string; // Form ID
	metadata?: {
		success?: boolean;
		fieldCount?: number;
	};
}

export interface FormAbandonEvent extends AnalyticsEvent {
	category: 'interaction';
	action: 'form_abandon';
	target: string; // Form ID
	metadata?: {
		lastField?: string;
		timeSpent?: number;
	};
}

export interface RageClickEvent extends AnalyticsEvent {
	category: 'interaction';
	action: 'rage_click';
	target: string; // Element clicked
	value: number; // Click count
	metadata?: {
		timeWindow?: number; // ms
	};
}

// =============================================================================
// SEARCH EVENTS
// =============================================================================

export interface SearchQueryEvent extends AnalyticsEvent {
	category: 'search';
	action: 'search_query';
	target: string; // Sanitized query
	metadata?: {
		resultCount?: number;
	};
}

export interface SearchResultClickEvent extends AnalyticsEvent {
	category: 'search';
	action: 'search_result_click';
	target: string; // Result URL or ID
	value?: number; // Position in results
}

export interface SearchNoResultsEvent extends AnalyticsEvent {
	category: 'search';
	action: 'search_no_results';
	target: string; // Query that returned nothing
}

export interface SearchAbandonEvent extends AnalyticsEvent {
	category: 'search';
	action: 'search_abandon';
	target: string; // Query
	metadata?: {
		resultCount?: number;
	};
}

// =============================================================================
// CONTENT EVENTS
// =============================================================================

export interface ScrollDepthEvent extends AnalyticsEvent {
	category: 'content';
	action: 'scroll_depth';
	value: number; // 25, 50, 75, 100
}

export interface TimeOnPageEvent extends AnalyticsEvent {
	category: 'content';
	action: 'time_on_page';
	value: number; // Seconds
}

export interface ContentCopyEvent extends AnalyticsEvent {
	category: 'content';
	action: 'content_copy';
	metadata?: {
		textLength?: number;
	};
}

export interface ContentLinkClickEvent extends AnalyticsEvent {
	category: 'content';
	action: 'content_link_click';
	target: string; // Link URL
}

// =============================================================================
// ERROR EVENTS
// =============================================================================

export interface ErrorDisplayedEvent extends AnalyticsEvent {
	category: 'error';
	action: 'error_displayed';
	target: string; // Error message or code
	metadata?: {
		errorType?: string;
		component?: string;
	};
}

export interface ValidationFailureEvent extends AnalyticsEvent {
	category: 'error';
	action: 'validation_failure';
	target: string; // Field name
	metadata?: {
		validationType?: string;
		formId?: string;
	};
}

export interface NotFoundEvent extends AnalyticsEvent {
	category: 'error';
	action: '404_page';
	target: string; // Requested URL
	metadata?: {
		referrer?: string;
	};
}

// =============================================================================
// PERFORMANCE EVENTS
// =============================================================================

export interface WebVitalEvent extends AnalyticsEvent {
	category: 'performance';
	action: 'web_vital_lcp' | 'web_vital_fid' | 'web_vital_cls' | 'web_vital_ttfb';
	value: number;
	metadata?: {
		rating?: 'good' | 'needs-improvement' | 'poor';
	};
}

// =============================================================================
// CONVERSION EVENTS
// =============================================================================

export interface ConversionEvent extends AnalyticsEvent {
	category: 'conversion';
	action: string; // signup, deploy, subscribe, etc.
	metadata?: {
		conversionType?: string;
		value?: number;
	};
}

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

export interface AnalyticsConfig {
	/** Property identifier */
	property: Property;
	/** API endpoint for sending events */
	endpoint?: string;
	/** Batch size before flush (default: 10) */
	batchSize?: number;
	/** Batch timeout in ms (default: 5000) */
	batchTimeout?: number;
	/** Respect Do Not Track (default: true) */
	respectDNT?: boolean;
	/** Enable debug logging (default: false) */
	debug?: boolean;
	/** User has opted out of analytics (from profile setting) */
	userOptedOut?: boolean;
	/** Authenticated user ID for cross-property tracking */
	userId?: string;
}

export const DEFAULT_CONFIG: Partial<AnalyticsConfig> = {
	endpoint: '/api/analytics/events',
	batchSize: 10,
	batchTimeout: 5000,
	respectDNT: true,
	debug: false,
};

// =============================================================================
// BATCH TYPES
// =============================================================================

export interface EventBatch {
	events: AnalyticsEvent[];
	sentAt: string;
}

export interface BatchResponse {
	success: boolean;
	received: number;
	errors?: string[];
}

// =============================================================================
// USER ANALYTICS (for /account visualization)
// =============================================================================

/**
 * Aggregated user analytics for Tufte-style visualization
 * Philosophy: Show variation and patterns, not raw counts
 */
export interface UserAnalytics {
	/** Total sessions across all properties */
	totalSessions: number;
	/** Total page views across all properties */
	totalPageViews: number;
	/** Total time spent in minutes */
	totalTimeMinutes: number;
	/** Daily activity for sparkline visualization */
	dailyActivity: DailyActivityPoint[];
	/** Breakdown by property for distribution bar */
	propertyBreakdown: PropertyBreakdown[];
	/** Top pages visited for high-density table */
	topPages: TopPage[];
	/** Category breakdown for distribution visualization */
	categoryBreakdown: CategoryBreakdown[];
}

/**
 * Single day's activity count
 */
export interface DailyActivityPoint {
	/** ISO date string (YYYY-MM-DD) */
	date: string;
	/** Event count for this day */
	count: number;
}

/**
 * Analytics breakdown per property
 */
export interface PropertyBreakdown {
	/** Property identifier */
	property: Property;
	/** Number of sessions on this property */
	sessions: number;
	/** Number of page views on this property */
	pageViews: number;
	/** Time spent on this property in minutes */
	timeMinutes: number;
}

/**
 * Top page entry for high-density table
 */
export interface TopPage {
	/** Page URL path */
	url: string;
	/** Property this page belongs to */
	property: Property;
	/** Number of views */
	views: number;
}

/**
 * Category breakdown for visualization
 */
export interface CategoryBreakdown {
	/** Event category */
	category: EventCategory;
	/** Count of events in this category */
	count: number;
}

/**
 * Per-property analytics response (internal)
 * Returned by each property's /api/user/analytics endpoint
 */
export interface PropertyAnalytics {
	/** Which property this data is from */
	property: Property;
	/** Sessions on this property */
	sessions: {
		total: number;
		pageViews: number;
		durationSeconds: number;
	};
	/** Daily event counts */
	dailyActivity: DailyActivityPoint[];
	/** Category breakdown */
	categoryBreakdown: CategoryBreakdown[];
	/** Top pages */
	topPages: Array<{ url: string; views: number }>;
}
