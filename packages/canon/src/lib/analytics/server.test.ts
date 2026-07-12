import { describe, expect, it } from 'vitest';
import { createUserAnalyticsHandler, processEventBatch, type D1Database, type D1PreparedStatement } from './server.js';
import type { AnalyticsEvent } from './types.js';

interface CapturedStatement extends D1PreparedStatement {
	query: string;
	values: unknown[];
}

function createStatement(query: string): CapturedStatement {
	return {
		query,
		values: [],
		bind(...values: unknown[]) {
			this.values = values;
			return this;
		},
		async run() {
			return { success: true, results: [] };
		},
		async first() {
			if (query.includes('FROM unified_sessions')) {
				return { total: 0, page_views: 0, duration_seconds: 0 };
			}
			return null;
		},
		async all() {
			return { success: true, results: [] };
		}
	};
}

function createMockDb() {
	const statements: CapturedStatement[] = [];
	const db: D1Database = {
		prepare(query: string) {
			const statement = createStatement(query);
			statements.push(statement);
			return statement;
		},
		async batch() {
			return [];
		}
	};

	return { db, statements };
}

function baseEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
	return {
		eventId: 'evt_1',
		sessionId: 'sess_1',
		property: 'io',
		timestamp: '2026-06-20T04:00:00.000Z',
		url: 'https://createsomething.io/path',
		category: 'navigation',
		action: 'page_view',
		...overrides
	};
}

describe('processEventBatch', () => {
	it('sanitizes stored event payloads before insert and preserves zero values', async () => {
		const { db, statements } = createMockDb();

		const result = await processEventBatch(
			db,
			{
				sentAt: '2026-06-20T04:00:01.000Z',
				events: [
					baseEvent({
						target: 'contact micah@example.com',
						value: 0,
						url: 'https://createsomething.io/path?email=micah@example.com#top',
						referrer: 'https://example.com/from?token=sk-test-secret123456',
						metadata: {
							email: 'micah@example.com',
							auth: 'Bearer very-secret-token-value',
							nested: { token: 'sk-proj-secret123456789' }
						}
					})
				]
			},
			{ userAgent: 'vitest' }
		);

		expect(result).toMatchObject({ success: true, received: 1 });

		const insert = statements.find((statement) => statement.query.includes('INSERT INTO unified_events'));
		expect(insert?.values[6]).toBe('contact [email]');
		expect(insert?.values[7]).toBe(0);
		expect(insert?.values[8]).toBe('https://createsomething.io/path');
		expect(insert?.values[9]).toBe('https://example.com/from');

		const metadata = JSON.stringify(insert?.values[12]);
		expect(metadata).toContain('[email]');
		expect(metadata).toContain('[secret]');
		expect(metadata).not.toContain('micah@example.com');
		expect(metadata).not.toContain('sk-proj-secret');
	});

	it('classifies traffic before URL sanitization and stores the server-derived class in metadata', async () => {
		const cases = [
			{
				name: 'declared test',
				url: 'https://createsomething.agency/book?traffic_class=test&email=micah@example.com',
				userAgent: 'Mozilla/5.0',
				expectedClass: 'test',
				expectedSource: 'declared'
			},
			{
				name: 'declared internal',
				url: 'https://createsomething.agency/?traffic_class=internal',
				userAgent: 'Mozilla/5.0',
				expectedClass: 'internal',
				expectedSource: 'declared'
			},
			{
				name: 'preview host',
				url: 'https://preview.create-something-agency.pages.dev/',
				userAgent: 'Mozilla/5.0',
				expectedClass: 'preview',
				expectedSource: 'host'
			},
			{
				name: 'automated client',
				url: 'https://createsomething.agency/',
				userAgent: 'Playwright/1.58',
				expectedClass: 'automated',
				expectedSource: 'user_agent'
			},
			{
				name: 'ordinary external traffic',
				url: 'https://createsomething.agency/',
				userAgent: 'Mozilla/5.0',
				expectedClass: 'external',
				expectedSource: 'default'
			}
		];

		for (const entry of cases) {
			const { db, statements } = createMockDb();
			const result = await processEventBatch(
				db,
				{
					sentAt: '2026-07-12T18:00:01.000Z',
					events: [
						baseEvent({
							eventId: `evt_${entry.expectedClass}`,
							property: 'agency',
							url: entry.url
						})
					]
				},
				{ userAgent: entry.userAgent }
			);

			expect(result, entry.name).toMatchObject({ success: true, received: 1 });
			const insert = statements.find((statement) =>
				statement.query.includes('INSERT INTO unified_events')
			);
			const metadata = JSON.parse(String(insert?.values[12]));
			expect(metadata.trafficClass, entry.name).toBe(entry.expectedClass);
			expect(metadata.trafficClassSource, entry.name).toBe(entry.expectedSource);
			if (entry.expectedClass === 'test') {
				expect(insert?.values[8], entry.name).toBe('https://createsomething.agency/book');
			}
		}
	});
});

describe('createUserAnalyticsHandler', () => {
	it('rejects service-to-service user analytics without the configured token', async () => {
		const { db } = createMockDb();
		const handler = createUserAnalyticsHandler({ property: 'io' });

		await expect(
			handler({
				request: new Request('https://createsomething.io/api/user/analytics?userId=user_1'),
				locals: {},
				platform: { env: { DB: db, ANALYTICS_SERVICE_TOKEN: 'expected-token' } },
				url: new URL('https://createsomething.io/api/user/analytics?userId=user_1')
			})
		).rejects.toMatchObject({ status: 401 });
	});

	it('allows service-to-service user analytics with the configured bearer token', async () => {
		const { db } = createMockDb();
		const handler = createUserAnalyticsHandler({ property: 'io' });

		const response = await handler({
			request: new Request('https://createsomething.io/api/user/analytics?userId=user_1', {
				headers: { Authorization: 'Bearer expected-token' }
			}),
			locals: {},
			platform: { env: { DB: db, ANALYTICS_SERVICE_TOKEN: 'expected-token' } },
			url: new URL('https://createsomething.io/api/user/analytics?userId=user_1')
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			property: 'io',
			sessions: {
				total: 0,
				pageViews: 0,
				durationSeconds: 0
			},
			dailyActivity: [],
			categoryBreakdown: [],
			topPages: []
		});
	});
});
