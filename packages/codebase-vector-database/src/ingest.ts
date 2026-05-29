import { buildInventory, processZipFile } from '@create-something/bundle-scanner-core';
import { createCodeChunks } from './chunk.js';
import {
  DEFAULT_CHUNK_MAX_CHARS,
  DEFAULT_CHUNK_OVERLAP_LINES,
  DEFAULT_EMBEDDING_CONTEXT_RESERVE_CHARS,
  DEFAULT_EMBEDDING_MAX_CHARS,
  codeBundleScanConfig,
} from './config.js';
import {
  getExistingVectorIdsForBundle,
  loadBundleByContentManifestHash,
  recordIngestRun,
  upsertBundleWithChunks,
} from './db.js';
import { deleteChunkVectors, generateChunkEmbeddings, upsertChunkVectors } from './embeddings.js';
import { buildContentManifestHash } from './manifest.js';
import type { BundleMetadata, CodeBundleInput, Env, IngestResponse, SourceType } from './types.js';
import { nowIso, parsePositiveInt, sha256Hex } from './utils.js';

export interface IngestBundleOptions {
  blob: Blob;
  sourceType: SourceType;
  sourceUri: string | null;
  bundleId?: string;
  repository?: string | null;
  ref?: string | null;
  commitSha?: string | null;
  metadata?: BundleMetadata;
}

function runId(): string {
  return `ingest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultBundleId(contentManifestHash: string): string {
  return `code_bundle_${contentManifestHash.slice(0, 24)}`;
}

function effectiveChunkMaxChars(env: Env): number {
  const configuredChunkMax = parsePositiveInt(env.CODE_CHUNK_MAX_CHARS, DEFAULT_CHUNK_MAX_CHARS, 12000);
  const embeddingMax = parsePositiveInt(env.CODE_EMBEDDING_MAX_CHARS, DEFAULT_EMBEDDING_MAX_CHARS, 32000);
  const reserveMax = Math.max(1, embeddingMax - 100);
  const contextReserve = parsePositiveInt(
    env.CODE_EMBEDDING_CONTEXT_RESERVE_CHARS,
    DEFAULT_EMBEDDING_CONTEXT_RESERVE_CHARS,
    reserveMax,
  );
  const embeddingSafeChunkMax = Math.max(100, embeddingMax - contextReserve);
  return Math.min(configuredChunkMax, embeddingSafeChunkMax);
}

export async function ingestBundle(env: Env, options: IngestBundleOptions): Promise<IngestResponse> {
  const startedAt = nowIso();
  const startedMs = Date.now();
  let bundleId: string | null = options.bundleId ?? null;
  let fileCount = 0;
  let chunkCount = 0;
  let indexedCount = 0;
  let failedCount = 0;
  let bundleHash = '';
  let contentManifestHash = '';

  try {
    const buffer = await options.blob.arrayBuffer();
    bundleHash = await sha256Hex(buffer);

    const files = await processZipFile(buffer as unknown as Blob, codeBundleScanConfig, (message) => {
      console.log(`[code-index:zip] ${message}`);
    });
    const inventory = buildInventory(files, codeBundleScanConfig);
    fileCount = inventory.length;
    contentManifestHash = await buildContentManifestHash(inventory);

    if (!bundleId) {
      const existingBundle = await loadBundleByContentManifestHash(env.DB, contentManifestHash);
      bundleId = existingBundle?.id ?? defaultBundleId(contentManifestHash);
    }

    const maxChars = effectiveChunkMaxChars(env);
    const overlapLines = parsePositiveInt(env.CODE_CHUNK_OVERLAP_LINES, DEFAULT_CHUNK_OVERLAP_LINES, 100);
    const createdAt = nowIso();
    const chunks = await createCodeChunks(inventory, { bundleId, maxChars, overlapLines, createdAt });
    chunkCount = chunks.length;

    const bundle: CodeBundleInput = {
      id: bundleId,
      sourceType: options.sourceType,
      sourceUri: options.sourceUri,
      repository: options.repository ?? null,
      ref: options.ref ?? null,
      commitSha: options.commitSha ?? null,
      bundleHash,
      contentManifestHash,
      fileCount,
      scannedFileCount: inventory.filter((file) => !file.isIgnored && file.isTextCandidate).length,
      chunkCount,
      totalBytes: inventory.reduce((sum, file) => sum + file.sizeBytes, 0),
      metadata: options.metadata ?? {},
      createdAt,
      indexedAt: createdAt,
    };

    const staleVectorIds = await getExistingVectorIdsForBundle(env.DB, bundleId);
    const embeddings = await generateChunkEmbeddings(chunks, bundle, env);
    await upsertBundleWithChunks(env.DB, bundle, chunks);
    const vectorResult = await upsertChunkVectors(chunks, embeddings, bundle, env);
    indexedCount = vectorResult.indexedCount;
    failedCount = vectorResult.failedCount;

    const currentVectorIds = new Set(chunks.map((chunk) => chunk.vectorId));
    await deleteChunkVectors(
      staleVectorIds.filter((vectorId) => !currentVectorIds.has(vectorId)),
      env,
    );

    const durationMs = Date.now() - startedMs;
    await recordIngestRun(env.DB, {
      id: runId(),
      bundleId,
      status: failedCount === 0 ? 'success' : 'failed',
      sourceType: options.sourceType,
      sourceUri: options.sourceUri,
      startedAt,
      finishedAt: nowIso(),
      durationMs,
      fileCount,
      chunkCount,
      indexedCount,
      failedCount,
      error: failedCount === 0 ? null : `${failedCount} chunks failed to index.`,
      metadata: options.metadata ?? {},
    });

    return {
      success: failedCount === 0,
      bundleId,
      sourceType: options.sourceType,
      sourceUri: options.sourceUri,
      bundleHash,
      contentManifestHash,
      fileCount,
      scannedFileCount: bundle.scannedFileCount,
      chunkCount,
      indexedCount,
      failedCount,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startedMs;
    await recordIngestRun(env.DB, {
      id: runId(),
      bundleId,
      status: 'failed',
      sourceType: options.sourceType,
      sourceUri: options.sourceUri,
      startedAt,
      finishedAt: nowIso(),
      durationMs,
      fileCount,
      chunkCount,
      indexedCount,
      failedCount: Math.max(failedCount, chunkCount - indexedCount),
      error: error instanceof Error ? error.message : String(error),
      metadata: options.metadata ?? {},
    });
    throw error;
  }
}
