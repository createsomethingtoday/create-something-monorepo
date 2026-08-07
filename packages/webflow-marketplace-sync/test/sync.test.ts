import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapItemToRow } from '../src/mapping';
import { upsertItem } from '../src/sync';
import { installFetchMock, makeEnv, makeItem } from './support/mocks';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('upsertItem — shadow mode (default)', () => {
  it('logs an intended create without writing to Airtable', async () => {
    const env = makeEnv();
    const state = installFetchMock({ airtableFindResults: [] });
    const result = await upsertItem(env, makeItem(), 'collection_item_created');
    expect(result.action).toBe('shadow-create');
    // Only the find query hit Airtable — no POST/PATCH.
    const writes = state.calls.filter((c) => c.method !== 'GET');
    expect(writes).toEqual([]);
    const logged = env.__d1.executed.find((e) => e.sql.includes('sync_events'));
    expect(logged?.params).toContain('shadow-create');
  });

  it('logs an intended update when the row has drifted', async () => {
    const env = makeEnv();
    const expected = mapItemToRow(makeItem());
    const state = installFetchMock({
      airtableFindResults: [{ id: 'recEXISTING0000001', fields: { ...expected, Slug: 'stale-slug' } }],
    });
    const result = await upsertItem(env, makeItem(), 'collection_item_changed');
    expect(result.action).toBe('shadow-update');
    expect(result.changedFields).toEqual(['Slug']);
    expect(state.calls.filter((c) => c.method !== 'GET')).toEqual([]);
  });
});

describe('upsertItem — live mode', () => {
  it('creates a missing row keyed on Webflow Record ID', async () => {
    const env = makeEnv({ WRITE_MODE: 'live' });
    const state = installFetchMock({ airtableFindResults: [] });
    const result = await upsertItem(env, makeItem(), 'collection_item_created');
    expect(result.action).toBe('created');
    const post = state.calls.find((c) => c.method === 'POST');
    expect(post).toBeDefined();
    const fields = (post!.body as { records: Array<{ fields: Record<string, unknown> }> }).records[0].fields;
    expect(fields['Webflow Record ID']).toBe('item00000000000000000001');
    expect(fields['Sync Source']).toBe('Whalesync');
    // typecast lets Airtable coerce singleSelect names and ISO dates.
    expect((post!.body as { typecast: boolean }).typecast).toBe(true);
  });

  it('updates only the drifted fields, never the whole row', async () => {
    const env = makeEnv({ WRITE_MODE: 'live' });
    const expected = mapItemToRow(makeItem());
    const state = installFetchMock({
      airtableFindResults: [{ id: 'recEXISTING0000001', fields: { ...expected, 'MRP ID': 'wrong' } }],
    });
    const result = await upsertItem(env, makeItem(), 'collection_item_changed');
    expect(result.action).toBe('updated');
    const patch = state.calls.find((c) => c.method === 'PATCH');
    const record = (patch!.body as { records: Array<{ id: string; fields: Record<string, unknown> }> }).records[0];
    expect(record.id).toBe('recEXISTING0000001');
    expect(Object.keys(record.fields)).toEqual(['MRP ID']);
  });

  it('is idempotent: identical row → noop, no writes', async () => {
    const env = makeEnv({ WRITE_MODE: 'live' });
    const expected = mapItemToRow(makeItem());
    const state = installFetchMock({
      airtableFindResults: [{ id: 'recEXISTING0000001', fields: { ...expected } }],
    });
    const result = await upsertItem(env, makeItem(), 'collection_item_changed');
    expect(result.action).toBe('noop');
    expect(state.calls.filter((c) => c.method !== 'GET')).toEqual([]);
  });

  it('updates the first row when Whalesync raced us into a duplicate (never creates a third)', async () => {
    const env = makeEnv({ WRITE_MODE: 'live' });
    const expected = mapItemToRow(makeItem());
    const state = installFetchMock({
      airtableFindResults: [
        { id: 'recOLDEST000000001', fields: { ...expected, Slug: 'stale' } },
        { id: 'recDUPLICATE000001', fields: { ...expected } },
      ],
    });
    const result = await upsertItem(env, makeItem(), 'collection_item_changed');
    expect(result.action).toBe('updated');
    expect(result.recordId).toBe('recOLDEST000000001');
    expect(state.calls.filter((c) => c.method === 'POST')).toEqual([]);
  });
});
