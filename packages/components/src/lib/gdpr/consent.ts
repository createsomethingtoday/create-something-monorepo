/**
 * Consent State Management
 *
 * GDPR-compliant consent tracking for authenticated users.
 * Anonymous analytics don't require consent (no PII collected).
 * Authenticated users can opt-out of analytics tracking.
 *
 * Storage: localStorage (cs_consent)
 * Format: { analytics: boolean, timestamp: string }
 *
 * Philosophy: Privacy is not a feature—it's respect for the user's autonomy.
 *
 * @packageDocumentation
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ConsentState {
	/** Whether user has consented to analytics tracking */
	analytics: boolean;
	/** ISO timestamp of when consent was given/updated */
	timestamp: string;
}

export interface ConsentSyncResult {
	success: boolean;
	synced: boolean;
	error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** localStorage key for consent state */
export const CONSENT_STORAGE_KEY = 'cs_consent';

/** Default consent state (opted in by default, as per common practice) */
const DEFAULT_CONSENT: ConsentState = {
	analytics: true,
	timestamp: new Date().toISOString(),
};

// =============================================================================
// LOCAL STORAGE OPERATIONS
// =============================================================================

/**
 * Get current consent state from localStorage
 *
 * @returns ConsentState or null if not set
 */
export function getConsentState(): ConsentState | null {
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
		return null;
	}

	try {
		const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
		if (!stored) return null;

		const parsed = JSON.parse(stored) as ConsentState;

		// Validate structure
		if (typeof parsed.analytics !== 'boolean' || typeof parsed.timestamp !== 'string') {
			console.warn('[Consent] Invalid consent state in localStorage, clearing');
			localStorage.removeItem(CONSENT_STORAGE_KEY);
			return null;
		}

		return parsed;
	} catch (error) {
		console.warn('[Consent] Failed to parse consent state:', error);
		return null;
	}
}

/**
 * Set consent state in localStorage
 *
 * @param state - The consent state to save
 */
export function setConsentState(state: ConsentState): void {
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
		return;
	}

	try {
		localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
	} catch (error) {
		console.error('[Consent] Failed to save consent state:', error);
	}
}

/**
 * Update analytics consent
 *
 * @param analytics - Whether to enable analytics
 * @returns The new consent state
 */
export function updateAnalyticsConsent(analytics: boolean): ConsentState {
	const state: ConsentState = {
		analytics,
		timestamp: new Date().toISOString(),
	};
	setConsentState(state);
	return state;
}

/**
 * Clear consent state from localStorage
 */
export function clearConsentState(): void {
	if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
		return;
	}

	try {
		localStorage.removeItem(CONSENT_STORAGE_KEY);
	} catch (error) {
		console.error('[Consent] Failed to clear consent state:', error);
	}
}

// =============================================================================
// CONSENT CHECKS
// =============================================================================

/**
 * Check if user has given analytics consent
 *
 * For unauthenticated users: Always returns true (anonymous analytics allowed)
 * For authenticated users: Checks localStorage consent state
 *
 * @param isAuthenticated - Whether the user is authenticated
 * @returns true if analytics tracking is allowed
 */
export function hasAnalyticsConsent(isAuthenticated: boolean): boolean {
	// Anonymous users: analytics always allowed (no PII collected)
	if (!isAuthenticated) {
		return true;
	}

	// Authenticated users: check consent state
	const state = getConsentState();

	// No explicit consent recorded - default to opted in
	// (user can opt out via settings)
	if (!state) {
		return true;
	}

	return state.analytics;
}

/**
 * Initialize consent state if not present
 * Called when user logs in to ensure consent state exists
 *
 * @param analyticsOptOut - User's opt-out preference from identity-worker
 * @returns The consent state
 */
export function initializeConsent(analyticsOptOut?: boolean): ConsentState {
	const existing = getConsentState();

	if (existing) {
		return existing;
	}

	// Create default consent state
	// If user has opt-out set in their profile, respect that
	const state: ConsentState = {
		analytics: analyticsOptOut === undefined ? true : !analyticsOptOut,
		timestamp: new Date().toISOString(),
	};

	setConsentState(state);
	return state;
}

// =============================================================================
// SYNC WITH IDENTITY WORKER
// =============================================================================

/**
 * Sync local consent state with identity-worker
 *
 * Called when:
 * 1. User changes consent preference locally
 * 2. User logs in (to pull server-side preference)
 *
 * @param accessToken - The user's access token for authentication
 * @param analytics - The analytics consent value to sync
 * @returns Sync result
 */
export async function syncConsentWithServer(
	accessToken: string,
	analytics: boolean
): Promise<ConsentSyncResult> {
	try {
		const response = await fetch('https://id.createsomething.space/v1/users/me/analytics', {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({ analytics_opt_out: !analytics }),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: 'Unknown error' }));
			return {
				success: false,
				synced: false,
				error: (error as { message?: string }).message || 'Sync failed',
			};
		}

		return {
			success: true,
			synced: true,
		};
	} catch (error) {
		return {
			success: false,
			synced: false,
			error: error instanceof Error ? error.message : 'Network error',
		};
	}
}

/**
 * Update consent and optionally sync with server
 *
 * @param analytics - New analytics consent value
 * @param accessToken - Optional access token for server sync
 * @returns The new consent state and sync result
 */
export async function updateAndSyncConsent(
	analytics: boolean,
	accessToken?: string
): Promise<{ state: ConsentState; sync: ConsentSyncResult | null }> {
	// Update local state first
	const state = updateAnalyticsConsent(analytics);

	// Sync with server if authenticated
	let sync: ConsentSyncResult | null = null;
	if (accessToken) {
		sync = await syncConsentWithServer(accessToken, analytics);
	}

	return { state, sync };
}

// =============================================================================
// BROWSER DETECTION
// =============================================================================

/**
 * Check if Do Not Track is enabled in browser
 * DNT is always respected regardless of consent state
 */
export function isDNTEnabled(): boolean {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') {
		return false;
	}

	return (
		navigator.doNotTrack === '1' ||
		(window as unknown as { doNotTrack?: string }).doNotTrack === '1'
	);
}

/**
 * Check if analytics should be tracked for the current user
 *
 * This is the main function to call before tracking any event.
 * It checks:
 * 1. Browser DNT setting (always respected)
 * 2. User consent state (for authenticated users)
 *
 * @param isAuthenticated - Whether the user is authenticated
 * @returns true if tracking is allowed
 */
export function shouldTrackAnalytics(isAuthenticated: boolean): boolean {
	// DNT always takes precedence
	if (isDNTEnabled()) {
		return false;
	}

	// Check consent for authenticated users
	return hasAnalyticsConsent(isAuthenticated);
}
