import { afterEach, describe, expect, it } from 'vitest';

import {
  dashboardSummary,
  exactOverlapEdges,
  getExistingVectorIdsForBundle,
  healthCounts,
  languageSummaries,
  listDashboardBundles,
  loadBundle,
  loadBundleByContentManifestHash,
  loadBundleChunks,
  loadChunksByVectorIds,
  loadRepresentativeChunksForBundle,
  recordIngestRun,
  upsertBundleWithChunks,
} from '../src/db.js';
import type { CodeBundleInput, CodeChunkInput } from '../src/types.js';
import { closeTestD1, createTestD1 } from './support/d1.js';

const dbs: D1Database[] = [];

function createDb(): D1Database {
  const db = createTestD1();
  dbs.push(db);
  return db;
}

afterEach(() => {
  for (const db of dbs.splice(0)) closeTestD1(db);
});

function bundle(overrides: Partial<CodeBundleInput> = {}): CodeBundleInput {
  return {
    id: 'bundle_1',
    sourceType: 'upload',
    sourceUri: 'upload://bundle.zip',
    repository: 'owner/repo',
    ref: 'main',
    commitSha: 'abc123',
    bundleHash: 'hash',
    contentManifestHash: 'manifest_hash',
    fileCount: 2,
    scannedFileCount: 1,
    chunkCount: 1,
    totalBytes: 120,
    metadata: { reviewer: 'agent' },
    createdAt: '2026-05-12T00:00:00.000Z',
    indexedAt: '2026-05-12T00:00:00.000Z',
    ...overrides,
  };
}

function chunk(overrides: Partial<CodeChunkInput> = {}): CodeChunkInput {
  return {
    id: 'chunk_1',
    bundleId: 'bundle_1',
    vectorId: 'chunk_1',
    filePath: 'src/index.ts',
    ext: '.ts',
    language: 'typescript',
    chunkIndex: 0,
    startLine: 1,
    endLine: 4,
    sizeBytes: 80,
    contentHash: 'content_hash',
    content: 'export function handler() {}',
    tags: ['TEST_FILE'],
    createdAt: '2026-05-12T00:00:00.000Z',
    ...overrides,
  };
}

describe('code bundle D1 persistence', () => {
  it('upserts bundle metadata and replaces chunks', async () => {
    const db = createDb();

    await upsertBundleWithChunks(db, bundle(), [chunk()]);
    await upsertBundleWithChunks(db, bundle({ chunkCount: 1, ref: 'next' }), [chunk({ id: 'chunk_2', vectorId: 'chunk_2' })]);

    const storedBundle = await loadBundle(db, 'bundle_1');
    const chunks = await loadBundleChunks(db, 'bundle_1');
    const vectorIds = await getExistingVectorIdsForBundle(db, 'bundle_1');
    const counts = await healthCounts(db);

    expect(storedBundle?.ref).toBe('next');
    expect(storedBundle?.contentManifestHash).toBe('manifest_hash');
    expect(storedBundle?.metadata).toEqual({ reviewer: 'agent' });
    expect(chunks.map((item) => item.id)).toEqual(['chunk_2']);
    expect(vectorIds).toEqual(['chunk_2']);
    expect(counts).toMatchObject({ bundles: 1, chunks: 1, ftsRows: 1 });
  });

  it('loads bundles by canonical content manifest hash', async () => {
    const db = createDb();

    await upsertBundleWithChunks(db, bundle({ id: 'bundle_old', contentManifestHash: 'shared_manifest' }), [
      chunk({ id: 'chunk_old', bundleId: 'bundle_old', vectorId: 'chunk_old' }),
    ]);
    await upsertBundleWithChunks(
      db,
      bundle({
        id: 'bundle_new',
        contentManifestHash: 'shared_manifest',
        indexedAt: '2026-05-12T00:00:02.000Z',
      }),
      [chunk({ id: 'chunk_new', bundleId: 'bundle_new', vectorId: 'chunk_new' })],
    );

    const storedBundle = await loadBundleByContentManifestHash(db, 'shared_manifest');

    expect(storedBundle?.id).toBe('bundle_new');
  });

  it('loads chunks by vector id with bundle context', async () => {
    const db = createDb();

    await upsertBundleWithChunks(db, bundle(), [chunk()]);
    const rows = await loadChunksByVectorIds(db, ['chunk_1']);

    expect(rows.get('chunk_1')).toMatchObject({
      vector_id: 'chunk_1',
      repository: 'owner/repo',
      ref: 'main',
      source_type: 'upload',
    });
  });

  it('records ingest run evidence', async () => {
    const db = createDb();

    await recordIngestRun(db, {
      id: 'run_1',
      bundleId: null,
      status: 'failed',
      sourceType: 'url',
      sourceUri: 'https://example.com/bundle.zip',
      startedAt: '2026-05-12T00:00:00.000Z',
      finishedAt: '2026-05-12T00:00:01.000Z',
      durationMs: 1000,
      fileCount: 0,
      chunkCount: 0,
      indexedCount: 0,
      failedCount: 0,
      error: 'network failure',
      metadata: { attempt: 1 },
    });

    await expect(healthCounts(db)).resolves.toMatchObject({ ingestRuns: 1 });
  });

  it('returns dashboard summaries and exact overlap edges', async () => {
    const db = createDb();

    await upsertBundleWithChunks(db, bundle({ id: 'bundle_a', contentManifestHash: 'manifest_a', chunkCount: 3, totalBytes: 500 }), [
      chunk({
        id: 'bundle_a_webflow',
        bundleId: 'bundle_a',
        vectorId: 'bundle_a_webflow',
        filePath: 'bundle_a/webflow.json',
        language: 'json',
        ext: '.json',
        sizeBytes: 120,
        contentHash: 'webflow_a',
        content: '{"name":"Alpha App"}',
      }),
      chunk({
        id: 'bundle_a_shared',
        bundleId: 'bundle_a',
        vectorId: 'bundle_a_shared',
        filePath: 'bundle_a/index.js',
        language: 'javascript',
        ext: '.js',
        sizeBytes: 220,
        contentHash: 'shared_hash',
        content: 'function sharedRuntime() { return true; }',
      }),
      chunk({
        id: 'bundle_a_unique',
        bundleId: 'bundle_a',
        vectorId: 'bundle_a_unique',
        filePath: 'bundle_a/index.js',
        language: 'javascript',
        ext: '.js',
        sizeBytes: 160,
        contentHash: 'alpha_hash',
        content: 'function alphaOnly() { return true; }',
      }),
    ]);
    await upsertBundleWithChunks(db, bundle({ id: 'bundle_b', contentManifestHash: 'manifest_b', chunkCount: 2, totalBytes: 420 }), [
      chunk({
        id: 'bundle_b_webflow',
        bundleId: 'bundle_b',
        vectorId: 'bundle_b_webflow',
        filePath: 'bundle_b/webflow.json',
        language: 'json',
        ext: '.json',
        sizeBytes: 120,
        contentHash: 'webflow_b',
        content: '{"name":"Beta App"}',
      }),
      chunk({
        id: 'bundle_b_shared',
        bundleId: 'bundle_b',
        vectorId: 'bundle_b_shared',
        filePath: 'bundle_b/main.js',
        language: 'javascript',
        ext: '.js',
        sizeBytes: 210,
        contentHash: 'shared_hash',
        content: 'function sharedRuntime() { return true; }',
      }),
    ]);

    await recordIngestRun(db, {
      id: 'run_success',
      bundleId: 'bundle_a',
      status: 'success',
      sourceType: 'upload',
      sourceUri: 'upload://bundle-a.zip',
      startedAt: '2026-05-12T00:00:00.000Z',
      finishedAt: '2026-05-12T00:00:01.000Z',
      durationMs: 1000,
      fileCount: 2,
      chunkCount: 3,
      indexedCount: 3,
      failedCount: 0,
      error: null,
      metadata: {},
    });

    await expect(dashboardSummary(db)).resolves.toMatchObject({
      bundles: 2,
      chunks: 5,
      ftsRows: 5,
      totalBytes: 920,
      languages: 2,
      successfulIngestRuns: 1,
      failedIngestRuns: 0,
    });

    const bundles = await listDashboardBundles(db);
    expect(bundles.map((item) => item.appName).sort()).toEqual(['Alpha App', 'Beta App']);

    await expect(languageSummaries(db)).resolves.toEqual([
      { language: 'javascript', chunks: 3, bundles: 2, bytes: 590 },
      { language: 'json', chunks: 2, bundles: 2, bytes: 240 },
    ]);

    await expect(exactOverlapEdges(db, { minSizeBytes: 200, limit: 10 })).resolves.toEqual([
      {
        bundleA: 'bundle_a',
        bundleB: 'bundle_b',
        appA: 'Alpha App',
        appB: 'Beta App',
        exactChunkMatches: 1,
        sharedBytes: 210,
      },
    ]);

    const representative = await loadRepresentativeChunksForBundle(db, 'bundle_a', { limit: 2, language: 'javascript' });
    expect(representative.map((item) => item.id)).toEqual(['bundle_a_shared', 'bundle_a_unique']);
  });
});
