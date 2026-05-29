import type {
  CodeBundleInput,
  CodeBundleRow,
  CodeChunkInput,
  CodeChunkRow,
  CountRow,
  DashboardBundleSummary,
  DashboardBundleSummaryRow,
  DashboardLanguageSummary,
  DashboardLanguageSummaryRow,
  DashboardOverlapEdge,
  DashboardOverlapEdgeRow,
  DashboardSummary,
  HealthCounts,
  IngestRunInput,
} from './types.js';
import { chunkArray, parseJsonArray, parseJsonObject } from './utils.js';

const BATCH_SIZE = 50;

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

export function mapBundleRow(row: CodeBundleRow): CodeBundleInput {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceUri: row.source_uri,
    repository: row.repository,
    ref: row.ref,
    commitSha: row.commit_sha,
    bundleHash: row.bundle_hash,
    contentManifestHash: row.content_manifest_hash || row.bundle_hash,
    fileCount: Number(row.file_count),
    scannedFileCount: Number(row.scanned_file_count),
    chunkCount: Number(row.chunk_count),
    totalBytes: Number(row.total_bytes),
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    indexedAt: row.indexed_at,
  };
}

export function mapChunkRow(row: CodeChunkRow): CodeChunkInput {
  return {
    id: row.id,
    bundleId: row.bundle_id,
    vectorId: row.vector_id,
    filePath: row.file_path,
    ext: row.ext,
    language: row.language,
    chunkIndex: Number(row.chunk_index),
    startLine: Number(row.start_line),
    endLine: Number(row.end_line),
    sizeBytes: Number(row.size_bytes),
    contentHash: row.content_hash,
    content: row.content,
    tags: parseJsonArray(row.tags_json),
    createdAt: row.created_at,
  };
}

export async function healthCounts(db: D1Database): Promise<HealthCounts> {
  const [bundles, chunks, ftsRows, ingestRuns] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS total FROM code_bundles').first<CountRow>(),
    db.prepare('SELECT COUNT(*) AS total FROM code_chunks').first<CountRow>(),
    db.prepare('SELECT COUNT(*) AS total FROM code_chunks_fts').first<CountRow>(),
    db.prepare('SELECT COUNT(*) AS total FROM ingest_runs').first<CountRow>(),
  ]);

  return {
    bundles: Number(bundles?.total ?? 0),
    chunks: Number(chunks?.total ?? 0),
    ftsRows: Number(ftsRows?.total ?? 0),
    ingestRuns: Number(ingestRuns?.total ?? 0),
  };
}

export async function dashboardSummary(db: D1Database): Promise<DashboardSummary> {
  const [counts, totals, languages, successfulRuns, failedRuns] = await Promise.all([
    healthCounts(db),
    db.prepare('SELECT COALESCE(SUM(total_bytes), 0) AS total_bytes, MAX(indexed_at) AS latest_indexed_at FROM code_bundles').first<{
      total_bytes: number;
      latest_indexed_at: string | null;
    }>(),
    db.prepare('SELECT COUNT(DISTINCT language) AS total FROM code_chunks').first<CountRow>(),
    db.prepare("SELECT COUNT(*) AS total FROM ingest_runs WHERE status = 'success'").first<CountRow>(),
    db.prepare("SELECT COUNT(*) AS total FROM ingest_runs WHERE status != 'success'").first<CountRow>(),
  ]);

  return {
    ...counts,
    totalBytes: Number(totals?.total_bytes ?? 0),
    languages: Number(languages?.total ?? 0),
    successfulIngestRuns: Number(successfulRuns?.total ?? 0),
    failedIngestRuns: Number(failedRuns?.total ?? 0),
    latestIndexedAt: totals?.latest_indexed_at ?? null,
  };
}

function mapDashboardBundleSummary(row: DashboardBundleSummaryRow): DashboardBundleSummary {
  return {
    id: row.id,
    appName: row.app_name,
    sourceUri: row.source_uri,
    repository: row.repository,
    bundleHash: row.bundle_hash,
    contentManifestHash: row.content_manifest_hash || row.bundle_hash,
    fileCount: Number(row.file_count),
    scannedFileCount: Number(row.scanned_file_count),
    chunkCount: Number(row.chunk_count),
    totalBytes: Number(row.total_bytes),
    primaryLanguage: row.primary_language,
    createdAt: row.created_at,
    indexedAt: row.indexed_at,
  };
}

export async function listDashboardBundles(db: D1Database): Promise<DashboardBundleSummary[]> {
  const result = await db
    .prepare(
      `WITH names AS (
        SELECT bundle_id, json_extract(content, '$.name') AS app_name
        FROM code_chunks
        WHERE file_path LIKE '%webflow.json%' AND json_valid(content)
      ),
      primary_languages AS (
        SELECT bundle_id, language AS primary_language
        FROM (
          SELECT
            bundle_id,
            language,
            COUNT(*) AS chunks,
            ROW_NUMBER() OVER (PARTITION BY bundle_id ORDER BY COUNT(*) DESC, language ASC) AS row_rank
          FROM code_chunks
          GROUP BY bundle_id, language
        )
        WHERE row_rank = 1
      )
      SELECT
        b.id,
        names.app_name,
        b.source_uri,
        b.repository,
        b.bundle_hash,
        b.content_manifest_hash,
        b.file_count,
        b.scanned_file_count,
        b.chunk_count,
        b.total_bytes,
        primary_languages.primary_language,
        b.created_at,
        b.indexed_at
      FROM code_bundles b
      LEFT JOIN names ON names.bundle_id = b.id
      LEFT JOIN primary_languages ON primary_languages.bundle_id = b.id
      ORDER BY b.indexed_at DESC`,
    )
    .all<DashboardBundleSummaryRow>();

  return (result.results ?? []).map(mapDashboardBundleSummary);
}

export async function languageSummaries(db: D1Database): Promise<DashboardLanguageSummary[]> {
  const result = await db
    .prepare(
      `SELECT
        language,
        COUNT(*) AS chunks,
        COUNT(DISTINCT bundle_id) AS bundles,
        COALESCE(SUM(size_bytes), 0) AS bytes
      FROM code_chunks
      GROUP BY language
      ORDER BY chunks DESC, language ASC`,
    )
    .all<DashboardLanguageSummaryRow>();

  return (result.results ?? []).map((row) => ({
    language: row.language,
    chunks: Number(row.chunks),
    bundles: Number(row.bundles),
    bytes: Number(row.bytes),
  }));
}

export async function exactOverlapEdges(
  db: D1Database,
  options: { minSizeBytes: number; limit: number },
): Promise<DashboardOverlapEdge[]> {
  const result = await db
    .prepare(
      `WITH names AS (
        SELECT bundle_id, json_extract(content, '$.name') AS app_name
        FROM code_chunks
        WHERE file_path LIKE '%webflow.json%' AND json_valid(content)
      ),
      bundle_hashes AS (
        SELECT
          bundle_id,
          content_hash,
          MAX(size_bytes) AS size_bytes
        FROM code_chunks
        WHERE size_bytes >= ?
        GROUP BY bundle_id, content_hash
      ),
      shared AS (
        SELECT
          a.bundle_id AS bundle_a,
          b.bundle_id AS bundle_b,
          COUNT(*) AS exact_chunk_matches,
          SUM(CASE WHEN a.size_bytes < b.size_bytes THEN a.size_bytes ELSE b.size_bytes END) AS shared_bytes
        FROM bundle_hashes a
        JOIN bundle_hashes b
          ON a.content_hash = b.content_hash
          AND a.bundle_id < b.bundle_id
        GROUP BY a.bundle_id, b.bundle_id
      )
      SELECT
        shared.bundle_a,
        shared.bundle_b,
        a_names.app_name AS app_a,
        b_names.app_name AS app_b,
        shared.exact_chunk_matches,
        shared.shared_bytes
      FROM shared
      LEFT JOIN names a_names ON a_names.bundle_id = shared.bundle_a
      LEFT JOIN names b_names ON b_names.bundle_id = shared.bundle_b
      ORDER BY shared.exact_chunk_matches DESC, shared.shared_bytes DESC
      LIMIT ?`,
    )
    .bind(options.minSizeBytes, options.limit)
    .all<DashboardOverlapEdgeRow>();

  return (result.results ?? []).map((row) => ({
    bundleA: row.bundle_a,
    bundleB: row.bundle_b,
    appA: row.app_a,
    appB: row.app_b,
    exactChunkMatches: Number(row.exact_chunk_matches),
    sharedBytes: Number(row.shared_bytes),
  }));
}

export async function getExistingVectorIdsForBundle(db: D1Database, bundleId: string): Promise<string[]> {
  const result = await db.prepare('SELECT vector_id FROM code_chunks WHERE bundle_id = ?').bind(bundleId).all<{ vector_id: string }>();
  return (result.results ?? []).map((row) => row.vector_id);
}

export async function upsertBundleWithChunks(db: D1Database, bundle: CodeBundleInput, chunks: CodeChunkInput[]): Promise<void> {
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO code_bundles (
          id,
          source_type,
          source_uri,
          repository,
          ref,
          commit_sha,
          bundle_hash,
          content_manifest_hash,
          file_count,
          scanned_file_count,
          chunk_count,
          total_bytes,
          metadata_json,
          created_at,
          indexed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_type = excluded.source_type,
          source_uri = excluded.source_uri,
          repository = excluded.repository,
          ref = excluded.ref,
          commit_sha = excluded.commit_sha,
          bundle_hash = excluded.bundle_hash,
          content_manifest_hash = excluded.content_manifest_hash,
          file_count = excluded.file_count,
          scanned_file_count = excluded.scanned_file_count,
          chunk_count = excluded.chunk_count,
          total_bytes = excluded.total_bytes,
          metadata_json = excluded.metadata_json,
          indexed_at = excluded.indexed_at`,
      )
      .bind(
        bundle.id,
        bundle.sourceType,
        bundle.sourceUri,
        bundle.repository,
        bundle.ref,
        bundle.commitSha,
        bundle.bundleHash,
        bundle.contentManifestHash,
        bundle.fileCount,
        bundle.scannedFileCount,
        bundle.chunkCount,
        bundle.totalBytes,
        JSON.stringify(bundle.metadata),
        bundle.createdAt,
        bundle.indexedAt,
      ),
    db.prepare('DELETE FROM code_chunks WHERE bundle_id = ?').bind(bundle.id),
  ];

  for (const chunk of chunks) {
    statements.push(
      db
        .prepare(
          `INSERT INTO code_chunks (
            id,
            bundle_id,
            vector_id,
            file_path,
            ext,
            language,
            chunk_index,
            start_line,
            end_line,
            size_bytes,
            content_hash,
            content,
            tags_json,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          chunk.id,
          chunk.bundleId,
          chunk.vectorId,
          chunk.filePath,
          chunk.ext,
          chunk.language,
          chunk.chunkIndex,
          chunk.startLine,
          chunk.endLine,
          chunk.sizeBytes,
          chunk.contentHash,
          chunk.content,
          JSON.stringify(chunk.tags),
          chunk.createdAt,
        ),
    );
  }

  for (const group of chunkArray(statements, BATCH_SIZE)) {
    await db.batch(group);
  }
}

export async function recordIngestRun(db: D1Database, run: IngestRunInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ingest_runs (
        id,
        bundle_id,
        status,
        source_type,
        source_uri,
        started_at,
        finished_at,
        duration_ms,
        file_count,
        chunk_count,
        indexed_count,
        failed_count,
        error,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      run.id,
      run.bundleId,
      run.status,
      run.sourceType,
      run.sourceUri,
      run.startedAt,
      run.finishedAt,
      run.durationMs,
      run.fileCount,
      run.chunkCount,
      run.indexedCount,
      run.failedCount,
      run.error,
      JSON.stringify(run.metadata),
    )
    .run();
}

export async function loadBundle(db: D1Database, bundleId: string): Promise<CodeBundleInput | null> {
  const row = await db.prepare('SELECT * FROM code_bundles WHERE id = ?').bind(bundleId).first<CodeBundleRow>();
  return row ? mapBundleRow(row) : null;
}

export async function loadBundleByContentManifestHash(
  db: D1Database,
  contentManifestHash: string,
): Promise<CodeBundleInput | null> {
  const row = await db
    .prepare('SELECT * FROM code_bundles WHERE content_manifest_hash = ? ORDER BY indexed_at DESC LIMIT 1')
    .bind(contentManifestHash)
    .first<CodeBundleRow>();
  return row ? mapBundleRow(row) : null;
}

export async function loadBundleChunks(db: D1Database, bundleId: string): Promise<CodeChunkInput[]> {
  const result = await db
    .prepare('SELECT * FROM code_chunks WHERE bundle_id = ? ORDER BY file_path ASC, chunk_index ASC')
    .bind(bundleId)
    .all<CodeChunkRow>();
  return (result.results ?? []).map(mapChunkRow);
}

export async function loadRepresentativeChunksForBundle(
  db: D1Database,
  bundleId: string,
  options: { limit: number; language?: string },
): Promise<CodeChunkRow[]> {
  const binds: string[] = [bundleId];
  const languageClause = options.language ? 'AND c.language = ?' : '';
  if (options.language) binds.push(options.language);

  const result = await db
    .prepare(
      `SELECT
        c.*,
        b.repository AS repository,
        b.ref AS ref,
        b.commit_sha AS commit_sha,
        b.source_type AS source_type,
        b.source_uri AS source_uri
      FROM code_chunks c
      JOIN code_bundles b ON b.id = c.bundle_id
      WHERE c.bundle_id = ?
        AND c.size_bytes >= 80
        ${languageClause}
      ORDER BY
        CASE
          WHEN c.file_path LIKE '%webflow.json%' THEN 0
          WHEN c.language = 'javascript' THEN 1
          WHEN c.language = 'typescript' THEN 2
          WHEN c.language = 'css' THEN 3
          ELSE 4
        END,
        c.size_bytes DESC,
        c.file_path ASC,
        c.chunk_index ASC
      LIMIT ?`,
    )
    .bind(...binds, options.limit)
    .all<CodeChunkRow>();

  return result.results ?? [];
}

export async function loadChunksByVectorIds(db: D1Database, vectorIds: string[]): Promise<Map<string, CodeChunkRow>> {
  const unique = Array.from(new Set(vectorIds));
  const rows = new Map<string, CodeChunkRow>();
  if (unique.length === 0) return rows;

  for (const group of chunkArray(unique, 90)) {
    const result = await db
      .prepare(
        `SELECT
          c.*,
          b.repository AS repository,
          b.ref AS ref,
          b.commit_sha AS commit_sha,
          b.source_type AS source_type,
          b.source_uri AS source_uri
        FROM code_chunks c
        JOIN code_bundles b ON b.id = c.bundle_id
        WHERE c.vector_id IN (${placeholders(group.length)})`,
      )
      .bind(...group)
      .all<CodeChunkRow>();

    for (const row of result.results ?? []) {
      rows.set(row.vector_id, row);
    }
  }

  return rows;
}
