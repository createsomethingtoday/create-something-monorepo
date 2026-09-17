import { describe, expect, it, vi } from 'vitest';

import type { Asset } from './airtable';
import {
	applyTemplateViews,
	deriveBeaconSlug,
	fetchTemplateViewDaily,
	fetchTemplateViewTotals,
	mergeBeaconViewers
} from './template-views';

const ENV = { TEMPLATE_VIEWS_STATS_API_KEY: 'test-key', TEMPLATE_VIEWS_STATS_URL: 'https://beacon.test/' };

function template(overrides: Partial<Asset> = {}): Asset {
	return {
		id: 'recA',
		name: 'Automately',
		type: 'Template',
		status: 'Published',
		adminDetailPagePath: '/templates/html/automately-website-template',
		...overrides
	} as Asset;
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('deriveBeaconSlug', () => {
	it('uses the marketplace detail path segment', () => {
		expect(deriveBeaconSlug(template())).toBe('automately-website-template');
	});

	it('falls back to the listing URL when the admin path is missing', () => {
		expect(
			deriveBeaconSlug(
				template({
					adminDetailPagePath: undefined,
					marketplaceUrl: 'https://webflow.com/templates/html/Nexly-Website-Template/'
				})
			)
		).toBe('nexly-website-template');
	});

	it('returns undefined for apps and for templates without a path', () => {
		expect(deriveBeaconSlug(template({ type: 'App' } as Partial<Asset>))).toBeUndefined();
		expect(deriveBeaconSlug(template({ adminDetailPagePath: undefined }))).toBeUndefined();
		expect(deriveBeaconSlug(template({ adminDetailPagePath: '/not/a/template/path' }))).toBeUndefined();
	});
});

describe('fetchTemplateViewTotals', () => {
	it('returns null when the beacon is not configured', async () => {
		expect(await fetchTemplateViewTotals({}, ['a'])).toBeNull();
		expect(await fetchTemplateViewTotals(undefined, ['a'])).toBeNull();
	});

	it('batches slugs, authorizes with the key, and fills unseen slugs with zero', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			expect(url.pathname).toBe('/stats/totals');
			expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
			const slugs = url.searchParams.get('slugs')!.split(',');
			expect(slugs.length).toBeLessThanOrEqual(50);
			return jsonResponse({
				rows: slugs
					.filter((slug) => slug !== 'slug-0')
					.map((slug) => ({ slug, views: 10, sessions: 7, first_day: '2026-08-05', last_day: '2026-09-17' }))
			});
		});

		const slugs = Array.from({ length: 120 }, (_, i) => `slug-${i}`);
		const totals = await fetchTemplateViewTotals(ENV, slugs, { fetch: fetchMock as typeof fetch });

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(totals?.size).toBe(120);
		expect(totals?.get('slug-1')).toEqual({
			slug: 'slug-1',
			views: 10,
			sessions: 7,
			firstDay: '2026-08-05',
			lastDay: '2026-09-17'
		});
		expect(totals?.get('slug-0')?.sessions).toBe(0);
	});

	it('returns null when every upstream call fails', async () => {
		const fetchMock = vi.fn(async () => jsonResponse({ error: 'unauthorized' }, 401));
		expect(await fetchTemplateViewTotals(ENV, ['a'], { fetch: fetchMock as typeof fetch })).toBeNull();
	});

	it('serves cached totals without calling upstream', async () => {
		const store = new Map<string, string>([
			[
				'template-views:totals:a',
				JSON.stringify({ slug: 'a', views: 3, sessions: 2, firstDay: null, lastDay: null })
			]
		]);
		const kv = {
			get: vi.fn(async (key: string) => {
				const raw = store.get(key);
				return raw ? JSON.parse(raw) : null;
			}),
			put: vi.fn(async () => {})
		} as unknown as KVNamespace;
		const fetchMock = vi.fn();

		const totals = await fetchTemplateViewTotals({ ...ENV, SESSIONS: kv }, ['a'], {
			fetch: fetchMock as unknown as typeof fetch
		});

		expect(fetchMock).not.toHaveBeenCalled();
		expect(totals?.get('a')?.sessions).toBe(2);
	});
});

describe('fetchTemplateViewDaily', () => {
	it('returns rows oldest first and clamps the window', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			expect(url.searchParams.get('days')).toBe('365');
			return jsonResponse({
				rows: [
					{ day: '2026-09-02', views: 2, sessions: 2 },
					{ day: '2026-09-01', views: 5, sessions: 4 }
				]
			});
		});
		const rows = await fetchTemplateViewDaily(ENV, 'a', 9999, { fetch: fetchMock as typeof fetch });
		expect(rows?.map((r) => r.day)).toEqual(['2026-09-01', '2026-09-02']);
	});
});

describe('applyTemplateViews', () => {
	it('sets uniqueViewers from beacon sessions and leaves apps untouched', async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse({
				rows: [
					{
						slug: 'automately-website-template',
						views: 161,
						sessions: 149,
						first_day: '2026-08-05',
						last_day: '2026-09-17'
					}
				]
			})
		);
		const app = template({ id: 'recApp', type: 'App', adminDetailPagePath: undefined } as Partial<Asset>);
		const [tpl, appOut] = await applyTemplateViews(ENV, [template(), app], {
			fetch: fetchMock as typeof fetch
		});

		expect(tpl.uniqueViewers).toBe(149);
		expect(tpl.beaconSlug).toBe('automately-website-template');
		expect(appOut.uniqueViewers).toBeUndefined();
	});

	it('leaves uniqueViewers undefined when the beacon is unavailable', async () => {
		const fetchMock = vi.fn(async () => jsonResponse({}, 500));
		const [tpl] = await applyTemplateViews(ENV, [template()], { fetch: fetchMock as typeof fetch });
		expect(tpl.uniqueViewers).toBeUndefined();
	});
});

describe('mergeBeaconViewers', () => {
	const snapshots = [
		{ captured_at: '2026-09-02', unique_viewers: 9999, cumulative_purchases: 1, cumulative_revenue: 99 },
		{ captured_at: '2026-09-04', unique_viewers: 9999, cumulative_purchases: 2, cumulative_revenue: 198 }
	];
	const beacon = [
		{ day: '2026-09-01', sessions: 3 },
		{ day: '2026-09-02', sessions: 2 },
		{ day: '2026-09-03', sessions: 5 }
	];

	it('returns snapshots untouched when the beacon is unavailable', () => {
		expect(mergeBeaconViewers(snapshots, null, 30)).toBe(snapshots);
	});

	it('replaces viewers with cumulative sessions and carries purchases forward across synthesized days', () => {
		const merged = mergeBeaconViewers(snapshots, beacon, 30);
		expect(merged.map((row) => row.captured_at)).toEqual([
			'2026-09-01',
			'2026-09-02',
			'2026-09-03',
			'2026-09-04'
		]);
		expect(merged.map((row) => row.unique_viewers)).toEqual([3, 5, 10, 10]);
		expect(merged.map((row) => row.cumulative_purchases)).toEqual([0, 1, 1, 2]);
		expect(merged[2].cumulative_revenue).toBe(99);
	});

	it('trims to the requested window from the most recent day', () => {
		expect(mergeBeaconViewers(snapshots, beacon, 2).map((row) => row.captured_at)).toEqual([
			'2026-09-03',
			'2026-09-04'
		]);
	});
});
