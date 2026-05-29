export type SourceType = 'upload' | 'url' | 'aws_s3';

export interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  AI: Ai;
  CODE_INDEX_ADMIN_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
  EMBEDDING_MODEL?: string;
  CODE_EMBEDDING_MAX_CHARS?: string;
  CODE_EMBEDDING_CONTEXT_RESERVE_CHARS?: string;
  CODE_CHUNK_MAX_CHARS?: string;
  CODE_CHUNK_OVERLAP_LINES?: string;
}

export interface BundleMetadata {
  [key: string]: unknown;
}

export interface CodeBundleInput {
  id: string;
  sourceType: SourceType;
  sourceUri: string | null;
  repository: string | null;
  ref: string | null;
  commitSha: string | null;
  bundleHash: string;
  contentManifestHash: string;
  fileCount: number;
  scannedFileCount: number;
  chunkCount: number;
  totalBytes: number;
  metadata: BundleMetadata;
  createdAt: string;
  indexedAt: string;
}

export interface CodeChunkInput {
  id: string;
  bundleId: string;
  vectorId: string;
  filePath: string;
  ext: string;
  language: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
  sizeBytes: number;
  contentHash: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export interface CodeBundleRow {
  id: string;
  source_type: SourceType;
  source_uri: string | null;
  repository: string | null;
  ref: string | null;
  commit_sha: string | null;
  bundle_hash: string;
  content_manifest_hash: string | null;
  file_count: number;
  scanned_file_count: number;
  chunk_count: number;
  total_bytes: number;
  metadata_json: string;
  created_at: string;
  indexed_at: string;
}

export interface CodeChunkRow {
  id: string;
  bundle_id: string;
  vector_id: string;
  file_path: string;
  ext: string;
  language: string;
  chunk_index: number;
  start_line: number;
  end_line: number;
  size_bytes: number;
  content_hash: string;
  content: string;
  tags_json: string;
  created_at: string;
  repository?: string | null;
  ref?: string | null;
  commit_sha?: string | null;
  source_type?: SourceType;
  source_uri?: string | null;
}

export interface DashboardBundleSummaryRow {
  id: string;
  app_name: string | null;
  source_uri: string | null;
  repository: string | null;
  bundle_hash: string;
  content_manifest_hash: string | null;
  file_count: number;
  scanned_file_count: number;
  chunk_count: number;
  total_bytes: number;
  primary_language: string | null;
  created_at: string;
  indexed_at: string;
}

export interface DashboardLanguageSummaryRow {
  language: string;
  chunks: number;
  bundles: number;
  bytes: number;
}

export interface DashboardOverlapEdgeRow {
  bundle_a: string;
  bundle_b: string;
  app_a: string | null;
  app_b: string | null;
  exact_chunk_matches: number;
  shared_bytes: number;
}

export interface CountRow {
  total: number;
}

export interface HealthCounts {
  bundles: number;
  chunks: number;
  ftsRows: number;
  ingestRuns: number;
}

export interface DashboardSummary {
  bundles: number;
  chunks: number;
  ftsRows: number;
  ingestRuns: number;
  totalBytes: number;
  languages: number;
  successfulIngestRuns: number;
  failedIngestRuns: number;
  latestIndexedAt: string | null;
}

export interface DashboardBundleSummary {
  id: string;
  appName: string | null;
  sourceUri: string | null;
  repository: string | null;
  bundleHash: string;
  contentManifestHash: string;
  fileCount: number;
  scannedFileCount: number;
  chunkCount: number;
  totalBytes: number;
  primaryLanguage: string | null;
  createdAt: string;
  indexedAt: string;
}

export interface DashboardLanguageSummary {
  language: string;
  chunks: number;
  bundles: number;
  bytes: number;
}

export interface DashboardOverlapEdge {
  bundleA: string;
  bundleB: string;
  appA: string | null;
  appB: string | null;
  exactChunkMatches: number;
  sharedBytes: number;
}

export interface DashboardSemanticNeighbor {
  bundleId: string;
  appName: string | null;
  bestScore: number;
  averageScore: number;
  matchCount: number;
  sampleCount: number;
  topMatches: CodeSimilarityResult[];
}

export interface DashboardSemanticNeighborsResponse {
  bundleId: string;
  appName: string | null;
  sampleCount: number;
  took: number;
  neighbors: DashboardSemanticNeighbor[];
}

export interface IngestRunInput {
  id: string;
  bundleId: string | null;
  status: 'success' | 'failed';
  sourceType: SourceType;
  sourceUri: string | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fileCount: number;
  chunkCount: number;
  indexedCount: number;
  failedCount: number;
  error: string | null;
  metadata: BundleMetadata;
}

export interface UrlIngestRequest {
  bundleUrl: string;
  bundleId?: string;
  repository?: string;
  ref?: string;
  commitSha?: string;
  sourceType?: SourceType;
  metadata?: BundleMetadata;
}

export interface QueryRequest {
  query: string;
  limit?: number;
  bundleId?: string;
  repository?: string;
  language?: string;
  pathPrefix?: string;
  minScore?: number;
}

export interface CodeSimilarityResult {
  id: string;
  vectorId: string;
  bundleId: string;
  score: number;
  filePath: string;
  language: string;
  ext: string;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
  repository: string | null;
  ref: string | null;
  commitSha: string | null;
  sourceType: SourceType | null;
  sourceUri: string | null;
  tags: string[];
}

export interface QueryResponse {
  query: string;
  total: number;
  results: CodeSimilarityResult[];
  took: number;
}

export interface IngestResponse {
  success: boolean;
  bundleId: string;
  sourceType: SourceType;
  sourceUri: string | null;
  bundleHash: string;
  contentManifestHash: string;
  fileCount: number;
  scannedFileCount: number;
  chunkCount: number;
  indexedCount: number;
  failedCount: number;
  durationMs: number;
}
