import {
  reviewPublishedTemplateUrl,
  type PublishedReviewInput,
  type PublishedReviewResult,
  type ReviewFinding,
  type ReviewSeverity,
} from './published-review.js';

const TOOL_VERSION = '1.0.0';
const DEFAULT_REQUIRED_SNIPPET_VERSION = '0.2.0';
const SNIPPET_VERSION_MARKER = '__wf_review_snippet_v1';

export type SnippetStatus = 'pass' | 'fail_hard' | 'fail_soft' | 'unavailable';

export interface SnippetDiagnostics {
  url: string;
  marker: string;
  required_version: string;
  snippet_present: boolean;
  version: string | null;
  version_ok: boolean;
  smoke_ok: boolean;
  ix2_available: boolean;
  ix3_available: boolean;
  error: string | null;
  checked_at: number | null;
}

export interface RuntimeReviewInput extends PublishedReviewInput {
  snippetDiagnostics?: Partial<SnippetDiagnostics>;
  runtimeProbeEndpoint?: string;
  runtimeProbeBearerToken?: string;
  requiredSnippetVersion?: string;
  requireRuntimeEvidence?: boolean;
}

export interface RuntimeEnrichedReviewResult {
  toolVersion: string;
  reviewedAt: string;
  url: string;
  staticReview: PublishedReviewResult;
  runtime: {
    status: SnippetStatus;
    source: 'input' | 'endpoint' | 'none';
    interactionsLikely: boolean;
    requiredSnippetVersion: string;
    diagnostics: SnippetDiagnostics | null;
    probe: {
      attempted: boolean;
      endpoint: string | null;
      error: string | null;
    };
  };
  merged: {
    score: number;
    totalFindings: number;
    bySeverity: Record<ReviewSeverity, number>;
    byCheck: Record<string, number>;
    findings: ReviewFinding[];
  };
}

function scoreFindings(findings: ReviewFinding[]): number {
  let penalty = 0;
  for (const finding of findings) {
    if (finding.severity === 'critical') penalty += 10;
    else if (finding.severity === 'warning') penalty += 5;
    else penalty += 1;
  }
  return Math.max(0, Math.min(100, 100 - penalty));
}

function summarizeFindings(findings: ReviewFinding[]): {
  bySeverity: Record<ReviewSeverity, number>;
  byCheck: Record<string, number>;
} {
  const bySeverity: Record<ReviewSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
  };
  const byCheck: Record<string, number> = {};

  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
    byCheck[finding.check] = (byCheck[finding.check] ?? 0) + 1;
  }

  return { bySeverity, byCheck };
}

function parseVersionParts(version: string | null | undefined): number[] {
  if (!version) return [];
  const core = version.trim().replace(/^v/i, '');
  if (!core) return [];
  return core
    .split('.')
    .map((part) => Number(part.replace(/[^0-9].*$/, '')))
    .map((value) => (Number.isFinite(value) ? value : 0));
}

function versionAtLeast(version: string | null | undefined, requiredVersion: string): boolean {
  const left = parseVersionParts(version);
  const right = parseVersionParts(requiredVersion);
  const maxLen = Math.max(left.length, right.length, 3);

  for (let i = 0; i < maxLen; i += 1) {
    const a = left[i] ?? 0;
    const b = right[i] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function normalizeDiagnostics(
  input: Partial<SnippetDiagnostics> | Record<string, unknown>,
  url: string,
  requiredVersion: string,
): SnippetDiagnostics {
  const record = asRecord(input) ?? {};
  const version =
    typeof record.version === 'string'
      ? record.version
      : typeof record.version === 'number'
      ? String(record.version)
      : null;

  const explicitVersionOk =
    typeof record.version_ok === 'boolean' ? record.version_ok : undefined;

  return {
    url: typeof record.url === 'string' ? record.url : url,
    marker:
      typeof record.marker === 'string' ? record.marker : SNIPPET_VERSION_MARKER,
    required_version:
      typeof record.required_version === 'string'
        ? record.required_version
        : requiredVersion,
    snippet_present: Boolean(record.snippet_present),
    version,
    version_ok: explicitVersionOk ?? versionAtLeast(version, requiredVersion),
    smoke_ok: Boolean(record.smoke_ok),
    ix2_available: Boolean(record.ix2_available),
    ix3_available: Boolean(record.ix3_available),
    error: typeof record.error === 'string' ? record.error : null,
    checked_at:
      typeof record.checked_at === 'number'
        ? record.checked_at
        : Date.now(),
  };
}

function classifySnippetStatus(
  diagnostics: SnippetDiagnostics,
  interactionsLikely: boolean,
): SnippetStatus {
  if (!diagnostics.snippet_present) return 'fail_hard';
  if (!diagnostics.version_ok) return 'fail_hard';
  if (!diagnostics.smoke_ok) return 'fail_hard';
  if (interactionsLikely && !(diagnostics.ix2_available || diagnostics.ix3_available)) {
    return 'fail_soft';
  }
  return 'pass';
}

function extractProbePayload(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) return null;

  const diagnostics = asRecord(record.diagnostics);
  if (diagnostics) return diagnostics;

  const data = asRecord(record.data);
  if (data) return data;

  return record;
}

async function probeSnippetDiagnostics(
  endpoint: string,
  url: string,
  requiredVersion: string,
  timeoutMs: number,
  bearerToken?: string,
): Promise<SnippetDiagnostics> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
      body: JSON.stringify({
        url,
        marker: SNIPPET_VERSION_MARKER,
        required_version: requiredVersion,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`runtime probe failed (${response.status}): ${text}`);
    }

    const rawJson = (await response.json()) as unknown;
    const payload = extractProbePayload(rawJson);
    if (!payload) {
      throw new Error('runtime probe returned no diagnostics payload');
    }

    return normalizeDiagnostics(payload, url, requiredVersion);
  } finally {
    clearTimeout(timer);
  }
}

function runtimeFindingForStatus(
  status: SnippetStatus,
  diagnostics: SnippetDiagnostics | null,
): ReviewFinding | null {
  const diagnosticsEvidence = diagnostics
    ? ({ ...diagnostics } as Record<string, unknown>)
    : undefined;

  if (status === 'fail_hard') {
    return {
      severity: 'critical',
      check: 'runtime_snippet',
      code: 'snippet_fail_hard',
      message:
        'Snippet runtime evidence failed hard-gating checks (missing snippet, incompatible version, or smoke failure).',
      evidence: diagnosticsEvidence,
    };
  }

  if (status === 'fail_soft') {
    return {
      severity: 'warning',
      check: 'runtime_snippet',
      code: 'snippet_fail_soft',
      message:
        'Snippet smoke passed but IX2/IX3 evidence was unavailable on a page that likely has interactions.',
      evidence: diagnosticsEvidence,
    };
  }

  return null;
}

function isInteractionsLikely(staticReview: PublishedReviewResult): boolean {
  const checks = staticReview.checks as Record<string, unknown>;
  const hints = asRecord(checks.interactionHints);
  if (!hints) return false;
  return Boolean(hints.interactionsLikely);
}

export async function reviewPublishedTemplateUrlWithRuntime(
  input: RuntimeReviewInput,
): Promise<RuntimeEnrichedReviewResult> {
  const staticReview = await reviewPublishedTemplateUrl({
    url: input.url,
    includeSitemap: input.includeSitemap,
    probe404: input.probe404,
    maxExamples: input.maxExamples,
    sitemapMaxUrls: input.sitemapMaxUrls,
    timeoutMs: input.timeoutMs,
  });

  const requiredSnippetVersion =
    input.requiredSnippetVersion ?? DEFAULT_REQUIRED_SNIPPET_VERSION;
  const interactionsLikely = isInteractionsLikely(staticReview);
  const timeoutMs = input.timeoutMs ?? 15_000;

  let source: 'input' | 'endpoint' | 'none' = 'none';
  let diagnostics: SnippetDiagnostics | null = null;
  let probeAttempted = false;
  let probeEndpoint: string | null = null;
  let probeError: string | null = null;

  if (input.snippetDiagnostics) {
    source = 'input';
    diagnostics = normalizeDiagnostics(
      input.snippetDiagnostics,
      staticReview.url,
      requiredSnippetVersion,
    );
  } else {
    const endpoint =
      input.runtimeProbeEndpoint ?? process.env.WEBFLOW_SNIPPET_PROBE_API ?? null;
    if (endpoint) {
      source = 'endpoint';
      probeAttempted = true;
      probeEndpoint = endpoint;
      try {
        diagnostics = await probeSnippetDiagnostics(
          endpoint,
          staticReview.url,
          requiredSnippetVersion,
          timeoutMs,
          input.runtimeProbeBearerToken,
        );
      } catch (error) {
        probeError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  const status: SnippetStatus = diagnostics
    ? classifySnippetStatus(diagnostics, interactionsLikely)
    : 'unavailable';

  const mergedFindings: ReviewFinding[] = [...staticReview.findings];
  const runtimeFinding = runtimeFindingForStatus(status, diagnostics);
  if (runtimeFinding) mergedFindings.push(runtimeFinding);

  if (status === 'unavailable' && input.requireRuntimeEvidence) {
    mergedFindings.push({
      severity: 'warning',
      check: 'runtime_snippet',
      code: 'snippet_runtime_unavailable',
      message:
        'Runtime snippet diagnostics were required but unavailable. Provide snippetDiagnostics or runtimeProbeEndpoint.',
      evidence: {
        probeAttempted,
        probeEndpoint,
        probeError,
      },
    });
  }

  const mergedSummary = summarizeFindings(mergedFindings);

  return {
    toolVersion: TOOL_VERSION,
    reviewedAt: new Date().toISOString(),
    url: staticReview.url,
    staticReview,
    runtime: {
      status,
      source,
      interactionsLikely,
      requiredSnippetVersion,
      diagnostics,
      probe: {
        attempted: probeAttempted,
        endpoint: probeEndpoint,
        error: probeError,
      },
    },
    merged: {
      score: scoreFindings(mergedFindings),
      totalFindings: mergedFindings.length,
      bySeverity: mergedSummary.bySeverity,
      byCheck: mergedSummary.byCheck,
      findings: mergedFindings,
    },
  };
}
