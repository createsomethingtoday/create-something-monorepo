import { validateAdminToken } from './auth.js';
import { MAX_QUERY_LIMIT } from './config.js';
import { dashboardSummary, exactOverlapEdges, healthCounts, languageSummaries, listDashboardBundles, loadBundle, loadBundleChunks, loadChunksByVectorIds, loadRepresentativeChunksForBundle } from './db.js';
import { dashboardHtml } from './dashboard.js';
import { generateEmbedding } from './embeddings.js';
import { jsonResponse, corsPreflight, errorResponse } from './http.js';
import { ingestBundle } from './ingest.js';
import type {
  BundleMetadata,
  CodeChunkRow,
  CodeSimilarityResult,
  DashboardBundleSummary,
  DashboardSemanticNeighbor,
  DashboardSemanticNeighborsResponse,
  Env,
  QueryRequest,
  QueryResponse,
  SourceType,
  UrlIngestRequest,
} from './types.js';
import { parseJsonArray } from './utils.js';

const DEFAULT_DASHBOARD_OVERLAP_LIMIT = 80;
const MAX_DASHBOARD_OVERLAP_LIMIT = 200;
const DEFAULT_SEMANTIC_SAMPLE_COUNT = 3;
const MAX_SEMANTIC_SAMPLE_COUNT = 8;
const DEFAULT_SEMANTIC_NEIGHBOR_LIMIT = 8;
const MAX_SEMANTIC_NEIGHBOR_LIMIT = 20;

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function boundedInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function stringField(value: FormDataEntryValue | null): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function metadataFromForm(value: FormDataEntryValue | null): BundleMetadata {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as BundleMetadata) : {};
  } catch {
    return {};
  }
}

function metadataFromJson(value: unknown): BundleMetadata {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as BundleMetadata) : {};
}

async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return errorResponse(request, env, 'Expected multipart/form-data with a bundle ZIP file.', 415);
  }

  const form = await request.formData();
  const bundleEntry = form.get('bundle') ?? form.get('file');
  if (!bundleEntry || typeof bundleEntry === 'string' || typeof bundleEntry.arrayBuffer !== 'function') {
    return errorResponse(request, env, 'Missing bundle file field.', 400);
  }

  const uploadName = 'name' in bundleEntry && typeof bundleEntry.name === 'string' ? bundleEntry.name : 'uploaded-bundle.zip';
  const sourceUri = stringField(form.get('sourceUri')) ?? `upload://${uploadName}`;

  const result = await ingestBundle(env, {
    blob: bundleEntry,
    sourceType: 'upload',
    sourceUri,
    bundleId: stringField(form.get('bundleId')) ?? undefined,
    repository: stringField(form.get('repository')),
    ref: stringField(form.get('ref')),
    commitSha: stringField(form.get('commitSha')),
    metadata: metadataFromForm(form.get('metadata')),
  });

  return jsonResponse(request, env, result, result.success ? 200 : 207);
}

async function handleUrlIngest(request: Request, env: Env): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const body = await parseJsonBody<UrlIngestRequest>(request);
  if (!body?.bundleUrl || typeof body.bundleUrl !== 'string') {
    return errorResponse(request, env, 'bundleUrl is required.', 400);
  }

  let url: URL;
  try {
    url = new URL(body.bundleUrl);
  } catch {
    return errorResponse(request, env, 'bundleUrl must be a valid URL.', 400);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return errorResponse(request, env, 'Only HTTP(S) bundle URLs are supported in the upload-first pipeline.', 400);
  }

  const response = await fetch(url.href);
  if (!response.ok) {
    return errorResponse(request, env, `Failed to fetch bundle URL: ${response.status}`, 400);
  }

  const sourceType: SourceType = body.sourceType ?? 'url';
  const result = await ingestBundle(env, {
    blob: await response.blob(),
    sourceType,
    sourceUri: url.href,
    bundleId: body.bundleId,
    repository: body.repository ?? null,
    ref: body.ref ?? null,
    commitSha: body.commitSha ?? null,
    metadata: metadataFromJson(body.metadata),
  });

  return jsonResponse(request, env, result, result.success ? 200 : 207);
}

function vectorMetadata(match: VectorizeMatch): Record<string, unknown> {
  return (match.metadata ?? {}) as Record<string, unknown>;
}

function matchesRequestFilters(match: VectorizeMatch, request: QueryRequest): boolean {
  const metadata = vectorMetadata(match);
  if (request.bundleId && metadata.bundle_id !== request.bundleId) return false;
  if (request.repository && metadata.repository !== request.repository) return false;
  if (request.language && metadata.language !== request.language) return false;
  if (request.pathPrefix && typeof metadata.file_path === 'string' && !metadata.file_path.startsWith(request.pathPrefix)) {
    return false;
  }
  if (request.pathPrefix && typeof metadata.file_path !== 'string') return false;
  if (typeof request.minScore === 'number' && match.score < request.minScore) return false;
  return true;
}

function toSimilarityResult(match: VectorizeMatch, row: CodeChunkRow): CodeSimilarityResult {
  return {
    id: row.id,
    vectorId: row.vector_id,
    bundleId: row.bundle_id,
    score: match.score,
    filePath: row.file_path,
    language: row.language,
    ext: row.ext,
    startLine: Number(row.start_line),
    endLine: Number(row.end_line),
    content: row.content,
    contentHash: row.content_hash,
    repository: row.repository ?? null,
    ref: row.ref ?? null,
    commitSha: row.commit_sha ?? null,
    sourceType: row.source_type ?? null,
    sourceUri: row.source_uri ?? null,
    tags: parseJsonArray(row.tags_json),
  };
}

async function handleQuery(request: Request, env: Env): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const startedAt = Date.now();
  const body = await parseJsonBody<QueryRequest>(request);
  if (!body?.query || typeof body.query !== 'string') {
    return errorResponse(request, env, 'query is required.', 400);
  }

  const limit = Math.min(Math.max(Number(body.limit ?? 10) || 10, 1), MAX_QUERY_LIMIT);
  const embedding = await generateEmbedding(body.query, env);
  const topK = Math.min(Math.max(limit * 4, limit), 50);
  const vectorResults = await env.VECTORIZE.query(embedding, {
    topK,
    returnMetadata: 'all',
  });

  const matches = vectorResults.matches.filter((match) => matchesRequestFilters(match, body)).slice(0, limit);
  const rowsByVectorId = await loadChunksByVectorIds(
    env.DB,
    matches.map((match) => match.id),
  );

  const results = matches
    .map((match) => {
      const row = rowsByVectorId.get(match.id);
      return row ? toSimilarityResult(match, row) : null;
    })
    .filter((item): item is CodeSimilarityResult => item !== null);

  const response: QueryResponse = {
    query: body.query,
    total: results.length,
    results,
    took: Date.now() - startedAt,
  };

  return jsonResponse(request, env, response);
}

async function handleGetBundle(request: Request, env: Env, bundleId: string): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const bundle = await loadBundle(env.DB, bundleId);
  if (!bundle) return errorResponse(request, env, 'Bundle not found.', 404);

  const url = new URL(request.url);
  const includeContent = url.searchParams.get('include_content') === 'true';
  const chunks = await loadBundleChunks(env.DB, bundleId);

  return jsonResponse(request, env, {
    bundle,
    chunks: chunks.map((chunk) => ({
      ...chunk,
      content: includeContent ? chunk.content : undefined,
    })),
  });
}

async function handleDashboardOverlaps(request: Request, env: Env): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const url = new URL(request.url);
  const minSizeBytes = boundedInt(url.searchParams.get('minSize'), 200, 0, 100000);
  const limit = boundedInt(url.searchParams.get('limit'), DEFAULT_DASHBOARD_OVERLAP_LIMIT, 1, MAX_DASHBOARD_OVERLAP_LIMIT);
  return jsonResponse(request, env, await exactOverlapEdges(env.DB, { minSizeBytes, limit }));
}

function publicBundleSummary(bundle: DashboardBundleSummary): DashboardBundleSummary {
  return {
    ...bundle,
    sourceUri: null,
    repository: null,
    bundleHash: '',
    contentManifestHash: '',
  };
}

async function handlePublicDashboardOverlaps(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const minSizeBytes = boundedInt(url.searchParams.get('minSize'), 200, 0, 100000);
  const limit = boundedInt(url.searchParams.get('limit'), DEFAULT_DASHBOARD_OVERLAP_LIMIT, 1, MAX_DASHBOARD_OVERLAP_LIMIT);
  return jsonResponse(request, env, await exactOverlapEdges(env.DB, { minSizeBytes, limit }));
}

async function handleDashboardSemanticNeighbors(request: Request, env: Env): Promise<Response> {
  const authError = validateAdminToken(request, env);
  if (authError) return authError;

  const startedAt = Date.now();
  const url = new URL(request.url);
  const bundleId = url.searchParams.get('bundleId')?.trim();
  if (!bundleId) return errorResponse(request, env, 'bundleId is required.', 400);

  const samples = boundedInt(url.searchParams.get('samples'), DEFAULT_SEMANTIC_SAMPLE_COUNT, 1, MAX_SEMANTIC_SAMPLE_COUNT);
  const limit = boundedInt(url.searchParams.get('limit'), DEFAULT_SEMANTIC_NEIGHBOR_LIMIT, 1, MAX_SEMANTIC_NEIGHBOR_LIMIT);
  const language = url.searchParams.get('language')?.trim() || undefined;
  const chunks = await loadRepresentativeChunksForBundle(env.DB, bundleId, { limit: samples, language });
  if (chunks.length === 0) return errorResponse(request, env, 'No representative chunks found for bundle.', 404);

  const bundles = await listDashboardBundles(env.DB);
  const bundleNames = new Map(bundles.map((bundle) => [bundle.id, bundle.appName]));
  const sourceBundle = bundles.find((bundle) => bundle.id === bundleId);
  const neighbors = new Map<
    string,
    {
      scores: number[];
      sampleIndexes: Set<number>;
      topMatches: CodeSimilarityResult[];
    }
  >();

  for (const [sampleIndex, chunk] of chunks.entries()) {
    const embedding = await generateEmbedding(chunk.content, env);
    const vectorResults = await env.VECTORIZE.query(embedding, {
      topK: 50,
      returnMetadata: 'all',
    });

    const matches = vectorResults.matches.filter((match) => {
      if (match.id === chunk.vector_id) return false;
      const metadata = vectorMetadata(match);
      return metadata.bundle_id !== bundleId;
    });
    const rowsByVectorId = await loadChunksByVectorIds(
      env.DB,
      matches.map((match) => match.id),
    );

    for (const match of matches) {
      const row = rowsByVectorId.get(match.id);
      if (!row || row.bundle_id === bundleId) continue;
      const current = neighbors.get(row.bundle_id) ?? { scores: [], sampleIndexes: new Set<number>(), topMatches: [] };
      current.scores.push(match.score);
      current.sampleIndexes.add(sampleIndex);
      const result = toSimilarityResult(match, row);
      current.topMatches.push(result);
      current.topMatches.sort((a, b) => b.score - a.score);
      current.topMatches = current.topMatches.slice(0, 4);
      neighbors.set(row.bundle_id, current);
    }
  }

  const response: DashboardSemanticNeighborsResponse = {
    bundleId,
    appName: sourceBundle?.appName ?? null,
    sampleCount: chunks.length,
    took: Date.now() - startedAt,
    neighbors: Array.from(neighbors.entries())
      .map(([neighborBundleId, item]): DashboardSemanticNeighbor => {
        const scoreTotal = item.scores.reduce((sum, score) => sum + score, 0);
        return {
          bundleId: neighborBundleId,
          appName: bundleNames.get(neighborBundleId) ?? null,
          bestScore: Math.max(...item.scores),
          averageScore: item.scores.length ? scoreTotal / item.scores.length : 0,
          matchCount: item.scores.length,
          sampleCount: item.sampleIndexes.size,
          topMatches: item.topMatches,
        };
      })
      .sort((a, b) => b.bestScore - a.bestScore || b.matchCount - a.matchCount)
      .slice(0, limit),
  };

  return jsonResponse(request, env, response);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (request.method === 'OPTIONS') return corsPreflight(request, env);

      if ((url.pathname === '/' || url.pathname === '/health') && request.method === 'GET') {
        return jsonResponse(request, env, {
          status: 'ok',
          service: 'codebase-vector-database',
          timestamp: new Date().toISOString(),
          counts: await healthCounts(env.DB),
        });
      }

      if (url.pathname === '/dashboard' && request.method === 'GET') {
        return htmlResponse(dashboardHtml());
      }

      if ((url.pathname === '/share' || url.pathname === '/dashboard/share') && request.method === 'GET') {
        return htmlResponse(dashboardHtml({ shareMode: true }));
      }

      if (url.pathname === '/api/share/summary' && request.method === 'GET') {
        return jsonResponse(request, env, await dashboardSummary(env.DB));
      }

      if (url.pathname === '/api/share/bundles' && request.method === 'GET') {
        const bundles = await listDashboardBundles(env.DB);
        return jsonResponse(request, env, bundles.map(publicBundleSummary));
      }

      if (url.pathname === '/api/share/languages' && request.method === 'GET') {
        return jsonResponse(request, env, await languageSummaries(env.DB));
      }

      if (url.pathname === '/api/share/overlaps' && request.method === 'GET') {
        return handlePublicDashboardOverlaps(request, env);
      }

      if (url.pathname === '/api/dashboard/summary' && request.method === 'GET') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        return jsonResponse(request, env, await dashboardSummary(env.DB));
      }

      if (url.pathname === '/api/dashboard/bundles' && request.method === 'GET') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        return jsonResponse(request, env, await listDashboardBundles(env.DB));
      }

      if (url.pathname === '/api/dashboard/languages' && request.method === 'GET') {
        const authError = validateAdminToken(request, env);
        if (authError) return authError;
        return jsonResponse(request, env, await languageSummaries(env.DB));
      }

      if (url.pathname === '/api/dashboard/overlaps' && request.method === 'GET') {
        return handleDashboardOverlaps(request, env);
      }

      if (url.pathname === '/api/dashboard/semantic-neighbors' && request.method === 'GET') {
        return handleDashboardSemanticNeighbors(request, env);
      }

      if (url.pathname === '/api/code-bundles/upload' && request.method === 'POST') {
        return handleUpload(request, env);
      }

      if (url.pathname === '/api/code-bundles/ingest-url' && request.method === 'POST') {
        return handleUrlIngest(request, env);
      }

      if (url.pathname === '/api/code-bundles/query' && request.method === 'POST') {
        return handleQuery(request, env);
      }

      if (url.pathname.startsWith('/api/code-bundles/') && request.method === 'GET') {
        const bundleId = decodeURIComponent(url.pathname.slice('/api/code-bundles/'.length));
        if (!bundleId) return errorResponse(request, env, 'Bundle id is required.', 400);
        return handleGetBundle(request, env, bundleId);
      }

      return errorResponse(request, env, 'Not found.', 404);
    } catch (error) {
      console.error('Codebase vector database request failed:', error);
      return errorResponse(request, env, 'Request failed.', 500, error instanceof Error ? error.message : String(error));
    }
  },
};
