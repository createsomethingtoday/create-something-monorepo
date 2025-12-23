/**
 * Analytics Tracking Client
 *
 * Unified client for tracking user behavior across CREATE SOMETHING properties.
 * Features: session management, event batching, DNT respect, silent failures.
 *
 * Philosophy: The tracker recedes into transparent operation.
 * Users experience the product; we understand their intent.
 *
 * @packageDocumentation
 */

import {
	PROPERTY_DOMAINS,
	type AnalyticsEvent,
	type AnalyticsConfig,
	type Property,
	type EventCategory,
	type EventBatch,
} from './types.js';

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

const SESSION_KEY = 'cs_analytics_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface SessionData {
	id: string;
	startedAt: number;
	lastActivityAt: number;
	sourceProperty?: Property;
}

// =============================================================================
// CROSS-PROPERTY DETECTION
// =============================================================================

/**
 * Detect which CREATE SOMETHING property a URL belongs to
 */
function detectPropertyFromUrl(url: string): Property | null {
	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname;

		// Check for exact domain matches
		for (const [domain, property] of Object.entries(PROPERTY_DOMAINS)) {
			if (hostname === domain || hostname.endsWith('.' + domain)) {
				return property;
			}
		}

		// Check for localhost/dev patterns
		if (hostname === 'localhost' || hostname === '127.0.0.1') {
			// Can't determine property from localhost
			return null;
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Get source property from referrer if it's a different CREATE SOMETHING property
 */
function getSourcePropertyFromReferrer(currentProperty: Property): Property | null {
	if (typeof document === 'undefined') return null;

	const referrer = document.referrer;
	if (!referrer) return null;

	const sourceProperty = detectPropertyFromUrl(referrer);

	// Only return if it's a different property (actual cross-property navigation)
	if (sourceProperty && sourceProperty !== currentProperty) {
		return sourceProperty;
	}

	return null;
}

/**
 * Generate a collision-resistant session ID
 */
function generateSessionId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `s_${timestamp}_${random}`;
}

/**
 * Get or create a session ID
 */
function getSessionId(): string {
	if (typeof window === 'undefined') {
		return generateSessionId();
	}

	try {
		const stored = sessionStorage.getItem(SESSION_KEY);
		if (stored) {
			const session: SessionData = JSON.parse(stored);
			const now = Date.now();

			// Check if session is still valid
			if (now - session.lastActivityAt < SESSION_TIMEOUT) {
				// Update last activity
				session.lastActivityAt = now;
				sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
				return session.id;
			}
		}

		// Create new session
		const newSession: SessionData = {
			id: generateSessionId(),
			startedAt: Date.now(),
			lastActivityAt: Date.now(),
		};
		sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
		return newSession.id;
	} catch {
		// sessionStorage not available
		return generateSessionId();
	}
}

/**
 * Get session start time from storage or return current time as fallback
 */
function getSessionStartedAt(): number {
	if (typeof window === 'undefined') {
		return Date.now();
	}

	try {
		const stored = sessionStorage.getItem(SESSION_KEY);
		if (stored) {
			const session: SessionData = JSON.parse(stored);
			return session.startedAt;
		}
	} catch {
		// sessionStorage not available
	}
	return Date.now();
}

// =============================================================================
// PRIVACY
// =============================================================================

/**
 * Check if Do Not Track is enabled in the browser
 * This is always respected regardless of other settings
 */
export function isDNTEnabled(): boolean {
	if (typeof window === 'undefined') return false;

	return (
		navigator.doNotTrack === '1' ||
		(window as unknown as { doNotTrack?: string }).doNotTrack === '1'
	);
}

// =============================================================================
// ANALYTICS CLIENT CLASS
// =============================================================================

export class AnalyticsClient {
	private config: Required<AnalyticsConfig>;
	private queue: AnalyticsEvent[] = [];
	private flushTimer: ReturnType<typeof setTimeout> | null = null;
	private sessionId: string;
	private sessionStartedAt: number;
	private sessionEndSent: boolean = false;
	private sourceProperty: Property | null = null;
	private userOptedOut: boolean = false;

	constructor(config: AnalyticsConfig) {
		this.config = {
			property: config.property,
			endpoint: config.endpoint ?? '/api/analytics/events',
			batchSize: config.batchSize ?? 10,
			batchTimeout: config.batchTimeout ?? 5000,
			respectDNT: config.respectDNT ?? true,
			debug: config.debug ?? false,
			userOptedOut: config.userOptedOut ?? false,
		};
		this.userOptedOut = config.userOptedOut ?? false;
		this.sessionId = getSessionId();
		this.sessionStartedAt = getSessionStartedAt();

		// Detect cross-property navigation
		this.sourceProperty = getSourcePropertyFromReferrer(config.property);
		if (this.sourceProperty) {
			// Store source property in session for persistence
			this.updateSessionSourceProperty(this.sourceProperty);

			// Fire property_transition event
			this.propertyTransition(this.sourceProperty, config.property);

			if (this.config.debug) {
				console.log('[Analytics] Cross-property navigation detected:', this.sourceProperty, '→', config.property);
			}
		}

		// Flush on page unload
		if (typeof window !== 'undefined') {
			window.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'hidden') {
					this.flush();
				}
			});

			window.addEventListener('pagehide', () => {
				this.flush();
			});
		}
	}

	/**
	 * Check if tracking is disabled (DNT or user opt-out)
	 */
	isTrackingDisabled(): boolean {
		// DNT browser setting is ALWAYS respected, regardless of other settings
		if (isDNTEnabled()) {
			return true;
		}
		// User opt-out from profile settings
		if (this.userOptedOut) {
			return true;
		}
		return false;
	}

	/**
	 * Update user opt-out preference (called when user changes setting)
	 */
	setUserOptOut(optedOut: boolean): void {
		this.userOptedOut = optedOut;
		this.config.userOptedOut = optedOut;
		if (this.config.debug) {
			console.log('[Analytics] User opt-out updated:', optedOut);
		}
	}

	/**
	 * Track an event
	 */
	track(
		category: EventCategory,
		action: string,
		options?: {
			target?: string;
			value?: number;
			metadata?: Record<string, unknown>;
		}
	): void {
		// DNT is ALWAYS respected, regardless of config.respectDNT setting
		if (isDNTEnabled()) {
			if (this.config.debug) {
				console.log('[Analytics] DNT enabled, event skipped:', action);
			}
			return;
		}

		// Check user opt-out preference
		if (this.userOptedOut) {
			if (this.config.debug) {
				console.log('[Analytics] User opted out, event skipped:', action);
			}
			return;
		}

		const event: AnalyticsEvent = {
			eventId: this.generateEventId(),
			sessionId: this.sessionId,
			property: this.config.property,
			sourceProperty: this.sourceProperty ?? undefined,
			timestamp: new Date().toISOString(),
			url: typeof window !== 'undefined' ? window.location.href : '',
			referrer: typeof document !== 'undefined' ? document.referrer : undefined,
			category,
			action,
			target: options?.target,
			value: options?.value,
			metadata: options?.metadata,
		};

		this.enqueue(event);
	}

	/**
	 * Track a property transition (cross-property navigation)
	 */
	propertyTransition(fromProperty: Property, toProperty: Property): void {
		this.track('navigation', 'property_transition', {
			metadata: {
				sourceProperty: fromProperty,
				targetProperty: toProperty,
			},
		});
	}

	/**
	 * Update session storage with source property
	 */
	private updateSessionSourceProperty(sourceProperty: Property): void {
		if (typeof window === 'undefined') return;

		try {
			const stored = sessionStorage.getItem(SESSION_KEY);
			if (stored) {
				const session: SessionData = JSON.parse(stored);
				session.sourceProperty = sourceProperty;
				sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
			}
		} catch {
			// sessionStorage not available
		}
	}

	/**
	 * Get source property for this session
	 */
	getSourceProperty(): Property | null {
		return this.sourceProperty;
	}

	/**
	 * Track a page view
	 */
	pageView(options?: { title?: string; loadTime?: number }): void {
		this.track('navigation', 'page_view', {
			metadata: options,
		});
	}

	/**
	 * Track a route change (SPA navigation)
	 */
	routeChange(fromPath: string, toPath: string): void {
		this.track('navigation', 'route_change', {
			metadata: { fromPath, toPath },
		});
	}

	/**
	 * Track a button click
	 */
	buttonClick(target: string, buttonType?: 'cta' | 'nav' | 'action'): void {
		this.track('interaction', 'button_click', {
			target,
			metadata: buttonType ? { buttonType } : undefined,
		});
	}

	/**
	 * Track scroll depth
	 */
	scrollDepth(depth: 25 | 50 | 75 | 100): void {
		this.track('content', 'scroll_depth', { value: depth });
	}

	/**
	 * Track time on page
	 */
	timeOnPage(seconds: number): void {
		this.track('content', 'time_on_page', { value: seconds });
	}

	/**
	 * Track a search query
	 */
	searchQuery(query: string, resultCount?: number): void {
		// Sanitize query - remove potential PII
		const sanitized = this.sanitizeQuery(query);
		this.track('search', 'search_query', {
			target: sanitized,
			metadata: resultCount !== undefined ? { resultCount } : undefined,
		});
	}

	/**
	 * Track search result click
	 */
	searchResultClick(resultId: string, position?: number): void {
		this.track('search', 'search_result_click', {
			target: resultId,
			value: position,
		});
	}

	/**
	 * Track an error displayed to user
	 */
	errorDisplayed(message: string, errorType?: string, component?: string): void {
		this.track('error', 'error_displayed', {
			target: message,
			metadata: { errorType, component },
		});
	}

	/**
	 * Track a 404 page
	 */
	notFound(requestedUrl: string): void {
		this.track('error', '404_page', {
			target: requestedUrl,
		});
	}

	/**
	 * Track rage clicks (frustration signal)
	 */
	rageClick(target: string, clickCount: number): void {
		this.track('interaction', 'rage_click', {
			target,
			value: clickCount,
		});
	}

	/**
	 * Track form interactions
	 */
	formStart(formId: string): void {
		this.track('interaction', 'form_start', { target: formId });
	}

	formSubmit(formId: string, success: boolean): void {
		this.track('interaction', 'form_submit', {
			target: formId,
			metadata: { success },
		});
	}

	formAbandon(formId: string, lastField?: string, timeSpent?: number): void {
		this.track('interaction', 'form_abandon', {
			target: formId,
			metadata: { lastField, timeSpent },
		});
	}

	/**
	 * Track content copy
	 */
	contentCopy(textLength?: number): void {
		this.track('content', 'content_copy', {
			metadata: textLength ? { textLength } : undefined,
		});
	}

	/**
	 * Track conversion events
	 */
	conversion(action: string, metadata?: Record<string, unknown>): void {
		this.track('conversion', action, { metadata });
	}

	/**
	 * Track Core Web Vitals
	 */
	webVital(
		name: 'lcp' | 'fid' | 'cls' | 'ttfb',
		value: number,
		rating?: 'good' | 'needs-improvement' | 'poor'
	): void {
		this.track('performance', `web_vital_${name}`, {
			value,
			metadata: rating ? { rating } : undefined,
		});
	}

	/**
	 * Flush queued events immediately
	 */
	async flush(): Promise<void> {
		// Send session_end event on page unload (only once per session)
		if (
			typeof document !== 'undefined' &&
			document.visibilityState === 'hidden' &&
			!this.sessionEndSent
		) {
			this.sessionEndSent = true;
			const elapsedSeconds = Math.floor((Date.now() - this.sessionStartedAt) / 1000);
			this.track('navigation', 'session_end', { value: elapsedSeconds });
		}

		if (this.queue.length === 0) return;

		const events = [...this.queue];
		this.queue = [];

		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}

		try {
			await this.sendEvents(events);
		} catch (error) {
			if (this.config.debug) {
				console.error('[Analytics] Failed to send events:', error);
			}
			// Silent failure - don't re-queue to prevent infinite loops
		}
	}

	/**
	 * Get current session ID
	 */
	getSessionId(): string {
		return this.sessionId;
	}

	// ===========================================================================
	// PRIVATE METHODS
	// ===========================================================================

	private generateEventId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 6);
		return `e_${timestamp}_${random}`;
	}

	private enqueue(event: AnalyticsEvent): void {
		this.queue.push(event);

		if (this.config.debug) {
			console.log('[Analytics] Event queued:', event.action, event);
		}

		// Flush if batch size reached
		if (this.queue.length >= this.config.batchSize) {
			this.flush();
			return;
		}

		// Set up flush timer if not already running
		if (!this.flushTimer) {
			this.flushTimer = setTimeout(() => {
				this.flush();
			}, this.config.batchTimeout);
		}
	}

	private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
		if (typeof window === 'undefined') return;

		const batch: EventBatch = {
			events,
			sentAt: new Date().toISOString(),
		};

		// Use sendBeacon for reliability on page unload
		if (navigator.sendBeacon && document.visibilityState === 'hidden') {
			const blob = new Blob([JSON.stringify(batch)], {
				type: 'application/json',
			});
			navigator.sendBeacon(this.config.endpoint, blob);
			return;
		}

		// Use fetch for normal operation
		await fetch(this.config.endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(batch),
			keepalive: true,
		});
	}

	private sanitizeQuery(query: string): string {
		// Remove potential email addresses
		let sanitized = query.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]');
		// Remove potential phone numbers
		sanitized = sanitized.replace(/\d{10,}/g, '[phone]');
		// Remove potential credit card numbers
		sanitized = sanitized.replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '[card]');
		// Truncate long queries
		if (sanitized.length > 200) {
			sanitized = sanitized.substring(0, 200) + '...';
		}
		return sanitized;
	}
}

// =============================================================================
// SINGLETON FACTORY
// =============================================================================

let clientInstance: AnalyticsClient | null = null;

/**
 * Initialize the analytics client
 */
export function initAnalytics(config: AnalyticsConfig): AnalyticsClient {
	clientInstance = new AnalyticsClient(config);
	return clientInstance;
}

/**
 * Get the analytics client instance
 */
export function getAnalytics(): AnalyticsClient | null {
	return clientInstance;
}

/**
 * Track an event using the singleton client
 */
export function track(
	category: EventCategory,
	action: string,
	options?: {
		target?: string;
		value?: number;
		metadata?: Record<string, unknown>;
	}
): void {
	clientInstance?.track(category, action, options);
}
