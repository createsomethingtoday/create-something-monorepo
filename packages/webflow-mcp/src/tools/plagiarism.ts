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
