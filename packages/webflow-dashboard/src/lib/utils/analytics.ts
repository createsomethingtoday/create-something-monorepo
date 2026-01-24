/**
 * Client-side analytics utilities
 * Tracks custom events to our D1 database
 */

import { hashString } from './hash';

/**
 * Track a custom event
 */
export async function trackEvent(
	eventName: string,
	properties: Record<string, unknown> = {}
): Promise<void> {
	if (!eventName) {
		console.warn('Analytics: Event name is required');
		return;
	}

	try {
		await fetch('/api/analytics/track', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				eventName,
				pagePath: window.location.pathname,
				properties
			})
		});
	} catch (error) {
		// Silently fail - analytics shouldn't break the app
		console.debug('Analytics tracking failed:', error);
	}
}

/**
 * Track a page view
 */
export function trackPageView(pageName: string, properties: Record<string, unknown> = {}): void {
	trackEvent('page_view', {
		page_name: pageName,
		...properties
	});
}

/**
 * Track an error
 */
export function trackError(errorType: string, context: Record<string, unknown> = {}): void {
	trackEvent('error', {
		error_type: errorType,
		...context
	});
}

/**
 * Track a user action
 */
export function trackAction(action: string, context: Record<string, unknown> = {}): void {
	trackEvent('user_action', {
		action,
		...context
	});
}

/**
 * Track asset-related events
 */
export const AssetAnalytics = {
	viewed: (assetId: string, assetName: string) =>
		trackEvent('asset_viewed', { asset_id: assetId, asset_name: assetName }),

	edited: (assetId: string, fieldsChanged: string[]) =>
		trackEvent('asset_edited', { asset_id: assetId, fields_changed: fieldsChanged }),

	archived: (assetId: string) => trackEvent('asset_archived', { asset_id: assetId }),

	imageUploaded: (assetId: string, imageType: string) =>
		trackEvent('image_uploaded', { asset_id: assetId, image_type: imageType })
};

/**
 * Track validation-related events
 */
export const ValidationAnalytics = {
	started: (toolName: string) => trackEvent('validation_started', { tool: toolName }),

	completed: (toolName: string, passed: boolean, issueCount: number) =>
		trackEvent('validation_completed', { tool: toolName, passed, issue_count: issueCount }),

	failed: (toolName: string, error: string) =>
		trackEvent('validation_failed', { tool: toolName, error })
};

/**
 * Track feedback events
 */
export const FeedbackAnalytics = {
	submitted: (feedbackType: string) => trackEvent('feedback_submitted', { type: feedbackType }),

	opened: () => trackEvent('feedback_opened', {})
};

// Re-export hash function for server-side use
export { hashString };
