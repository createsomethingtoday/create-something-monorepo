/**
 * Session Analytics
 *
 * Authentication event tracking integration with unified analytics.
 * Session lifecycle events flow through the standard analytics pipeline.
 *
 * @packageDocumentation
 */

import type { AnalyticsEvent, ConversionEvent, Property } from '../analytics/types.js';
import type { SessionAnalyticsEvent } from './types.js';

// =============================================================================
// TYPES
// =============================================================================

/** Auth method types */
export type AuthMethod = 'password' | 'magic_link';

/** Authentication event actions */
export type AuthEventAction =
	| 'auth_signup_start'
	| 'auth_signup_complete'
	| 'auth_signup_error'
	| 'auth_login_start'
	| 'auth_login_complete'
	| 'auth_login_error'
	| 'auth_logout'
	| 'auth_magic_link_sent'
	| 'auth_magic_link_clicked'
	| 'auth_token_refresh'
	| 'auth_session_expired'
	| 'auth_session_restored';

/** Auth event metadata by action type */
export interface AuthEventMetadata {
	auth_signup_start: { method: AuthMethod };
	auth_signup_complete: { method: AuthMethod; tier: string };
	auth_signup_error: { method: AuthMethod; error_code: string };
	auth_login_start: { method: AuthMethod };
	auth_login_complete: { method: AuthMethod; returning_user: boolean };
	auth_login_error: { method: AuthMethod; error_code: string };
	auth_logout: { session_duration_minutes?: number };
	auth_magic_link_sent: Record<string, never>;
	auth_magic_link_clicked: { link_age_minutes: number };
	auth_token_refresh: { expires_in?: number };
	auth_session_expired: { had_access_token?: boolean; had_refresh_token?: boolean };
	auth_session_restored: { user_id?: string };
}

/** Auth analytics event */
export interface AuthAnalyticsEvent extends Omit<ConversionEvent, 'action' | 'metadata'> {
	category: 'conversion';
	action: AuthEventAction;
	metadata: AuthEventMetadata[AuthEventAction];
}

// =============================================================================
// EVENT CREATION
// =============================================================================

/**
 * Create an auth analytics event
 *
 * @example
 * ```typescript
 * import { createAuthEvent, track } from '@create-something/components/analytics';
 *
 * // On login button click
 * track(createAuthEvent('auth_login_start', {
 *   method: 'password'
 * }));
 *
 * // On successful login
 * track(createAuthEvent('auth_login_complete', {
 *   method: 'password',
 *   returning_user: true
 * }));
 * ```
 */
export function createAuthEvent<T extends AuthEventAction>(
	action: T,
	metadata: AuthEventMetadata[T],
	options: {
		property: Property;
		sessionId: string;
		userId?: string;
		url: string;
	}
): AuthAnalyticsEvent {
	return {
		eventId: generateEventId(),
		sessionId: options.sessionId,
		userId: options.userId,
		property: options.property,
		timestamp: new Date().toISOString(),
		url: options.url,
		category: 'conversion',
		action,
		metadata: metadata as AuthEventMetadata[AuthEventAction],
	};
}

// =============================================================================
// SESSION EVENT ADAPTERS
// =============================================================================

/**
 * Convert session lifecycle events to analytics events
 *
 * This adapter transforms internal session events (from session.ts)
 * into the analytics event format for tracking.
 *
 * @example
 * ```typescript
 * const sessionManager = createSessionManager(cookies, {
 *   onAnalyticsEvent: (event) => {
 *     const analyticsEvent = sessionEventToAnalytics(event, {
 *       property: 'space',
 *       sessionId: getSessionId(),
 *       url: request.url
 *     });
 *     trackEvent(analyticsEvent);
 *   }
 * });
 * ```
 */
export function sessionEventToAnalytics(
	event: SessionAnalyticsEvent,
	options: {
		property: Property;
		sessionId: string;
		userId?: string;
		url: string;
	}
): AuthAnalyticsEvent {
	return createAuthEvent(
		event.action,
		(event.metadata || {}) as AuthEventMetadata[typeof event.action],
		options
	);
}

// =============================================================================
// ANALYTICS INTEGRATION FACTORY
// =============================================================================

export interface AuthAnalyticsOptions {
	/** Property identifier */
	property: Property;
	/** Session ID getter */
	getSessionId: () => string;
	/** Current URL getter */
	getUrl: () => string;
	/** Optional user ID getter */
	getUserId?: () => string | undefined;
	/** Event tracking function */
	trackEvent: (event: AnalyticsEvent) => void;
}

/**
 * Create an analytics integration for auth events
 *
 * @example
 * ```typescript
 * // In +layout.svelte or app initialization
 * import { createAuthAnalytics } from '@create-something/components/auth';
 * import { track, getAnalytics } from '@create-something/components/analytics';
 *
 * const authAnalytics = createAuthAnalytics({
 *   property: 'space',
 *   getSessionId: () => getAnalytics()?.sessionId ?? '',
 *   getUrl: () => window.location.href,
 *   trackEvent: track
 * });
 *
 * // Use in forms
 * authAnalytics.trackSignupStart('password');
 * authAnalytics.trackSignupComplete('password', 'free');
 * authAnalytics.trackLoginComplete('password', false);
 * authAnalytics.trackLogout(45);
 * ```
 */
export function createAuthAnalytics(options: AuthAnalyticsOptions) {
	const { property, getSessionId, getUrl, getUserId, trackEvent } = options;

	const createEvent = <T extends AuthEventAction>(
		action: T,
		metadata: AuthEventMetadata[T]
	): AuthAnalyticsEvent => {
		return createAuthEvent(action, metadata, {
			property,
			sessionId: getSessionId(),
			userId: getUserId?.(),
			url: getUrl(),
		});
	};

	return {
		// Signup events
		trackSignupStart(method: AuthMethod): void {
			trackEvent(createEvent('auth_signup_start', { method }));
		},

		trackSignupComplete(method: AuthMethod, tier: string): void {
			trackEvent(createEvent('auth_signup_complete', { method, tier }));
		},

		trackSignupError(method: AuthMethod, errorCode: string): void {
			trackEvent(createEvent('auth_signup_error', { method, error_code: errorCode }));
		},

		// Login events
		trackLoginStart(method: AuthMethod): void {
			trackEvent(createEvent('auth_login_start', { method }));
		},

		trackLoginComplete(method: AuthMethod, returningUser: boolean): void {
			trackEvent(createEvent('auth_login_complete', { method, returning_user: returningUser }));
		},

		trackLoginError(method: AuthMethod, errorCode: string): void {
			trackEvent(createEvent('auth_login_error', { method, error_code: errorCode }));
		},

		// Logout
		trackLogout(sessionDurationMinutes?: number): void {
			trackEvent(
				createEvent('auth_logout', { session_duration_minutes: sessionDurationMinutes })
			);
		},

		// Magic link events
		trackMagicLinkSent(): void {
			trackEvent(createEvent('auth_magic_link_sent', {}));
		},

		trackMagicLinkClicked(linkAgeMinutes: number): void {
			trackEvent(createEvent('auth_magic_link_clicked', { link_age_minutes: linkAgeMinutes }));
		},

		// Session lifecycle
		trackTokenRefresh(expiresIn?: number): void {
			trackEvent(createEvent('auth_token_refresh', { expires_in: expiresIn }));
		},

		trackSessionExpired(hadAccessToken?: boolean, hadRefreshToken?: boolean): void {
			trackEvent(
				createEvent('auth_session_expired', {
					had_access_token: hadAccessToken,
					had_refresh_token: hadRefreshToken,
				})
			);
		},

		trackSessionRestored(userId?: string): void {
			trackEvent(createEvent('auth_session_restored', { user_id: userId }));
		},

		/**
		 * Create a session event handler for the session manager
		 *
		 * @example
		 * ```typescript
		 * const sessionManager = createSessionManager(cookies, {
		 *   onAnalyticsEvent: authAnalytics.createSessionEventHandler()
		 * });
		 * ```
		 */
		createSessionEventHandler() {
			return (event: SessionAnalyticsEvent) => {
				const analyticsEvent = sessionEventToAnalytics(event, {
					property,
					sessionId: getSessionId(),
					userId: getUserId?.(),
					url: getUrl(),
				});
				trackEvent(analyticsEvent);
			};
		},
	};
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
	return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate session duration in minutes from token issue time
 */
export function calculateSessionDuration(tokenIssuedAt: number): number {
	const now = Math.floor(Date.now() / 1000);
	return Math.round((now - tokenIssuedAt) / 60);
}

/**
 * Calculate magic link age in minutes
 */
export function calculateLinkAge(linkCreatedAt: number): number {
	const now = Date.now();
	return Math.round((now - linkCreatedAt) / 1000 / 60);
}
