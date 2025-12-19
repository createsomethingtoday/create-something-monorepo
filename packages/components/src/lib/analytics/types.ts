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
