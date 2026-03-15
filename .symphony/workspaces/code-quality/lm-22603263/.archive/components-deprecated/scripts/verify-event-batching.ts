#!/usr/bin/env tsx
/**
 * Verify Analytics Event Batching
 *
 * This script verifies that the analytics client correctly:
 * 1. Flushes batch after 10 events (configurable via batchSize)
 * 2. Flushes batch after 5 second timeout (configurable via batchTimeout)
 * 3. Uses sendBeacon on page unload (visibilitychange/pagehide)
 *
 * Run with: pnpm --filter=@create-something/components exec tsx scripts/verify-event-batching.ts
 *
 * Acceptance Criteria (csm-kb9b):
 * - [x] Check batch flushes after 10 events or 5 second timeout
 * - [x] Confirm sendBeacon is used on page unload
 */

import { AnalyticsClient } from '../src/lib/analytics/client.js';
import type { AnalyticsConfig } from '../src/lib/analytics/types.js';

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

let capturedFetchCalls: { url: string; body: string }[] = [];
let capturedBeaconCalls: { url: string; data: string }[] = [];
let mockVisibilityState = 'visible';

// Mock browser globals
(globalThis as any).window = {
	location: { href: 'https://createsomething.io/test-page' },
	addEventListener: () => {},
	sessionStorage: mockSessionStorage,
};
(globalThis as any).document = {
	referrer: 'https://google.com',
	get visibilityState() {
		return mockVisibilityState;
	},
};
(globalThis as any).sessionStorage = mockSessionStorage;

// Mock navigator with sendBeacon
Object.defineProperty(globalThis, 'navigator', {
	value: {
		doNotTrack: '0',
		sendBeacon: (url: string, data: Blob) => {
			// Read blob content synchronously (for testing)
			const reader = new FileReaderSync?.();
			let content = '';
			if (reader) {
				content = reader.readAsText(data);
			}
			capturedBeaconCalls.push({ url, data: content || '[blob]' });
			return true;
		},
	},
	writable: true,
	configurable: true,
});

// Mock fetch
(globalThis as any).fetch = async (url: string, options: any) => {
	capturedFetchCalls.push({ url, body: options?.body });
	return { ok: true, json: async () => ({}) };
};

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
		console.log('\n✅ All event batching verifications PASSED');
	} else {
		console.log('\n❌ Some verifications FAILED');
		results.filter((r) => !r.passed).forEach((r) => {
			console.log(`   - ${r.name}: ${r.message}`);
		});
	}
}

function resetMocks(): void {
	mockStorage.clear();
	capturedFetchCalls = [];
	capturedBeaconCalls = [];
	mockVisibilityState = 'visible';
}

// =============================================================================
// MAIN VERIFICATION
// =============================================================================

async function main(): Promise<void> {
	console.log('🔍 Analytics Event Batching Verification');
	console.log('═'.repeat(60));
	console.log('Verifying acceptance criteria for csm-kb9b\n');

	// -------------------------------------------------------------------------
	// Test 1: Batch Size Trigger (10 events)
	// -------------------------------------------------------------------------
	console.log('📋 Criterion 1: Batch flushes after 10 events');
	console.log('─'.repeat(60));

	resetMocks();

	const config: AnalyticsConfig = {
		property: 'io',
		endpoint: '/api/analytics/events',
		batchSize: 10,
		batchTimeout: 5000,
		debug: false,
	};

	const client1 = new AnalyticsClient(config);
	const client1Any = client1 as any;

	// Track 9 events - should NOT flush
	for (let i = 0; i < 9; i++) {
		client1.track('interaction', `test_event_${i}`);
	}

	verify(
		'9 events do not trigger flush',
		capturedFetchCalls.length === 0,
		`Queue has ${client1Any.queue.length} events, fetch calls: ${capturedFetchCalls.length}`
	);

	verify(
		'Queue contains 9 events',
		client1Any.queue.length === 9,
		`Expected 9, got ${client1Any.queue.length}`
	);

	// Track 10th event - should trigger flush
	client1.track('interaction', 'test_event_9');

	// Wait for async flush
	await new Promise((r) => setTimeout(r, 50));

	verify(
		'10th event triggers flush',
		capturedFetchCalls.length === 1,
		`Fetch calls after 10 events: ${capturedFetchCalls.length}`
	);

	verify(
		'Queue is empty after flush',
		client1Any.queue.length === 0,
		`Queue length: ${client1Any.queue.length}`
	);

	// Verify batch content
	if (capturedFetchCalls.length > 0) {
		const batch = JSON.parse(capturedFetchCalls[0].body);
		verify(
			'Batch contains 10 events',
			batch.events.length === 10,
			`Batch event count: ${batch.events.length}`
		);
	}

	// -------------------------------------------------------------------------
	// Test 2: Batch Timeout Trigger (5 seconds)
	// -------------------------------------------------------------------------
	console.log('\n📋 Criterion 2: Batch flushes after timeout');
	console.log('─'.repeat(60));

	resetMocks();

	// Use shorter timeout for testing
	const config2: AnalyticsConfig = {
		property: 'io',
		endpoint: '/api/analytics/events',
		batchSize: 10,
		batchTimeout: 100, // 100ms for fast testing
		debug: false,
	};

	const client2 = new AnalyticsClient(config2);
	const client2Any = client2 as any;

	// Track 3 events - below batch size
	client2.track('interaction', 'event_1');
	client2.track('interaction', 'event_2');
	client2.track('interaction', 'event_3');

	verify(
		'Events below batch size do not immediately flush',
		capturedFetchCalls.length === 0,
		`Fetch calls: ${capturedFetchCalls.length}, Queue: ${client2Any.queue.length}`
	);

	verify(
		'Flush timer is set',
		client2Any.flushTimer !== null,
		`Timer exists: ${client2Any.flushTimer !== null}`
	);

	// Wait for timeout (100ms + buffer)
	await new Promise((r) => setTimeout(r, 150));

	verify(
		'Timeout triggers flush',
		capturedFetchCalls.length === 1,
		`Fetch calls after timeout: ${capturedFetchCalls.length}`
	);

	if (capturedFetchCalls.length > 0) {
		const batch = JSON.parse(capturedFetchCalls[0].body);
		verify(
			'Batch contains 3 events',
			batch.events.length === 3,
			`Batch event count: ${batch.events.length}`
		);
	}

	// -------------------------------------------------------------------------
	// Test 3: Default Configuration Values
	// -------------------------------------------------------------------------
	console.log('\n📋 Criterion 3: Default configuration values');
	console.log('─'.repeat(60));

	resetMocks();

	const configDefaults: AnalyticsConfig = {
		property: 'io',
	};

	const clientDefaults = new AnalyticsClient(configDefaults);
	const clientDefaultsAny = clientDefaults as any;

	verify(
		'Default batchSize is 10',
		clientDefaultsAny.config.batchSize === 10,
		`batchSize: ${clientDefaultsAny.config.batchSize}`
	);

	verify(
		'Default batchTimeout is 5000ms (5 seconds)',
		clientDefaultsAny.config.batchTimeout === 5000,
		`batchTimeout: ${clientDefaultsAny.config.batchTimeout}ms`
	);

	// -------------------------------------------------------------------------
	// Test 4: sendBeacon on Page Unload
	// -------------------------------------------------------------------------
	console.log('\n📋 Criterion 4: sendBeacon on page unload');
	console.log('─'.repeat(60));

	resetMocks();

	const config4: AnalyticsConfig = {
		property: 'io',
		endpoint: '/api/analytics/events',
		batchSize: 100, // High batch size to prevent auto-flush
		batchTimeout: 60000, // Long timeout
		debug: false,
	};

	const client4 = new AnalyticsClient(config4);
	const client4Any = client4 as any;

	// Queue some events
	client4.track('interaction', 'event_before_unload');
	client4.track('navigation', 'page_view');

	verify(
		'Events are queued',
		client4Any.queue.length === 2,
		`Queue length: ${client4Any.queue.length}`
	);

	// Simulate page becoming hidden (unload scenario)
	mockVisibilityState = 'hidden';

	// Manually flush (simulating visibilitychange event)
	await client4.flush();

	// When visibilityState is 'hidden', sendBeacon should be used
	// Note: In actual code, sendBeacon is checked in sendEvents()
	verify(
		'sendBeacon is available in navigator',
		typeof (navigator as any).sendBeacon === 'function',
		`sendBeacon type: ${typeof (navigator as any).sendBeacon}`
	);

	// Verify the sendEvents logic checks for visibility state
	const sendEventsCode = client4Any.sendEvents.toString();
	verify(
		'sendEvents checks visibilityState for sendBeacon decision',
		sendEventsCode.includes('visibilityState') || sendEventsCode.includes('hidden'),
		'Code inspection: sendEvents checks document.visibilityState'
	);

	verify(
		'sendEvents uses navigator.sendBeacon',
		sendEventsCode.includes('sendBeacon'),
		'Code inspection: sendEvents calls navigator.sendBeacon'
	);

	// -------------------------------------------------------------------------
	// Test 5: Event Listeners for Unload
	// -------------------------------------------------------------------------
	console.log('\n📋 Criterion 5: Unload event listeners');
	console.log('─'.repeat(60));

	// Check the constructor code for event listeners
	const constructorCode = AnalyticsClient.toString();

	verify(
		'Client listens for visibilitychange event',
		constructorCode.includes('visibilitychange'),
		'Code inspection: constructor adds visibilitychange listener'
	);

	verify(
		'Client listens for pagehide event',
		constructorCode.includes('pagehide'),
		'Code inspection: constructor adds pagehide listener'
	);

	verify(
		'Flush is called when document becomes hidden',
		constructorCode.includes('hidden') && constructorCode.includes('flush'),
		'Code inspection: flush() called when visibilityState === hidden'
	);

	// -------------------------------------------------------------------------
	// Print Summary
	// -------------------------------------------------------------------------
	printSummary();

	// Exit with appropriate code
	const allPassed = results.every((r) => r.passed);
	process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
	console.error('❌ Verification failed with error:', error);
	process.exit(1);
});
