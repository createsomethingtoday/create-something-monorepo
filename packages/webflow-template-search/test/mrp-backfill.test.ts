import { afterEach, describe, expect, it, vi } from 'vitest';

import { acquireSyncJobLock, getMrpBackfillState } from '../src/db.js';
import { installAirtableFetchMock } from './support/airtable.js';
import { callWorker, createTestEnv } from './support/worker.js';

const ADMIN_HEADERS = { Authorization: 'Bearer sync-token' };

async function seedTemplate(db: D1Database, id: string, mrpId: string | null = null) {
  await db
    .prepare(
      `INSERT INTO template_documents (id, template_slug, name, mrp_id, synced_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(id, `${id.toLowerCase()}-template`, `Template ${id}`, mrpId, '2026-07-10T00:00:00.000Z')
    .run();
}

function sourceAsset(id: string, mrpId?: string) {
  return {
    id,
    fields: {
      Name: `Template ${id}`,
      ...(mrpId ? { 'ℹ️MRP ID': mrpId } : {}),
    },
  };
}

describe('MRP backfill admin workflow', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    vi.restoreAllMocks();
  });

  it('requires admin auth for status and writes', async () => {
    const test = createTestEnv();
    cleanups.push(test.close);

    expect((await callWorker(new Request('https://templates.test/api/templates/admin/backfill-mrp'), test.env)).status).toBe(401);
    expect(
      (
        await callWorker(
          new Request('https://templates.test/api/templates/admin/backfill-mrp', { method: 'POST' }),
          test.env,
        )
      ).status,
    ).toBe(401);
  });

  it('dry-runs without writes, checkpoints bounded batches, resumes, and skips equal values', async () => {
    const fetchMock = installAirtableFetchMock({
      publishedAssets: [sourceAsset('recA', 'mrp-a'), sourceAsset('recB', 'mrp-b'), sourceAsset('recC', 'mrp-c')],
    });
    const test = createTestEnv();
    cleanups.push(test.close, () => fetchMock.mockRestore());
    await seedTemplate(test.env.DB, 'recA');
    await seedTemplate(test.env.DB, 'recB', 'old-b');
    await seedTemplate(test.env.DB, 'recC', 'mrp-c');

    const dryRun = await callWorker(
      new Request('https://templates.test/api/templates/admin/backfill-mrp?dry_run=true&batch_size=2', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      }),
      test.env,
    );
    expect(dryRun.status).toBe(200);
    expect(await dryRun.json()).toMatchObject({
      dry_run: true,
      batch_scanned_records: 2,
      batch_updated_records: 2,
      cursor: 'recB',
      remaining_records: 1,
    });
    expect(await test.env.DB.prepare('SELECT mrp_id FROM template_documents WHERE id = ?').bind('recA').first()).toEqual({ mrp_id: null });
    expect(await getMrpBackfillState(test.env.DB)).toBeNull();

    const first = await callWorker(
      new Request('https://templates.test/api/templates/admin/backfill-mrp?batch_size=2', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      }),
      test.env,
    );
    expect(await first.json()).toMatchObject({
      status: 'running',
      cursor: 'recB',
      scanned_records: 2,
      updated_records: 2,
      remaining_records: 1,
    });

    const second = await callWorker(
      new Request('https://templates.test/api/templates/admin/backfill-mrp?batch_size=2', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      }),
      test.env,
    );
    expect(await second.json()).toMatchObject({
      status: 'complete',
      cursor: 'recC',
      scanned_records: 3,
      updated_records: 2,
      batch_updated_records: 0,
      remaining_records: 0,
    });

    const status = await callWorker(
      new Request('https://templates.test/api/templates/admin/backfill-mrp', { headers: ADMIN_HEADERS }),
      test.env,
    );
    expect(await status.json()).toMatchObject({
      status: 'ok',
      state: { status: 'complete', cursor: 'recC' },
      coverage: { total_rows: 3, rows_with_mrp: 3, rows_missing_mrp: 0 },
    });

    const restart = await callWorker(
      new Request('https://templates.test/api/templates/admin/backfill-mrp?restart=true&batch_size=3', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      }),
      test.env,
    );
    expect(await restart.json()).toMatchObject({
      status: 'complete',
      scanned_records: 3,
      updated_records: 0,
      batch_updated_records: 0,
    });
  });

  it('reports source mismatches instead of claiming MRP coverage', async () => {
    const fetchMock = installAirtableFetchMock({ publishedAssets: [sourceAsset('recA')] });
    const test = createTestEnv();
    cleanups.push(test.close, () => fetchMock.mockRestore());
    await seedTemplate(test.env.DB, 'recA');
    await seedTemplate(test.env.DB, 'recB');

    const response = await callWorker(
      new Request('https://templates.test/api/templates/admin/backfill-mrp?batch_size=2', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      }),
      test.env,
    );
    expect(await response.json()).toMatchObject({
      status: 'complete',
      missing_source_records: 1,
      missing_mrp_records: 1,
      updated_records: 0,
    });

    const status = await callWorker(
      new Request('https://templates.test/api/templates/admin/backfill-mrp', { headers: ADMIN_HEADERS }),
      test.env,
    );
    expect(await status.json()).toMatchObject({
      coverage: { total_rows: 2, rows_with_mrp: 0, rows_missing_mrp: 2 },
    });
  });

  it('honors the shared sync lease', async () => {
    const test = createTestEnv();
    cleanups.push(test.close);
    await seedTemplate(test.env.DB, 'recA');
    await acquireSyncJobLock(test.env.DB, 'incremental');

    const response = await callWorker(
      new Request('https://templates.test/api/templates/admin/backfill-mrp', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      }),
      test.env,
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ active_job: { mode: 'incremental', status: 'running' } });
  });

  it('persists a failed checkpoint when the source request fails', async () => {
    const test = createTestEnv();
    cleanups.push(test.close);
    await seedTemplate(test.env.DB, 'recA');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source unavailable', { status: 503 }));

    const response = await callWorker(
      new Request('https://templates.test/api/templates/admin/backfill-mrp', {
        method: 'POST',
        headers: ADMIN_HEADERS,
      }),
      test.env,
    );
    expect(response.status).toBe(500);
    expect(await getMrpBackfillState(test.env.DB)).toMatchObject({
      status: 'failed',
      cursor: '',
      scanned_records: 0,
      error: expect.stringContaining('Airtable request failed (503)'),
    });
  });
});
