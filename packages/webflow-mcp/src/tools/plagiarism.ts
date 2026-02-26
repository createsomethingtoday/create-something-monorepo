/**
 * Plagiarism Detection Tools
 * 
 * Agent-native tools for template plagiarism analysis.
 * Classic CS algorithms (LSH, PageRank, Bayesian) exposed via HTTP.
 */

const PLAGIARISM_API =
  process.env.PLAGIARISM_API ?? 'https://plagiarism-agent.createsomething.workers.dev';
const REQUEST_TIMEOUT_MS = Number(process.env.PLAGIARISM_REQUEST_TIMEOUT_MS ?? '30000');

// =============================================================================
// Types
// =============================================================================

export interface ComputeStats {
  lsh: { functionsIndexed: number };
  pagerank: {
    templatesRanked: number;
    distribution: Array<{ classification: string; count: number }>;
  };
  frameworks: {
    detected: number;
    distribution: Array<{ framework_name: string; count: number }>;
  };
  confidence: { highConfidenceCases: number };
}

export interface PageRankResult {
  success: boolean;
  graphEdges: number;
  templatesRanked: number;
  topOriginals: Array<{
    templateId: string;
    score: number;
    classification: string;
  }>;
  topDerivatives: Array<{
    templateId: string;
    score: number;
    classification: string;
  }>;
}

export interface FrameworkResult {
  frameworks: Array<{
    name: string;
    version?: string;
    features: string[];
    confidence: number;
  }>;
  fingerprint: string;
  frameworkCount: number;
}

export interface BayesianResult {
  confidence: {
    probability: number;
    verdict: 'no_plagiarism' | 'possible' | 'likely' | 'definite';
    factors: Array<{
      name: string;
      weight: number;
      value: number;
      contribution: number;
    }>;
  };
  evidence: {
    cssSimilarity: number;
    jsSimilarity: number;
    frameworkMatch: number;
    structuralSimilarity: number;
  };
}

export interface SimilarFunctionsResult {
  templateId: string;
  candidates: Array<{
    templateId: string;
    functionName: string;
    matchingBands: number;
    estimatedSimilarity: number;
    matchedWith: string;
  }>;
}

export interface LSHIndexResult {
  success: boolean;
  indexed: number;
  remaining: number;
}

export interface ScanResult {
  url: string;
  indexed: boolean;
  matches: Array<{
    id: string;
    name: string;
    similarity: number;
    verdict: string;
  }>;
  recommendation: string;
}

export interface HealthResult {
  status: string;
  version: string;
  stats: {
    templatesIndexed: number;
    casesProcessed: number;
    lshBands: number;
  };
}

export interface ExclusionResult {
  success?: boolean;
  excluded: boolean | { templateA: string; templateB: string; reason?: string };
  reason?: string;
  created_at?: string;
}

export interface ExclusionListResult {
  count: number;
  exclusions: Array<{
    template_a: string;
    template_b: string;
    reason?: string;
    created_at: string;
  }>;
}

export interface CompareUrlsResult {
  originalUrl: string;
  allegedCopyUrl: string;
  vectorSimilarity: {
    html_similarity: number;
    css_similarity: number;
    js_similarity: number;
    webflow_similarity: number;
    dom_similarity: number;
    overall: number;
    verdict: string;
  };
  timestamp: number;
  normalization?: {
    originalUrl: { input: string; normalized: string };
    allegedCopyUrl: { input: string; normalized: string };
  };
}

export type MatrixSignalLevel = 'pass' | 'warn' | 'fail_major';
export type MatrixSnippetStatus = 'pass' | 'fail_hard' | 'fail_soft';
export type MatrixAgentRecommendation =
  | 'pass'
  | 'escalate_minor'
  | 'escalate_major'
  | 'block_submission';
export type MatrixHumanOutcome = 'approve' | 'revise' | 'reject' | 'exclude_pair';

export interface PlagiarismDecisionRecord {
  pair_id: string;
  vector_score_overall: number; // 0-1
  vector_level: MatrixSignalLevel;
  visual_max_section: number; // 0-1
  visual_avg: number; // 0-1
  visual_level: MatrixSignalLevel;
  interaction_similarity: number; // 0-100
  shared_interaction_ids: number;
  convergence_sections_high: number;
  interaction_level: MatrixSignalLevel;
  snippet_status: MatrixSnippetStatus;
  agent_recommendation: MatrixAgentRecommendation;
  human_outcome?: MatrixHumanOutcome;
  evidence_bundle_refs: {
    screenshots?: string[];
    vector_source?: 'vectorize' | 'local_proxy' | 'unavailable';
    vector_payload?: unknown;
    interaction_summary?: {
      interaction_similarity: number;
      interaction_verdict: string;
      shared_interaction_ids: number;
      convergence_sections_high: number;
      convergence_sections_medium: number;
    };
    snippet_diagnostics?: {
      url?: string;
      marker?: string;
      required_version?: string;
      snippet_present?: boolean;
      version?: string | null;
      version_ok?: boolean;
      smoke_ok?: boolean;
      ix2_available?: boolean;
      ix3_available?: boolean;
      error?: string | null;
      checked_at?: number | null;
    };
    visual_override?: {
      applied: boolean;
      rule?: string | null;
      raw_visual_level: MatrixSignalLevel;
      effective_visual_level: MatrixSignalLevel;
    };
    timestamp?: number;
    [key: string]: unknown;
  };
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  return response.json();
}

const WEBFLOW_TEMPLATE_LISTING_REGEX = /^https?:\/\/(?:www\.)?webflow\.com\/templates\/html\/[^/?#]+/i;
const WEBFLOW_PREVIEW_URL_REGEX = /https:\/\/[a-zA-Z0-9-]+\.webflow\.io\/?/g;

async function normalizeComparableUrl(url: string): Promise<string> {
  if (!WEBFLOW_TEMPLATE_LISTING_REGEX.test(url)) {
    return url;
  }

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) {
      return url;
    }

    const html = await response.text();

    // Prefer explicit "Preview in browser" CTA when available.
    const browserPreviewMatch = html.match(/id="footer-browser-preview"[^>]*href="([^"]+)"/i);
    if (browserPreviewMatch?.[1]) {
      return browserPreviewMatch[1];
    }

    const previewMatch = html.match(WEBFLOW_PREVIEW_URL_REGEX);
    if (previewMatch && previewMatch.length > 0) {
      return previewMatch[0];
    }

    return url;
  } catch {
    return url;
  }
}

// =============================================================================
// Tool Implementations
// =============================================================================

/** Get statistics about the computational algorithms */
export async function getComputeStats(): Promise<ComputeStats> {
  return fetchJson<ComputeStats>(`${PLAGIARISM_API}/compute/stats`);
}

/** Index JS functions with LSH signatures for O(1) similarity lookup */
export async function indexLSHSignatures(limit: number = 100): Promise<LSHIndexResult> {
  return fetchJson<LSHIndexResult>(`${PLAGIARISM_API}/compute/lsh-index`, {
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
}

/** Find functions similar to those in a template using LSH */
export async function findSimilarFunctions(
  templateId: string,
  minBands: number = 1
): Promise<SimilarFunctionsResult> {
  return fetchJson<SimilarFunctionsResult>(`${PLAGIARISM_API}/compute/similar-functions`, {
    method: 'POST',
    body: JSON.stringify({ templateId, minBands }),
  });
}

/** Compute PageRank scores to identify originals vs copies */
export async function computePageRank(
  threshold: number = 0.5,
  rebuildGraph: boolean = false
): Promise<PageRankResult> {
  return fetchJson<PageRankResult>(`${PLAGIARISM_API}/compute/pagerank`, {
    method: 'POST',
    body: JSON.stringify({ threshold, rebuildGraph }),
  });
}

/** Get PageRank leaderboard */
export async function getPageRankLeaderboard(limit: number = 50): Promise<{
  leaderboard: Array<{
    template_id: string;
    score: number;
    in_degree: number;
    out_degree: number;
    classification: string;
    name: string;
    url: string;
  }>;
}> {
  return fetchJson(`${PLAGIARISM_API}/compute/pagerank/leaderboard?limit=${limit}`);
}

/** Detect JavaScript frameworks in a template */
export async function detectFrameworks(
  url: string,
  templateId?: string
): Promise<FrameworkResult> {
  return fetchJson<FrameworkResult>(`${PLAGIARISM_API}/compute/frameworks`, {
    method: 'POST',
    body: JSON.stringify({ url, templateId }),
  });
}

/** Calculate Bayesian plagiarism confidence for a template pair */
export async function calculateBayesianConfidence(
  templateA: string,
  templateB: string
): Promise<BayesianResult> {
  return fetchJson<BayesianResult>(`${PLAGIARISM_API}/compute/confidence`, {
    method: 'POST',
    body: JSON.stringify({ templateA, templateB }),
  });
}

/** Scan a template URL for plagiarism matches */
export async function scanTemplate(
  url: string,
  threshold: number = 0.3
): Promise<ScanResult> {
  return fetchJson<ScanResult>(`${PLAGIARISM_API}/scan/template`, {
    method: 'POST',
    body: JSON.stringify({ url, threshold }),
  });
}

/** Get health status of the plagiarism detection system */
export async function getHealth(): Promise<HealthResult> {
  return fetchJson<HealthResult>(`${PLAGIARISM_API}/health`);
}

/** Add or check exclusion for a template pair (false positive handling) */
export async function addExclusion(
  templateA: string,
  templateB: string,
  reason?: string
): Promise<ExclusionResult> {
  return fetchJson<ExclusionResult>(`${PLAGIARISM_API}/exclusions`, {
    method: 'POST',
    body: JSON.stringify({ templateA, templateB, reason }),
  });
}

/** Check if a template pair is excluded */
export async function checkExclusion(
  templateA: string,
  templateB: string
): Promise<ExclusionResult> {
  return fetchJson<ExclusionResult>(`${PLAGIARISM_API}/exclusions/check`, {
    method: 'POST',
    body: JSON.stringify({ templateA, templateB }),
  });
}

/** List all exclusions */
export async function listExclusions(limit: number = 100): Promise<ExclusionListResult> {
  return fetchJson<ExclusionListResult>(`${PLAGIARISM_API}/exclusions?limit=${limit}`);
}

/** Compare two template/site URLs using vector similarity endpoint */
export async function compareUrls(
  originalUrl: string,
  allegedCopyUrl: string
): Promise<CompareUrlsResult> {
  const normalizedOriginalUrl = await normalizeComparableUrl(originalUrl);
  const normalizedAllegedCopyUrl = await normalizeComparableUrl(allegedCopyUrl);

  const result = await fetchJson<CompareUrlsResult>(`${PLAGIARISM_API}/api/compare`, {
    method: 'POST',
    body: JSON.stringify({
      originalUrl: normalizedOriginalUrl,
      allegedCopyUrl: normalizedAllegedCopyUrl,
    }),
  });

  return {
    ...result,
    normalization: {
      originalUrl: { input: originalUrl, normalized: normalizedOriginalUrl },
      allegedCopyUrl: { input: allegedCopyUrl, normalized: normalizedAllegedCopyUrl },
    },
  };
}
