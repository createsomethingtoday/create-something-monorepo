import assert from 'node:assert/strict';
import test from 'node:test';

import {
	createEmptyAnalyticsDashboard,
	getAnalyticsPropertyStats,
	normalizeAnalyticsDays,
	normalizeAnalyticsPath,
	settleAnalyticsRequest,
	type AnalyticsDashboardState
} from '../src/lib/admin/analytics-dashboard';
import { GET } from '../src/routes/api/admin/analytics/+server';

test('a failed admin analytics request remains an explicit error state', () => {
	const state: AnalyticsDashboardState = settleAnalyticsRequest({
		ok: false,
		error: {
			kind: 'unavailable',
			status: 500,
			message: 'Failed to fetch analytics'
		}
	});

	assert.equal(state.status, 'error');
	if (state.status === 'error') {
		assert.equal(state.error.kind, 'unavailable');
		assert.equal(state.error.status, 500);
	}
});

test('successful empty and populated payloads remain ready data states', () => {
	const empty = createEmptyAnalyticsDashboard();
	assert.deepEqual(settleAnalyticsRequest({ ok: true, data: empty }), {
		status: 'ready',
		analytics: empty
	});

	const populated = {
		...createEmptyAnalyticsDashboard(),
		total_views: 3,
		views_by_property: [{ property: 'io', count: 3 }]
	};
	assert.deepEqual(settleAnalyticsRequest({ ok: true, data: populated }), {
		status: 'ready',
		analytics: populated
	});
});

test('property metrics include LMS and stay finite when total views are zero', () => {
	const metrics = getAnalyticsPropertyStats(createEmptyAnalyticsDashboard());

	assert.deepEqual(
		metrics.map(({ property }) => property),
		['agency', 'io', 'space', 'ltd', 'lms']
	);
	assert.ok(metrics.every(({ percentage }) => Number.isFinite(percentage)));
	assert.ok(metrics.every(({ percentage }) => percentage === 0));
});

test('analytics ranges allow only 7, 30, or 90 days', () => {
	assert.equal(normalizeAnalyticsDays('7'), 7);
	assert.equal(normalizeAnalyticsDays('30'), 30);
	assert.equal(normalizeAnalyticsDays('90'), 90);
	assert.equal(normalizeAnalyticsDays('365'), 30);
	assert.equal(normalizeAnalyticsDays('not-a-number'), 30);
	assert.equal(normalizeAnalyticsDays(null), 30);
});

test('top-page paths are always legible absolute paths', () => {
	assert.equal(normalizeAnalyticsPath(''), '/');
	assert.equal(normalizeAnalyticsPath('services'), '/services');
	assert.equal(normalizeAnalyticsPath('/pricing'), '/pricing');
	assert.equal(normalizeAnalyticsPath(null), '/');
});

test('the analytics endpoint applies the selected range to every D1 query', async () => {
	const queries: string[] = [];
	const db = {
		prepare(query: string) {
			queries.push(query);
			return {
				async first() {
					return { count: 0, total: 0, avgPageViews: 0, avgDuration: 0 };
				},
				async all() {
					return { results: [] };
				}
			};
		}
	};

	const response = await GET({
		url: new URL('https://createsomething.io/api/admin/analytics?days=7'),
		platform: { env: { DB: db } }
	} as never);

	assert.equal(response.status, 200);
	assert.equal(queries.length, 12);
	assert.ok(queries.every((query) => query.includes("'-7 days'")));
	assert.ok(queries.every((query) => !query.includes("'-30 days'")));
});
