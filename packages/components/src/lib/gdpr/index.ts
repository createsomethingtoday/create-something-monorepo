/**
 * GDPR Compliance Module
 *
 * Privacy-first utilities for GDPR compliance across CREATE SOMETHING properties.
 *
 * @packageDocumentation
 */

export {
	// Types
	type ConsentState,
	type ConsentSyncResult,
	// Constants
	CONSENT_STORAGE_KEY,
	// Local storage operations
	getConsentState,
	setConsentState,
	updateAnalyticsConsent,
	clearConsentState,
	// Consent checks
	hasAnalyticsConsent,
	initializeConsent,
	// Server sync
	syncConsentWithServer,
	updateAndSyncConsent,
	// Browser detection
	isDNTEnabled,
	shouldTrackAnalytics,
} from './consent.js';
