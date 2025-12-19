#!/usr/bin/env tsx
/**
 * Verify Page View Tracking on Navigation
 *
 * This script verifies that the analytics client correctly:
 * 1. Fires initial page_view event on mount
 * 2. Fires route_change events on SPA navigation
 *
 * Acceptance Criteria for csm-ivm0:
 * - [ ] Verify initial page_view event is fired on mount
 * - [ ] Confirm route_change events fire on SPA navigation
 *
 * Run with: pnpm --filter=@create-something/components exec tsx scripts/verify-navigation-tracking.ts
 */

import { AnalyticsClient } from '../src/lib/analytics/client.js';
import type { AnalyticsConfig, AnalyticsEvent } from '../src/lib/analytics/types.js';

// =============================================================================
// MOCK BROWSER ENVIRONMENT
// =============================================================================

const mockStorage = new Map<string, string>();
const mockSessionStorage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, value: string) => mockStorage.set(key, value),
	removeItem: (key: string) => mockStorage.delete(key),
	clear: () => mockStorage.clear(),
};

// Create mock window object
const mockWindow = {
	location: { href: 'https://createsomething.io/' },
	addEventListener: () => {},
	sessionStorage: mockSessionStorage,
	doNotTrack: '0',
};

const mockDocument = {
	referrer: '',
	visibilityState: 'visible',
	title: 'Home | CREATE SOMETHING',
};

const mockNavigator = {
	doNotTrack: '0',
	sendBeacon: () => true,
};

// Use Object.defineProperty to avoid the getter-only restriction
Object.defineProperty(globalThis, 'window', {
	value: mockWindow,
	writable: true,
	configurable: true,
});
Object.defineProperty(globalThis, 'document', {
	value: mockDocument,
	writable: true,
	configurable: true,
});
Object.defineProperty(globalThis, 'navigator', {
	value: mockNavigator,
	writable: true,
	configurable: true,
});
Object.defineProperty(globalThis, 'sessionStorage', {
	value: mockSessionStorage,
	writable: true,
	configurable: true,
});

// =============================================================================
// VERIFICATION TESTS
// =============================================================================

interface VerificationResult {
	name: string;
	passed: boolean;
	message: string;
}

const results: VerificationResult[] = [];

function verify(name: string, condition: boolean, message: string): void {
	results.push({ name, passed: condition, message });
	const icon = condition ? '\u2705' : '\u274C';
	console.log(`${icon} ${name}`);
	console.log(`   ${message}`);
}

function printSummary(): void {
	console.log('\n' + '═'.repeat(60));
	const passed = results.filter((r) => r.passed).length;
	const total = results.length;
	console.log(`Summary: ${passed}/${total} verifications passed`);

	if (passed === total) {
		console.log('\n\u2705 All navigation tracking verifications PASSED');
	} else {
		console.log('\n\u274C Some verifications FAILED');
		results.filter((r) => !r.passed).forEach((r) => {
			console.log(`   - ${r.name}: ${r.message}`);
		});
	}
}

// =============================================================================
// MAIN VERIFICATION
// =============================================================================

async function main(): Promise<void> {
	console.log('\ud83d\udd0d Navigation Tracking Verification');
	console.log('═'.repeat(60));
	console.log('Verifying acceptance criteria for csm-ivm0\n');

	mockStorage.clear();

	const config: AnalyticsConfig = {
		property: 'io',
		endpoint: '/api/analytics/events',
		debug: true,
		batchSize: 100, // High batch size to prevent auto-flush during test
	};

	// -----------------------------------------------------------------------------
	// Test 1: Initial page_view Event on Mount
	// -----------------------------------------------------------------------------
	console.log('\ud83d\udccb Criterion 1: Initial page_view Event on Mount');
	console.log('─'.repeat(60));

	const client = new AnalyticsClient(config);

	// Simulate initial page view (what Analytics.svelte does on mount)
	client.pageView({ title: 'Home | CREATE SOMETHING' });

	// Access the private queue
	const clientAny = client as any;
	const queue: AnalyticsEvent[] = clientAny.queue ?? [];

	verify(
		'Initial page_view event is queued',
		queue.length >= 1,
		`Queue contains ${queue.length} event(s)`
	);

	const pageViewEvent = queue.find(
		(e) => e.category === 'navigation' && e.action === 'page_view'
	);

	verify(
		'page_view event has correct category',
		pageViewEvent?.category === 'navigation',
		`Category: ${pageViewEvent?.category ?? 'N/A'}`
	);

	verify(
		'page_view event has correct action',
		pageViewEvent?.action === 'page_view',
		`Action: ${pageViewEvent?.action ?? 'N/A'}`
	);

	verify(
		'page_view event contains title metadata',
		pageViewEvent?.metadata?.title === 'Home | CREATE SOMETHING',
		`Title: ${pageViewEvent?.metadata?.title ?? 'N/A'}`
	);

	verify(
		'page_view event has valid session ID',
		typeof pageViewEvent?.sessionId === 'string' && pageViewEvent.sessionId.startsWith('s_'),
		`Session ID: ${pageViewEvent?.sessionId ?? 'N/A'}`
	);

	verify(
		'page_view event has valid event ID',
		typeof pageViewEvent?.eventId === 'string' && pageViewEvent.eventId.startsWith('e_'),
		`Event ID: ${pageViewEvent?.eventId ?? 'N/A'}`
	);

	verify(
		'page_view event has timestamp',
		typeof pageViewEvent?.timestamp === 'string' && pageViewEvent.timestamp.length > 0,
		`Timestamp: ${pageViewEvent?.timestamp ?? 'N/A'}`
	);

	// -----------------------------------------------------------------------------
	// Test 2: route_change Events on SPA Navigation
	// -----------------------------------------------------------------------------
	console.log('\n\ud83d\udccb Criterion 2: route_change Events on SPA Navigation');
	console.log('─'.repeat(60));

	// Simulate SPA navigation from / to /about
	const fromPath = '/';
	const toPath = '/about';

	// Update mock window location
	mockWindow.location.href = 'https://createsomething.io/about';
	mockDocument.title = 'About | CREATE SOMETHING';

	// Call routeChange (what Analytics.svelte's $effect does)
	client.routeChange(fromPath, toPath);

	const updatedQueue: AnalyticsEvent[] = clientAny.queue ?? [];

	const routeChangeEvent = updatedQueue.find(
		(e) => e.category === 'navigation' && e.action === 'route_change'
	);

	verify(
		'route_change event is queued',
		routeChangeEvent !== undefined,
		`Found route_change event: ${routeChangeEvent ? 'Yes' : 'No'}`
	);

	verify(
		'route_change event has correct category',
		routeChangeEvent?.category === 'navigation',
		`Category: ${routeChangeEvent?.category ?? 'N/A'}`
	);

	verify(
		'route_change event has correct action',
		routeChangeEvent?.action === 'route_change',
		`Action: ${routeChangeEvent?.action ?? 'N/A'}`
	);

	verify(
		'route_change event contains fromPath',
		routeChangeEvent?.metadata?.fromPath === fromPath,
		`fromPath: ${routeChangeEvent?.metadata?.fromPath ?? 'N/A'}`
	);

	verify(
		'route_change event contains toPath',
		routeChangeEvent?.metadata?.toPath === toPath,
		`toPath: ${routeChangeEvent?.metadata?.toPath ?? 'N/A'}`
	);

	// -----------------------------------------------------------------------------
	// Test 3: Multiple Navigation Events
	// -----------------------------------------------------------------------------
	console.log('\n\ud83d\udccb Criterion 3: Multiple Navigation Events (Sequence)');
	console.log('─'.repeat(60));

	// Simulate another navigation: /about -> /projects
	client.routeChange('/about', '/projects');
	client.pageView({ title: 'Projects | CREATE SOMETHING' });

	// Simulate yet another: /projects -> /contact
	client.routeChange('/projects', '/contact');
	client.pageView({ title: 'Contact | CREATE SOMETHING' });

	const finalQueue: AnalyticsEvent[] = clientAny.queue ?? [];

	const allPageViews = finalQueue.filter(
		(e) => e.category === 'navigation' && e.action === 'page_view'
	);
	const allRouteChanges = finalQueue.filter(
		(e) => e.category === 'navigation' && e.action === 'route_change'
	);

	verify(
		'Multiple page_view events tracked',
		allPageViews.length === 3, // initial + 2 additional navigations (we only call pageView 3 times total)
		`Total page_view events: ${allPageViews.length} (expected 3)`
	);

	verify(
		'Multiple route_change events tracked',
		allRouteChanges.length === 3, // 3 navigations
		`Total route_change events: ${allRouteChanges.length} (expected 3)`
	);

	// Verify chronological order via event IDs
	const eventIds = finalQueue.map((e) => e.eventId);
	const uniqueIds = new Set(eventIds);

	verify(
		'All events have unique IDs',
		uniqueIds.size === finalQueue.length,
		`${finalQueue.length} events, ${uniqueIds.size} unique IDs`
	);

	// -----------------------------------------------------------------------------
	// Test 4: Event Structure Integrity
	// -----------------------------------------------------------------------------
	console.log('\n\ud83d\udccb Criterion 4: Event Structure Integrity');
	console.log('─'.repeat(60));

	const sessionId = client.getSessionId();
	const allSameSession = finalQueue.every((e) => e.sessionId === sessionId);

	verify(
		'All navigation events share same session',
		allSameSession,
		`Session consistency: ${allSameSession ? 'All match' : 'Mismatch detected'}`
	);

	const allHaveProperty = finalQueue.every((e) => e.property === 'io');

	verify(
		'All events have correct property',
		allHaveProperty,
		`Property: ${allHaveProperty ? 'io (correct)' : 'Incorrect property found'}`
	);

	const allHaveUrl = finalQueue.every((e) => typeof e.url === 'string');

	verify(
		'All events include URL',
		allHaveUrl,
		`URL presence: ${allHaveUrl ? 'All have URLs' : 'Some missing URL'}`
	);

	// Print summary
	printSummary();

	// Exit with appropriate code
	const allPassed = results.every((r) => r.passed);
	process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
	console.error('\u274C Verification failed with error:', error);
	process.exit(1);
});
