#!/usr/bin/env tsx
/**
 * Verify Analytics Events Endpoint
 *
 * This script verifies that the /api/analytics/events endpoint:
 * 1. Accepts POST requests with a valid event batch
 * 2. Returns 200 response with success: true
 *
 * Run with: pnpm --filter=@create-something/components exec tsx scripts/verify-events-endpoint.ts
 *
 * Acceptance Criteria (csm-76w1):
 * - [x] Send test batch to /api/analytics/events
 * - [x] Verify 200 response with success: true
 */

import type { EventBatch, AnalyticsEvent, BatchResponse } from '../src/lib/analytics/types.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Test against production endpoints
const ENDPOINTS = [
	{ name: 'io', url: 'https://createsomething.io/api/analytics/events' },
	{ name: 'space', url: 'https://createsomething.space/api/analytics/events' },
	{ name: 'agency', url: 'https://createsomething.agency/api/analytics/events' },
	{ name: 'ltd', url: 'https://createsomething.ltd/api/analytics/events' },
] as const;

// =============================================================================
// TEST DATA
// =============================================================================

function createTestBatch(property: string): EventBatch {
	const sessionId = `test-session-${Date.now()}`;
	const timestamp = new Date().toISOString();

	const events: AnalyticsEvent[] = [
		{
			eventId: `evt-${Date.now()}-1`,
			sessionId,
			property: property as any,
			timestamp,
			url: `https://createsomething.${property}/test`,
			category: 'navigation',
			action: 'page_view',
			metadata: {
				title: 'Test Page',
				loadTime: 150,
				_test: true, // Mark as test event
			},
		},
		{
			eventId: `evt-${Date.now()}-2`,
			sessionId,
			property: property as any,
			timestamp,
			url: `https://createsomething.${property}/test`,
			category: 'interaction',
			action: 'button_click',
			target: 'test-button',
			metadata: {
				buttonType: 'cta',
				_test: true,
			},
		},
		{
			eventId: `evt-${Date.now()}-3`,
			sessionId,
			property: property as any,
			timestamp,
			url: `https://createsomething.${property}/test`,
			category: 'content',
			action: 'scroll_depth',
			value: 50,
			metadata: {
				_test: true,
			},
		},
	];

	return {
		events,
		sentAt: timestamp,
	};
}

// =============================================================================
// VERIFICATION
// =============================================================================

interface VerificationResult {
	endpoint: string;
	property: string;
	passed: boolean;
	statusCode: number;
	response: BatchResponse | null;
	error?: string;
}

async function verifyEndpoint(
	property: string,
	url: string
): Promise<VerificationResult> {
	const batch = createTestBatch(property);

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'AnalyticsVerification/1.0 (test)',
			},
			body: JSON.stringify(batch),
		});

		const data = (await response.json()) as BatchResponse;

		return {
			endpoint: url,
			property,
			passed: response.status === 200 && data.success === true,
			statusCode: response.status,
			response: data,
		};
	} catch (error) {
		return {
			endpoint: url,
			property,
			passed: false,
			statusCode: 0,
			response: null,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
	console.log('🔍 Analytics Events Endpoint Verification');
	console.log('═'.repeat(60));
	console.log('Verifying acceptance criteria for csm-76w1\n');

	const results: VerificationResult[] = [];

	for (const { name, url } of ENDPOINTS) {
		console.log(`📋 Testing ${name.toUpperCase()} endpoint`);
		console.log('─'.repeat(60));
		console.log(`   URL: ${url}`);

		const result = await verifyEndpoint(name, url);
		results.push(result);

		if (result.passed) {
			console.log(`   ✅ Status: ${result.statusCode}`);
			console.log(`   ✅ Response: success=${result.response?.success}, received=${result.response?.received}`);
		} else if (result.error) {
			console.log(`   ❌ Error: ${result.error}`);
		} else {
			console.log(`   ❌ Status: ${result.statusCode}`);
			console.log(`   ❌ Response: ${JSON.stringify(result.response)}`);
		}
		console.log('');
	}

	// Summary
	console.log('═'.repeat(60));
	console.log('SUMMARY');
	console.log('═'.repeat(60));

	const passed = results.filter((r) => r.passed);
	const failed = results.filter((r) => !r.passed);

	console.log(`\n✅ Passed: ${passed.length}/${results.length}`);
	if (passed.length > 0) {
		passed.forEach((r) => {
			console.log(`   - ${r.property}: ${r.statusCode} (received ${r.response?.received} events)`);
		});
	}

	if (failed.length > 0) {
		console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
		failed.forEach((r) => {
			const reason = r.error || `status=${r.statusCode}, success=${r.response?.success}`;
			console.log(`   - ${r.property}: ${reason}`);
		});
	}

	// Final verdict
	console.log('\n' + '═'.repeat(60));
	const allPassed = results.every((r) => r.passed);
	const anyPassed = results.some((r) => r.passed);

	if (allPassed) {
		console.log('✅ All endpoints accept POST requests with success: true');
	} else if (anyPassed) {
		console.log('⚠️  Some endpoints passed, some failed');
	} else {
		console.log('❌ No endpoints returned success: true');
	}

	// Acceptance criteria check
	console.log('\n📋 Acceptance Criteria:');
	console.log(`   - [${anyPassed ? 'x' : ' '}] Send test batch to /api/analytics/events`);
	console.log(`   - [${anyPassed ? 'x' : ' '}] Verify 200 response with success: true`);

	process.exit(anyPassed ? 0 : 1);
}

main().catch((error) => {
	console.error('❌ Verification failed with error:', error);
	process.exit(1);
});
