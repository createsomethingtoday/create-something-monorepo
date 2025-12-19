#!/usr/bin/env tsx
/**
 * Verify D1 Storage for Analytics Events
 *
 * This script verifies that the unified_events table in D1:
 * 1. Contains events after they are sent via the /api/analytics/events endpoint
 * 2. Events are stored with the correct schema matching the migration
 *
 * Run with: pnpm --filter=io exec tsx scripts/verify-d1-storage.ts
 *
 * Prerequisites:
 * - CLOUDFLARE_API_TOKEN environment variable set
 * - Test events should have been sent via verify-events-endpoint.ts
 *
 * Acceptance Criteria (csm-7mxx):
 * - [x] Query unified_events table after sending events
 * - [x] Confirm events are stored with correct schema
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const ACCOUNT_ID = '9645bd52e640b8a4f40a3a55ff1dd75a';
const DATABASE_ID = 'a74e70ae-6a94-43da-905e-b90719c8dfd2'; // create-something-db

// Expected schema based on 004_unified_analytics.sql migration
const EXPECTED_SCHEMA = [
	{ name: 'id', type: 'TEXT', notnull: false, pk: true },
	{ name: 'session_id', type: 'TEXT', notnull: true, pk: false },
	{ name: 'user_id', type: 'TEXT', notnull: false, pk: false },
	{ name: 'property', type: 'TEXT', notnull: true, pk: false },
	{ name: 'category', type: 'TEXT', notnull: true, pk: false },
	{ name: 'action', type: 'TEXT', notnull: true, pk: false },
	{ name: 'target', type: 'TEXT', notnull: false, pk: false },
	{ name: 'value', type: 'REAL', notnull: false, pk: false },
	{ name: 'url', type: 'TEXT', notnull: true, pk: false },
	{ name: 'referrer', type: 'TEXT', notnull: false, pk: false },
	{ name: 'user_agent', type: 'TEXT', notnull: false, pk: false },
	{ name: 'ip_country', type: 'TEXT', notnull: false, pk: false },
	{ name: 'metadata', type: 'TEXT', notnull: false, pk: false },
	{ name: 'created_at', type: 'TEXT', notnull: false, pk: false },
] as const;

const VALID_PROPERTIES = ['space', 'io', 'agency', 'ltd', 'lms'] as const;
const VALID_CATEGORIES = [
	'navigation',
	'interaction',
	'search',
	'content',
	'conversion',
	'error',
	'performance',
] as const;

// =============================================================================
// D1 API CLIENT
// =============================================================================

interface D1QueryResult<T = Record<string, unknown>> {
	result: Array<{
		results: T[];
		success: boolean;
		meta?: {
			duration: number;
			rows_read: number;
			rows_written: number;
		};
	}>;
	success: boolean;
	errors: unknown[];
}

interface ColumnInfo {
	cid: number;
	name: string;
	type: string;
	notnull: number;
	dflt_value: string | null;
	pk: number;
}

interface UnifiedEvent {
	id: string;
	session_id: string;
	user_id: string | null;
	property: string;
	category: string;
	action: string;
	target: string | null;
	value: number | null;
	url: string;
	referrer: string | null;
	user_agent: string | null;
	ip_country: string | null;
	metadata: string | null;
	created_at: string;
}

async function queryD1<T = Record<string, unknown>>(
	query: string
): Promise<D1QueryResult<T>> {
	const apiToken = process.env.CLOUDFLARE_API_TOKEN;
	if (!apiToken) {
		throw new Error('CLOUDFLARE_API_TOKEN environment variable not set');
	}

	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ sql: query }),
		}
	);

	if (!response.ok) {
		throw new Error(`D1 API error: ${response.status} ${response.statusText}`);
	}

	return response.json() as Promise<D1QueryResult<T>>;
}

// =============================================================================
// VERIFICATION TESTS
// =============================================================================

interface VerificationResult {
	name: string;
	passed: boolean;
	message: string;
	details?: string[];
}

const results: VerificationResult[] = [];

function verify(
	name: string,
	passed: boolean,
	message: string,
	details?: string[]
): void {
	results.push({ name, passed, message, details });
	const icon = passed ? '✅' : '❌';
	console.log(`${icon} ${name}`);
	console.log(`   ${message}`);
	if (details && details.length > 0) {
		details.forEach((d) => console.log(`   - ${d}`));
	}
}

// =============================================================================
// MAIN VERIFICATION
// =============================================================================

async function main(): Promise<void> {
	console.log('🔍 D1 Storage Verification for Analytics Events');
	console.log('═'.repeat(60));
	console.log('Verifying acceptance criteria for csm-7mxx\n');

	const apiToken = process.env.CLOUDFLARE_API_TOKEN;
	if (!apiToken) {
		console.error('❌ CLOUDFLARE_API_TOKEN environment variable not set');
		console.log('\nSet it with: export CLOUDFLARE_API_TOKEN=your_token_here');
		process.exit(1);
	}

	// -------------------------------------------------------------------------
	// Test 1: Table Exists
	// -------------------------------------------------------------------------
	console.log('📋 Criterion 1: unified_events Table Exists');
	console.log('─'.repeat(60));

	try {
		const tablesResult = await queryD1<{ name: string }>(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='unified_events'"
		);
		const tableExists =
			tablesResult.result[0]?.results?.length > 0 &&
			tablesResult.result[0].results[0]?.name === 'unified_events';

		verify(
			'unified_events table exists',
			tableExists,
			tableExists
				? 'Table found in database'
				: 'Table not found - run migrations first'
		);

		if (!tableExists) {
			console.log('\n❌ Cannot continue without unified_events table');
			process.exit(1);
		}
	} catch (error) {
		console.error('❌ Failed to query database:', error);
		process.exit(1);
	}

	// -------------------------------------------------------------------------
	// Test 2: Schema Matches Migration
	// -------------------------------------------------------------------------
	console.log('\n📋 Criterion 2: Schema Matches Migration Definition');
	console.log('─'.repeat(60));

	try {
		const schemaResult = await queryD1<ColumnInfo>(
			'PRAGMA table_info(unified_events)'
		);
		const columns = schemaResult.result[0]?.results || [];

		// Check column count
		verify(
			'Column count matches',
			columns.length === EXPECTED_SCHEMA.length,
			`Expected ${EXPECTED_SCHEMA.length} columns, found ${columns.length}`
		);

		// Check each column
		const schemaErrors: string[] = [];
		for (const expected of EXPECTED_SCHEMA) {
			const actual = columns.find((c) => c.name === expected.name);
			if (!actual) {
				schemaErrors.push(`Missing column: ${expected.name}`);
				continue;
			}
			if (actual.type !== expected.type) {
				schemaErrors.push(
					`${expected.name}: expected type ${expected.type}, got ${actual.type}`
				);
			}
			if ((actual.notnull === 1) !== expected.notnull) {
				schemaErrors.push(
					`${expected.name}: expected notnull=${expected.notnull}, got ${actual.notnull === 1}`
				);
			}
			if ((actual.pk === 1) !== expected.pk) {
				schemaErrors.push(
					`${expected.name}: expected pk=${expected.pk}, got ${actual.pk === 1}`
				);
			}
		}

		verify(
			'All columns match expected schema',
			schemaErrors.length === 0,
			schemaErrors.length === 0
				? 'Schema matches migration definition'
				: `Found ${schemaErrors.length} schema mismatch(es)`,
			schemaErrors
		);
	} catch (error) {
		console.error('❌ Failed to verify schema:', error);
	}

	// -------------------------------------------------------------------------
	// Test 3: Events Are Stored After Sending
	// -------------------------------------------------------------------------
	console.log('\n📋 Criterion 3: Events Are Stored After Sending');
	console.log('─'.repeat(60));

	try {
		const eventsResult = await queryD1<UnifiedEvent>(
			'SELECT * FROM unified_events ORDER BY created_at DESC LIMIT 20'
		);
		const events = eventsResult.result[0]?.results || [];

		verify(
			'Events exist in database',
			events.length > 0,
			events.length > 0
				? `Found ${events.length} recent events`
				: 'No events found - run verify-events-endpoint.ts first'
		);

		if (events.length > 0) {
			// Check for test events (from verify-events-endpoint.ts)
			const testEvents = events.filter(
				(e) =>
					e.user_agent?.includes('AnalyticsVerification') ||
					e.metadata?.includes('_test')
			);

			verify(
				'Test events from verification script found',
				testEvents.length > 0,
				testEvents.length > 0
					? `Found ${testEvents.length} test events`
					: 'No test events found - run verify-events-endpoint.ts first'
			);

			// Check events from all properties
			const propertiesFound = new Set(events.map((e) => e.property));
			const allPropertiesPresent = ['io', 'space', 'agency', 'ltd'].every((p) =>
				propertiesFound.has(p)
			);

			verify(
				'Events from all properties stored',
				allPropertiesPresent,
				`Properties found: ${Array.from(propertiesFound).join(', ')}`,
				allPropertiesPresent
					? undefined
					: [
							`Missing: ${['io', 'space', 'agency', 'ltd'].filter((p) => !propertiesFound.has(p)).join(', ')}`,
						]
			);
		}
	} catch (error) {
		console.error('❌ Failed to query events:', error);
	}

	// -------------------------------------------------------------------------
	// Test 4: Event Data Integrity
	// -------------------------------------------------------------------------
	console.log('\n📋 Criterion 4: Event Data Integrity');
	console.log('─'.repeat(60));

	try {
		const eventsResult = await queryD1<UnifiedEvent>(
			'SELECT * FROM unified_events ORDER BY created_at DESC LIMIT 10'
		);
		const events = eventsResult.result[0]?.results || [];

		if (events.length > 0) {
			const integrityErrors: string[] = [];

			for (const event of events) {
				// Check required fields are not null
				if (!event.id) integrityErrors.push(`Event missing id`);
				if (!event.session_id)
					integrityErrors.push(`Event ${event.id} missing session_id`);
				if (!event.property)
					integrityErrors.push(`Event ${event.id} missing property`);
				if (!event.category)
					integrityErrors.push(`Event ${event.id} missing category`);
				if (!event.action)
					integrityErrors.push(`Event ${event.id} missing action`);
				if (!event.url) integrityErrors.push(`Event ${event.id} missing url`);

				// Check property is valid
				if (
					event.property &&
					!VALID_PROPERTIES.includes(event.property as (typeof VALID_PROPERTIES)[number])
				) {
					integrityErrors.push(
						`Event ${event.id} has invalid property: ${event.property}`
					);
				}

				// Check category is valid
				if (
					event.category &&
					!VALID_CATEGORIES.includes(event.category as (typeof VALID_CATEGORIES)[number])
				) {
					integrityErrors.push(
						`Event ${event.id} has invalid category: ${event.category}`
					);
				}

				// Check metadata is valid JSON if present
				if (event.metadata) {
					try {
						JSON.parse(event.metadata);
					} catch {
						integrityErrors.push(
							`Event ${event.id} has invalid metadata JSON`
						);
					}
				}

				// Check created_at is valid ISO date
				if (event.created_at && isNaN(Date.parse(event.created_at))) {
					integrityErrors.push(
						`Event ${event.id} has invalid created_at: ${event.created_at}`
					);
				}
			}

			verify(
				'Event data integrity',
				integrityErrors.length === 0,
				integrityErrors.length === 0
					? `All ${events.length} events have valid data`
					: `Found ${integrityErrors.length} integrity issue(s)`,
				integrityErrors.slice(0, 5) // Show max 5 errors
			);
		}
	} catch (error) {
		console.error('❌ Failed to verify event integrity:', error);
	}

	// -------------------------------------------------------------------------
	// Test 5: Daily Aggregates Are Computed
	// -------------------------------------------------------------------------
	console.log('\n📋 Criterion 5: Daily Aggregates (Bonus)');
	console.log('─'.repeat(60));

	try {
		const aggregatesResult = await queryD1<{
			date: string;
			property: string;
			category: string;
			action: string;
			count: number;
		}>(
			'SELECT * FROM unified_events_daily ORDER BY date DESC LIMIT 10'
		);
		const aggregates = aggregatesResult.result[0]?.results || [];

		verify(
			'Daily aggregates are computed',
			aggregates.length > 0,
			aggregates.length > 0
				? `Found ${aggregates.length} aggregate records`
				: 'No aggregates found - events may not have triggered aggregation'
		);

		if (aggregates.length > 0) {
			const today = new Date().toISOString().split('T')[0];
			const todayAggregates = aggregates.filter((a) => a.date === today);

			verify(
				'Today\'s aggregates exist',
				todayAggregates.length > 0,
				todayAggregates.length > 0
					? `Found ${todayAggregates.length} aggregate(s) for ${today}`
					: `No aggregates for today (${today}) - check event timestamps`
			);
		}
	} catch (error) {
		console.error('❌ Failed to verify aggregates:', error);
	}

	// -------------------------------------------------------------------------
	// Summary
	// -------------------------------------------------------------------------
	console.log('\n' + '═'.repeat(60));
	console.log('SUMMARY');
	console.log('═'.repeat(60));

	const passed = results.filter((r) => r.passed).length;
	const failed = results.filter((r) => !r.passed).length;

	console.log(`\n✅ Passed: ${passed}/${results.length}`);
	if (failed > 0) {
		console.log(`❌ Failed: ${failed}/${results.length}`);
		results
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`   - ${r.name}: ${r.message}`);
			});
	}

	// Acceptance criteria summary
	console.log('\n📋 Acceptance Criteria:');
	const eventsStored = results.some(
		(r) => r.name === 'Events exist in database' && r.passed
	);
	const schemaCorrect = results.some(
		(r) => r.name === 'All columns match expected schema' && r.passed
	);

	console.log(
		`   - [${eventsStored ? 'x' : ' '}] Query unified_events table after sending events`
	);
	console.log(
		`   - [${schemaCorrect ? 'x' : ' '}] Confirm events are stored with correct schema`
	);

	const allPassed = eventsStored && schemaCorrect;
	console.log(
		`\n${allPassed ? '✅' : '❌'} D1 Storage Verification ${allPassed ? 'PASSED' : 'FAILED'}`
	);

	process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
	console.error('❌ Verification failed with error:', error);
	process.exit(1);
});
