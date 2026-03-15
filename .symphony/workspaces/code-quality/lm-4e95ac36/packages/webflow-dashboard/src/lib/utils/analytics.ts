/**
 * Client-side analytics utilities
 * Tracks custom events to our D1 database
 */

import { hashString } from './hash';

const DASHBOARD_VERSION = 'v2';
const SESSION_ID_KEY = 'wf_dashboard_session_id';
const VISITOR_ID_KEY = 'wf_dashboard_visitor_id';

let inMemorySessionId: string | null = null;
let inMemoryVisitorId: string | null = null;

function hasWindow(): boolean {
	return typeof window !== 'undefined';
}

function generateTrackingId(prefix: string): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `${prefix}_${crypto.randomUUID()}`;
	}

	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readStorageValue(key: string, useLocalStorage = false): string | null {
	if (!hasWindow()) return null;

	try {
		const storage = useLocalStorage ? window.localStorage : window.sessionStorage;
		return storage.getItem(key);
	} catch {
		return null;
	}
}

function writeStorageValue(key: string, value: string, useLocalStorage = false): void {
	if (!hasWindow()) return;

	try {
		const storage = useLocalStorage ? window.localStorage : window.sessionStorage;
		storage.setItem(key, value);
	} catch {
		// Ignore storage failures (private mode, quota limits, etc.)
	}
}

function getOrCreateSessionId(): string {
	if (inMemorySessionId) return inMemorySessionId;

	const stored = readStorageValue(SESSION_ID_KEY);
	if (stored) {
		inMemorySessionId = stored;
		return stored;
	}

	const created = generateTrackingId('sess');
	inMemorySessionId = created;
	writeStorageValue(SESSION_ID_KEY, created);
	return created;
}

function getOrCreateVisitorId(): string {
	if (inMemoryVisitorId) return inMemoryVisitorId;

	const stored = readStorageValue(VISITOR_ID_KEY, true);
	if (stored) {
		inMemoryVisitorId = stored;
		return stored;
	}

	const created = generateTrackingId('visitor');
	inMemoryVisitorId = created;
	writeStorageValue(VISITOR_ID_KEY, created, true);
	return created;
}

function getIsEmbedded(): boolean | null {
	if (!hasWindow()) return null;

	try {
		return window.top !== window.self;
	} catch {
		return null;
	}
}

export function getRouteGroup(pathname: string): string {
	if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
	if (pathname.startsWith('/assets/')) return 'asset_detail';
	if (pathname.startsWith('/assets')) return 'assets';
	if (pathname.startsWith('/marketplace')) return 'marketplace';
	if (pathname.startsWith('/validation/playground')) return 'validation_playground';
	if (pathname.startsWith('/validation')) return 'validation';
	if (pathname.startsWith('/login')) return 'auth_login';
	if (pathname.startsWith('/verify')) return 'auth_verify';
	return 'other';
}

export function getPageName(pathname: string): string {
	if (pathname === '/' || pathname === '/dashboard') return 'dashboard_home';
	if (pathname.startsWith('/assets/')) return 'asset_detail';
	if (pathname.startsWith('/assets')) return 'assets_list';
	if (pathname.startsWith('/marketplace')) return 'marketplace_insights';
	if (pathname.startsWith('/validation/playground')) return 'validation_playground';
	if (pathname.startsWith('/validation')) return 'validation_tools';
	if (pathname.startsWith('/login')) return 'login';
	if (pathname.startsWith('/verify')) return 'verify';
	return 'page';
}

function getDefaultProperties(pagePath: string): Record<string, unknown> {
	if (!hasWindow()) return {};

	return {
		dashboard_version: DASHBOARD_VERSION,
		session_id: getOrCreateSessionId(),
		visitor_id: getOrCreateVisitorId(),
		route_group: getRouteGroup(pagePath),
		is_embedded: getIsEmbedded(),
		client_timestamp: new Date().toISOString()
	};
}

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

	if (!hasWindow()) return;

	try {
		const pagePath = window.location.pathname;
		const enrichedProperties = {
			...getDefaultProperties(pagePath),
			...properties
		};

		await fetch('/api/analytics/track', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			keepalive: true,
			body: JSON.stringify({
				eventName,
				pagePath,
				properties: enrichedProperties
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
	if (!hasWindow()) return;

	trackEvent('page_view', {
		page_name: pageName,
		page_path: window.location.pathname,
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
