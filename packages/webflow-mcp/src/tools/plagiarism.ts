/**
 * Plagiarism Detection Tools
 * 
 * Agent-native tools for template plagiarism analysis.
 * Classic CS algorithms (LSH, PageRank, Bayesian) exposed via HTTP.
 */

const PLAGIARISM_API = 'https://plagiarism-agent.createsomething.workers.dev';

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
    prior?: number;
    likelihood?: number;
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
  source?: 'compute_confidence' | 'vector_fallback';
  fallbackReason?: string;
  vectorCompare?: {
    overall: number;
    verdict: string;
    html: number;
    css: number;
    js: number;
    webflow: number;
    dom: number;
  };
  normalization?: {
    strategy:
      | 'default'
      | 'webflow_pair_weighted'
      | 'webflow_pair_component_adjusted';
    rationale: string;
  };
  componentSignals?: {
    sharedClassCount: number;
    sharedWebflowClassRatio: number;
    customClassJaccard: number;
    sharedDataWIdCount: number;
    sharedDataWIdRatio: number;
    sharedRuntimeMarkerRatio: number;
    componentCommonality: number;
    componentUniqueness: number;
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

interface CompareApiResult {
  originalUrl: string;
  allegedCopyUrl: string;
  vectorSimilarity?: {
    html_similarity?: number;
    css_similarity?: number;
    js_similarity?: number;
    webflow_similarity?: number;
    dom_similarity?: number;
    overall?: number;
    verdict?: string;
  };
  timestamp?: number;
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function isWebflowHost(value: string): boolean {
  try {
    if (!isLikelyUrl(value)) return false;
    const hostname = new URL(value.trim()).hostname.toLowerCase();
    return hostname.endsWith('.webflow.io') || hostname.endsWith('.webflow.com');
  } catch {
    return false;
  }
}

const WEBFLOW_RUNTIME_MARKERS = ['jquery', 'webflow', 'webfont'] as const;

interface WebflowComponentSignals {
  sharedClassCount: number;
  sharedWebflowClassRatio: number;
  customClassJaccard: number;
  sharedDataWIdCount: number;
  sharedDataWIdRatio: number;
  sharedRuntimeMarkerRatio: number;
  componentCommonality: number;
  componentUniqueness: number;
}

function intersectionCount(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let count = 0;
  for (const value of small) {
    if (large.has(value)) count += 1;
  }
  return count;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = intersectionCount(a, b);
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return clamp01(intersection / union);
}

function extractAttributeValues(html: string, attribute: string): string[] {
  const values: string[] = [];
  const re = new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, 'gi');
  for (const match of html.matchAll(re)) {
    const value = match[1]?.trim();
    if (value) values.push(value);
  }
  return values;
}

function extractClassTokens(html: string): Set<string> {
  const tokens = new Set<string>();
  for (const value of extractAttributeValues(html, 'class')) {
    for (const token of value.split(/\s+/)) {
      const normalized = token.trim().toLowerCase();
      if (!normalized || !/^[a-z0-9_-]+$/i.test(normalized)) continue;
      tokens.add(normalized);
    }
  }
  return tokens;
}

function extractDataWIds(html: string): Set<string> {
  const ids = new Set<string>();
  for (const value of extractAttributeValues(html, 'data-w-id')) {
    const normalized = value.trim().toLowerCase();
    if (normalized) ids.add(normalized);
  }
  return ids;
}

function extractRuntimeMarkers(html: string): Set<string> {
  const markers = new Set<string>();
  const haystack = html.toLowerCase();
  for (const marker of WEBFLOW_RUNTIME_MARKERS) {
    if (haystack.includes(marker)) markers.add(marker);
  }
  return markers;
}

async function fetchHtml(url: string, timeoutMs: number = 8000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'create-something-webflow-mcp/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch HTML (${response.status})`);
    }

    return response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function computeWebflowComponentSignals(
  originalUrl: string,
  allegedCopyUrl: string
): Promise<WebflowComponentSignals | null> {
  const [originalHtml, allegedCopyHtml] = await Promise.all([
    fetchHtml(originalUrl),
    fetchHtml(allegedCopyUrl),
  ]);

  const originalClasses = extractClassTokens(originalHtml);
  const allegedClasses = extractClassTokens(allegedCopyHtml);
  const sharedClassCount = intersectionCount(originalClasses, allegedClasses);

  const originalWebflowClasses = new Set(
    Array.from(originalClasses).filter((token) => token.startsWith('w-'))
  );
  const allegedWebflowClasses = new Set(
    Array.from(allegedClasses).filter((token) => token.startsWith('w-'))
  );
  const sharedWebflowClassCount = intersectionCount(originalWebflowClasses, allegedWebflowClasses);
  const sharedWebflowClassRatio =
    sharedClassCount === 0 ? 0 : clamp01(sharedWebflowClassCount / sharedClassCount);

  const originalCustomClasses = new Set(
    Array.from(originalClasses).filter((token) => !token.startsWith('w-'))
  );
  const allegedCustomClasses = new Set(
    Array.from(allegedClasses).filter((token) => !token.startsWith('w-'))
  );
  const customClassJaccard = jaccardSimilarity(originalCustomClasses, allegedCustomClasses);

  const originalWIds = extractDataWIds(originalHtml);
  const allegedWIds = extractDataWIds(allegedCopyHtml);
  const sharedDataWIdCount = intersectionCount(originalWIds, allegedWIds);
  const sharedDataWIdRatio =
    originalWIds.size === 0 || allegedWIds.size === 0
      ? 0
      : clamp01(sharedDataWIdCount / Math.min(originalWIds.size, allegedWIds.size));

  const originalRuntimeMarkers = extractRuntimeMarkers(originalHtml);
  const allegedRuntimeMarkers = extractRuntimeMarkers(allegedCopyHtml);
  const sharedRuntimeMarkerRatio = jaccardSimilarity(originalRuntimeMarkers, allegedRuntimeMarkers);

  const componentCommonality = clamp01(
    sharedWebflowClassRatio * 0.35 +
      sharedRuntimeMarkerRatio * 0.25 +
      (1 - customClassJaccard) * 0.2 +
      sharedDataWIdRatio * 0.2
  );
  const componentUniqueness = clamp01(1 - componentCommonality);

  return {
    sharedClassCount,
    sharedWebflowClassRatio,
    customClassJaccard,
    sharedDataWIdCount,
    sharedDataWIdRatio,
    sharedRuntimeMarkerRatio,
    componentCommonality,
    componentUniqueness,
  };
}

function toComparableUrl(value: string): string | null {
  const trimmed = value.trim();
  if (isLikelyUrl(trimmed)) return trimmed;

  // For template slugs/IDs, assume public Webflow preview domain.
  if (/^[a-z0-9](?:[a-z0-9-]{0,120}[a-z0-9])?$/i.test(trimmed)) {
    return `https://${trimmed}.webflow.io/`;
  }

  return null;
}

function shouldTryVectorFallback(
  templateA: string,
  templateB: string,
  primary: BayesianResult | null
): boolean {
  if (isLikelyUrl(templateA) || isLikelyUrl(templateB)) return true;
  if (!primary) return true;

  const evidence = primary.evidence;
  const evidenceSum =
    safeNumber(evidence.cssSimilarity) +
    safeNumber(evidence.jsSimilarity) +
    safeNumber(evidence.frameworkMatch) +
    safeNumber(evidence.structuralSimilarity);

  return (
    primary.confidence.verdict === 'no_plagiarism' &&
    primary.confidence.probability < 0.12 &&
    evidenceSum < 0.6
  );
}

function verdictFromProbability(probability: number): BayesianResult['confidence']['verdict'] {
  if (probability >= 0.8) return 'definite';
  if (probability >= 0.6) return 'likely';
  if (probability >= 0.35) return 'possible';
  return 'no_plagiarism';
}

function buildVectorFallbackResult(
  compare: CompareApiResult,
  fallbackReason: string,
  context?: {
    originalUrl?: string;
    allegedCopyUrl?: string;
    componentSignals?: WebflowComponentSignals | null;
  }
): BayesianResult | null {
  const sim = compare.vectorSimilarity;
  if (!sim) return null;

  const html = clamp01(safeNumber(sim.html_similarity));
  const css = clamp01(safeNumber(sim.css_similarity));
  const js = clamp01(safeNumber(sim.js_similarity));
  const webflow = clamp01(safeNumber(sim.webflow_similarity));
  const dom = clamp01(safeNumber(sim.dom_similarity));
  const overall = clamp01(safeNumber(sim.overall));

  const structural = clamp01((html + dom) / 2);
  const evidence = {
    cssSimilarity: css,
    jsSimilarity: js,
    frameworkMatch: webflow,
    structuralSimilarity: structural,
  };

  const webflowPair =
    isWebflowHost(context?.originalUrl ?? '') && isWebflowHost(context?.allegedCopyUrl ?? '');
  const componentSignals = context?.componentSignals ?? null;
  const useComponentAdjustment = webflowPair && Boolean(componentSignals);

  // Webflow templates share substantial runtime JS/framework baseline. For Webflow-vs-Webflow
  // cases, reduce platform-level signal weight and emphasize layout/structure/CSS.
  const weightedFactors = useComponentAdjustment
    ? [
        { name: 'cssSimilarity', weight: 0.28, value: css },
        { name: 'structuralSimilarity', weight: 0.27, value: structural },
        { name: 'vectorOverall', weight: 0.15, value: overall },
        { name: 'jsSimilarity', weight: 0.1, value: js },
        { name: 'frameworkMatch', weight: 0.05, value: webflow },
        {
          name: 'componentUniqueness',
          weight: 0.15,
          value: clamp01(componentSignals?.componentUniqueness ?? 0),
        },
      ]
    : webflowPair
    ? [
        { name: 'cssSimilarity', weight: 0.3, value: css },
        { name: 'structuralSimilarity', weight: 0.3, value: structural },
        { name: 'vectorOverall', weight: 0.25, value: overall },
        { name: 'jsSimilarity', weight: 0.1, value: js },
        { name: 'frameworkMatch', weight: 0.05, value: webflow },
      ]
    : [
        { name: 'cssSimilarity', weight: 0.25, value: css },
        { name: 'jsSimilarity', weight: 0.2, value: js },
        { name: 'structuralSimilarity', weight: 0.2, value: structural },
        { name: 'frameworkMatch', weight: 0.15, value: webflow },
        { name: 'vectorOverall', weight: 0.2, value: overall },
      ];

  const likelihood = clamp01(
    weightedFactors.reduce((sum, factor) => sum + factor.weight * factor.value, 0)
  );
  const prior = 0.15;
  const denominator = likelihood * prior + (1 - likelihood) * (1 - prior);
  const probability = denominator === 0 ? 0 : (likelihood * prior) / denominator;

  return {
    confidence: {
      probability,
      prior,
      likelihood,
      verdict: verdictFromProbability(probability),
      factors: weightedFactors.map((factor) => ({
        ...factor,
        contribution: factor.weight * factor.value,
      })),
    },
    evidence,
    source: 'vector_fallback',
    fallbackReason,
    vectorCompare: {
      overall,
      verdict: sim.verdict ?? 'unknown',
      html,
      css,
      js,
      webflow,
      dom,
    },
    normalization: useComponentAdjustment
      ? {
          strategy: 'webflow_pair_component_adjusted',
          rationale:
            'Applied Webflow component normalization using shared runtime markers, class overlap patterns, and data-w-id overlap.',
        }
      : webflowPair
      ? {
          strategy: 'webflow_pair_weighted',
          rationale:
            'Down-weighted JS/framework signals because Webflow templates share platform runtime and common libraries.',
        }
      : {
          strategy: 'default',
          rationale: 'Used default vector fallback factor weights.',
        },
    componentSignals: componentSignals ?? undefined,
  };
}

async function getVectorFallbackConfidence(
  templateA: string,
  templateB: string,
  fallbackReason: string
): Promise<BayesianResult | null> {
  const originalUrl = toComparableUrl(templateA);
  const allegedCopyUrl = toComparableUrl(templateB);
  if (!originalUrl || !allegedCopyUrl) return null;

  const compare = await fetchJson<CompareApiResult>(`${PLAGIARISM_API}/api/compare`, {
    method: 'POST',
    body: JSON.stringify({ originalUrl, allegedCopyUrl }),
  });

  let componentSignals: WebflowComponentSignals | null = null;
  if (isWebflowHost(originalUrl) && isWebflowHost(allegedCopyUrl)) {
    try {
      componentSignals = await computeWebflowComponentSignals(originalUrl, allegedCopyUrl);
    } catch {
      componentSignals = null;
    }
  }

  return buildVectorFallbackResult(compare, fallbackReason, {
    originalUrl,
    allegedCopyUrl,
    componentSignals,
  });
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
  // URL-vs-URL comparisons currently rely on vector evidence as the primary source.
  // This avoids low-signal compute/confidence responses when URL inputs are not mapped
  // to indexed template IDs in the upstream service.
  if (isLikelyUrl(templateA) && isLikelyUrl(templateB)) {
    try {
      const fallback = await getVectorFallbackConfidence(
        templateA,
        templateB,
        'url_pair_vector_primary'
      );
      if (fallback) return fallback;
    } catch (error) {
      throw error instanceof Error
        ? new Error(`Vector fallback failed for URL pair: ${error.message}`)
        : new Error('Vector fallback failed for URL pair');
    }

    throw new Error('Vector fallback returned no similarity data for URL pair');
  }

  let primary: BayesianResult | null = null;
  let primaryError: Error | null = null;

  try {
    primary = await fetchJson<BayesianResult>(`${PLAGIARISM_API}/compute/confidence`, {
      method: 'POST',
      body: JSON.stringify({ templateA, templateB }),
    });
    primary.source = 'compute_confidence';
  } catch (error) {
    primaryError = error instanceof Error ? error : new Error(String(error));
  }

  const attemptFallback = shouldTryVectorFallback(templateA, templateB, primary);

  if (attemptFallback) {
    const fallbackReason = primary
      ? 'compute_confidence_low_signal'
      : 'compute_confidence_unavailable';

    try {
      const fallback = await getVectorFallbackConfidence(templateA, templateB, fallbackReason);
      if (fallback) {
        if (!primary) return fallback;

        // Prefer vector fallback when compute-confidence underestimates likely URL-level similarity.
        if (
          primary.confidence.verdict === 'no_plagiarism' ||
          fallback.confidence.probability > primary.confidence.probability + 0.15
        ) {
          return fallback;
        }
      }
    } catch {
      // Keep primary result if fallback fails.
    }
  }

  if (primary) return primary;
  if (primaryError) throw primaryError;

  throw new Error('Unable to compute Bayesian confidence');
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
