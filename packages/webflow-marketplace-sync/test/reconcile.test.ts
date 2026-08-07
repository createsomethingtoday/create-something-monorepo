import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapItemToRow } from '../src/mapping';
import { runFullScan, runSweep } from '../src/reconcile';
import { installFetchMock, makeEnv, makeItem } from './support/mocks';
import type { WebflowItem } from '../src/types';

afterEach(() => {
  vi.restoreAllMocks();
});

function airtableRowFor(item: WebflowItem, id: string, overrides: Record<string, unknown> = {}) {
  return { id, fields: { ...mapItemToRow(item), ...overrides } as Record<string, unknown> };
}

describe('runSweep', () => {
  it('stops paginating at the window cutoff', async () => {
    const recent = makeItem({ id: 'itemRecent00000000000001', lastUpdated: new Date().toISOString() });
    const stale = makeItem({ id: 'itemStale000000000000001', lastUpdated: '2020-01-01T00:00:00.000Z' });
    const env = makeEnv();
    const state = installFetchMock({
      webflowList: [recent, stale],
      airtableFindResults: [airtableRowFor(recent, 'recRecent0000000001')],
    });
    const result = await runSweep(env);
    // Only the recent item was upserted (one find call), the stale one stopped the scan.
    expect(result.scanned).toBe(1);
    const finds = state.calls.filter((c) => c.url.includes('filterByFormula'));
    expect(finds.length).toBe(1);
  });

  it('caps the scan at SWEEP_MAX_ITEMS and logs the overflow', async () => {
    const now = new Date().toISOString();
    const items = Array.from({ length: 5 }, (_, i) =>
      makeItem({ id: `itemCapped00000000000${i.toString().padStart(3, '0')}`, lastUpdated: now }),
    );
    const env = makeEnv({ SWEEP_MAX_ITEMS: '3' });
    installFetchMock({ webflowList: items, airtableFindResults: [] });
    const result = await runSweep(env);
    expect(result.scanned).toBe(3);
    const overflow = env.__d1.executed.find(
      (e) => e.sql.includes('sync_events') && String(e.params[4]).includes('SWEEP_MAX_ITEMS'),
    );
    expect(overflow).toBeDefined();
  });

  it('uses one batch lookup instead of per-item finds', async () => {
    const now = new Date().toISOString();
    const a = makeItem({ id: 'itemBatchA00000000000001', lastUpdated: now });
    const b = makeItem({ id: 'itemBatchB00000000000001', lastUpdated: now });
    const env = makeEnv();
    const state = installFetchMock({
      webflowList: [a, b],
      airtableFindResults: [airtableRowFor(a, 'recA000000000000001'), airtableRowFor(b, 'recB000000000000001')],
    });
    const result = await runSweep(env);
    expect(result.findings).toBe(0); // both rows match → noops
    const finds = state.calls.filter((c) => c.url.includes('filterByFormula'));
    expect(finds.length).toBe(1);
    expect(decodeURIComponent(finds[0].url)).toContain('OR(');
  });

  it('records missing rows as findings (shadow: not healed)', async () => {
    const item = makeItem({ id: 'itemMissing0000000000001', lastUpdated: new Date().toISOString() });
    const env = makeEnv();
    installFetchMock({ webflowList: [item], airtableFindResults: [] });
    const result = await runSweep(env);
    expect(result.findings).toBe(1);
    expect(result.healed).toBe(0);
    const insert = env.__d1.executed.find((e) => e.sql.includes('INSERT INTO findings'));
    expect(insert?.params).toContain('missing_row');
  });
});

describe('runFullScan', () => {
  it('classifies the documented drift classes', async () => {
    const now = new Date().toISOString();
    const healthy = makeItem({ id: 'itemHealthy0000000000001', lastUpdated: now });
    const missing = makeItem({ id: 'itemMissing0000000000001', lastUpdated: now });
    const malformed = makeItem({
      id: 'itemMalformed00000000001',
      lastUpdated: now,
      fieldData: { 'unique-id': 'not-a-hex-id', 'sync-last-updated': '2026-08-01T00:00:00.000Z' },
    });
    const neverSynced = makeItem({
      id: 'itemNeverSync00000000001',
      lastUpdated: now,
      fieldData: { 'sync-last-updated': null },
    });
    // healthy + malformed have matching rows; missing has none; an orphan row points at a deleted item.
    const env = makeEnv();
    installFetchMock({
      webflowList: [healthy, missing, malformed, neverSynced],
      airtableFindResults: [],
      airtableListResults: [
        airtableRowFor(healthy, 'recHealthy000000001'),
        airtableRowFor(malformed, 'recMalformed0000001'),
        airtableRowFor(neverSynced, 'recNeverSync0000001'),
        { id: 'recOrphan0000000001', fields: { 'Webflow Record ID': 'itemDeleted0000000000001', Name: 'Ghost' } },
      ],
    });
    // healthy item's sync-last-updated is set in makeItem default? No — set it:
    healthy.fieldData['sync-last-updated'] = '2026-08-01T00:00:00.000Z';
    missing.fieldData['sync-last-updated'] = '2026-08-01T00:00:00.000Z';

    const { summary } = await runFullScan(env);
    expect(summary['missing_row']).toBe(1);
    expect(summary['malformed_unique_id']).toBe(1);
    expect(summary['never_synced']).toBe(1);
    expect(summary['orphan_row']).toBe(1);
    expect(summary['field_drift']).toBeUndefined();
  });

  it('ignores WF Last Updated-only drift (expected churn between scans)', async () => {
    const item = makeItem({ lastUpdated: new Date().toISOString() });
    item.fieldData['sync-last-updated'] = '2026-08-01T00:00:00.000Z';
    const env = makeEnv();
    installFetchMock({
      webflowList: [item],
      airtableListResults: [airtableRowFor(item, 'recRow0000000000001', { 'WF Last Updated': '2026-08-01T00:00:00.000Z' })],
    });
    const { summary } = await runFullScan(env);
    expect(summary['field_drift']).toBeUndefined();
  });

  it('reports duplicate rows for one item without deleting anything', async () => {
    const item = makeItem({ lastUpdated: new Date().toISOString() });
    item.fieldData['sync-last-updated'] = '2026-08-01T00:00:00.000Z';
    const env = makeEnv();
    const state = installFetchMock({
      webflowList: [item],
      airtableListResults: [airtableRowFor(item, 'recFirst0000000001'), airtableRowFor(item, 'recSecond000000001')],
    });
    const { summary } = await runFullScan(env);
    expect(summary['orphan_row']).toBe(1);
    expect(state.calls.filter((c) => c.method === 'DELETE')).toEqual([]);
  });

  it('heals missing rows in live mode and marks them healed', async () => {
    const item = makeItem({ lastUpdated: new Date().toISOString() });
    item.fieldData['sync-last-updated'] = '2026-08-01T00:00:00.000Z';
    const env = makeEnv({ WRITE_MODE: 'live' });
    const state = installFetchMock({ webflowList: [item], airtableListResults: [], airtableFindResults: [] });
    const { summary } = await runFullScan(env);
    expect(summary['missing_row']).toBe(1);
    expect(state.calls.some((c) => c.method === 'POST' && c.url.includes('api.airtable.com'))).toBe(true);
    const insert = env.__d1.executed.find((e) => e.sql.includes('INSERT INTO findings'));
    expect(insert?.params).toContain(1); // healed = 1
  });

  it('posts a Slack summary when configured', async () => {
    const item = makeItem({ lastUpdated: new Date().toISOString() });
    item.fieldData['sync-last-updated'] = '2026-08-01T00:00:00.000Z';
    const env = makeEnv({ SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T00/B00/xyz' });
    const state = installFetchMock({ webflowList: [item], airtableListResults: [], airtableFindResults: [] });
    // Slack URL isn't in the mock router — extend it.
    const spy = vi.mocked(globalThis.fetch);
    const inner = spy.getMockImplementation()!;
    spy.mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('https://hooks.slack.com/')) {
        state.calls.push({ method: init?.method ?? 'GET', url, body: JSON.parse(String(init?.body)) });
        return new Response('ok');
      }
      return inner(input as never, init as never);
    });
    await runFullScan(env);
    const slack = state.calls.find((c) => c.url.startsWith('https://hooks.slack.com/'));
    expect(slack).toBeDefined();
    expect((slack!.body as { text: string }).text).toContain('missing_row: 1');
  });
});

describe('capPerKind', () => {
  it('caps each kind independently and preserves order', async () => {
    const { capPerKind } = await import('../src/reconcile');
    const findings = [
      ...Array.from({ length: 5 }, (_, i) => ({ kind: 'never_synced' as const, itemId: `a${i}` })),
      { kind: 'missing_row' as const, itemId: 'b0' },
    ];
    const capped = capPerKind(findings, 3);
    expect(capped.filter((f) => f.kind === 'never_synced').length).toBe(3);
    expect(capped.filter((f) => f.kind === 'missing_row').length).toBe(1);
    expect(capped[0].itemId).toBe('a0');
  });
});
