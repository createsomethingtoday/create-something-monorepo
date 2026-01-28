#!/usr/bin/env tsx
/**
 * Verify Analytics Client Initialization
 *
 * This script verifies that the analytics client correctly:
 * 1. Generates and stores session IDs in sessionStorage
 * 2. Queues events in memory before flushing
 *
 * Run with: pnpm --filter=@create-something/components exec tsx scripts/verify-analytics-client.ts
 */

import { AnalyticsClient } from '../src/lib/analytics/client.js';
import type { AnalyticsConfig } from '../src/lib/analytics/types.js';

// =============================================================================
// MOCK BROWSER ENVIRONMENT
// =============================================================================

// Mock sessionStorage for Node.js environment
const mockStorage = new Map<string, string>();
const mockSessionStorage = {
	getItem: (key: string) => mockStorage.get(key) ?? null,
	setItem: (key: string, value: string) => mockStorage.set(key, value),
	removeItem: (key: string) => mockStorage.delete(key),
	clear: () => mockStorage.clear(),
};

// Mock browser globals
(globalThis as any).window = {
	location: { href: 'https://createsomething.io/test-page' },
	addEventListener: () => {},
	sessionStorage: mockSessionStorage,
};
(globalThis as any).document = {
	referrer: 'https://google.com',
	visibilityState: 'visible',
};
// navigator is read-only in Node.js, so we define it on window instead
// and the analytics client accesses it via window.navigator
(globalThis as any).window.navigator = {
	doNotTrack: '0',
	sendBeacon: () => true,
};
(globalThis as any).sessionStorage = mockSessionStorage;

// Override globalThis.navigator by redefining it
Object.defineProperty(globalThis, 'navigator', {
	value: {
		doNotTrack: '0',
		sendBeacon: () => true,
	},
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
	const icon = condition ? '✅' : '❌';
	console.log(`${icon} ${name}`);
	console.log(`   ${message}`);
}

function printSummary(): void {
	console.log('\n' + '═'.repeat(60));
	const passed = results.filter((r) => r.passed).length;
	const total = results.length;
	console.log(`Summary: ${passed}/${total} verifications passed`);

	if (passed === total) {
		console.log('\n✅ All analytics client verifications PASSED');
	} else {
		console.log('\n❌ Some verifications FAILED');
		results.filter((r) => !r.passed).forEach((r) => {
			console.log(`   - ${r.name}: ${r.message}`);
		});
	}
}

// =============================================================================
// MAIN VERIFICATION
// =============================================================================

async function main(): Promise<void> {
	console.log('🔍 Analytics Client Verification');
	console.log('═'.repeat(60));
	console.log('Verifying acceptance criteria for csm-imo6\n');

	// Clear any existing session data
	mockStorage.clear();

	// -----------------------------------------------------------------------------
	// Test 1: Session ID Generation
	// -----------------------------------------------------------------------------
	console.log('📋 Criterion 1: Session ID Generation & Storage');
	console.log('─'.repeat(60));

	const config: AnalyticsConfig = {
		property: 'io',
		endpoint: '/api/analytics/events',
		debug: true,
	};

	const client = new AnalyticsClient(config);
	const sessionId = client.getSessionId();

	verify(
		'Session ID is generated',
		sessionId !== undefined && sessionId !== null && sessionId.length > 0,
		`Session ID: ${sessionId}`
	);

	verify(
		'Session ID follows expected format (s_<timestamp>_<random>)',
		/^s_[a-z0-9]+_[a-z0-9]+$/i.test(sessionId),
		`Format check: ${sessionId.match(/^s_[a-z0-9]+_[a-z0-9]+$/i) ? 'Valid' : 'Invalid'}`
	);

	const storedSession = mockStorage.get('cs_analytics_session');
	verify(
		'Session data is stored in sessionStorage',
		storedSession !== undefined,
		`Storage key 'cs_analytics_session': ${storedSession ? 'Present' : 'Missing'}`
	);

	if (storedSession) {
		const parsed = JSON.parse(storedSession);
		verify(
			'Stored session contains required fields (id, startedAt, lastActivityAt)',
			parsed.id && parsed.startedAt && parsed.lastActivityAt,
			`Fields: id=${!!parsed.id}, startedAt=${!!parsed.startedAt}, lastActivityAt=${!!parsed.lastActivityAt}`
		);
	}

	// -----------------------------------------------------------------------------
	// Test 2: Event Queuing in Memory
	// -----------------------------------------------------------------------------
	console.log('\n📋 Criterion 2: Event Queuing in Memory');
	console.log('─'.repeat(60));

	// Track a few events without flushing
	client.track('navigation', 'page_view', { metadata: { title: 'Test Page' } });
	client.track('interaction', 'button_click', { target: 'test-button' });
	client.track('content', 'scroll_depth', { value: 25 });

	// Access the private queue via any (for verification purposes only)
	const clientAny = client as any;
	const queueLength = clientAny.queue?.length ?? 0;

	verify(
		'Events are queued in memory',
		queueLength > 0,
		`Queue contains ${queueLength} event(s)`
	);

	verify(
		'Queued events have correct count',
		queueLength === 3,
		`Expected 3 events, got ${queueLength}`
	);

	// Verify event structure
	if (clientAny.queue && clientAny.queue.length > 0) {
		const firstEvent = clientAny.queue[0];
		verify(
			'Queued events have required fields',
			firstEvent.eventId &&
				firstEvent.sessionId &&
				firstEvent.property &&
				firstEvent.timestamp &&
				firstEvent.category &&
				firstEvent.action,
			`Event fields: eventId=${!!firstEvent.eventId}, sessionId=${!!firstEvent.sessionId}, ` +
				`property=${!!firstEvent.property}, category=${!!firstEvent.category}, action=${!!firstEvent.action}`
		);

		verify(
			'Queued events use the same session ID',
			clientAny.queue.every((e: any) => e.sessionId === sessionId),
			`All ${queueLength} events share session ${sessionId}`
		);
	}

	// -----------------------------------------------------------------------------
	// Test 3: Session Persistence
	// -----------------------------------------------------------------------------
	console.log('\n📋 Criterion 3: Session Persistence (Bonus)');
	console.log('─'.repeat(60));

	// Create a new client - should retrieve the same session
	const client2 = new AnalyticsClient(config);
	const sessionId2 = client2.getSessionId();

	verify(
		'New client retrieves existing session',
		sessionId === sessionId2,
		`Original: ${sessionId}, New client: ${sessionId2}`
	);

	// -----------------------------------------------------------------------------
	// Test 4: Event ID Uniqueness
	// -----------------------------------------------------------------------------
	console.log('\n📋 Criterion 4: Event ID Uniqueness (Bonus)');
	console.log('─'.repeat(60));

	const eventIds = new Set<string>();
	if (clientAny.queue) {
		clientAny.queue.forEach((e: any) => eventIds.add(e.eventId));
	}

	verify(
		'Each event has a unique ID',
		eventIds.size === queueLength,
		`${queueLength} events, ${eventIds.size} unique IDs`
	);

	// Print summary
	printSummary();

	// Exit with appropriate code
	const allPassed = results.every((r) => r.passed);
	process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
	console.error('❌ Verification failed with error:', error);
	process.exit(1);
});
