import { AirtableClientError } from './airtable.js';

export const DEFAULT_WEBFLOW_VALIDATION_WORKER_URL = 'https://validation-worker.createsomething.workers.dev/validate';
export const DEFAULT_GSAP_VALIDATION_WORKER_URL = 'https://gsap-validation-worker.createsomething.workers.dev/validateGsap';

export const PUBLISHED_SITE_VALIDATION_CHECKS = ['webflow_way', 'gsap_custom_code'] as const;

export type PublishedSiteValidationCheck = (typeof PUBLISHED_SITE_VALIDATION_CHECKS)[number];

export interface ValidationToolConfig {
  webflowValidationWorkerUrl?: string;
  gsapValidationWorkerUrl?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export interface PublishedSiteValidationInput {
  published_url: string;
  template_name?: string;
  template_type?: 'html' | 'ecommerce';
  page_slugs?: string[];
  checks?: PublishedSiteValidationCheck[];
  max_pages?: number;
  include_raw?: boolean;
}

type JsonRecord = Record<string, unknown>;

const DEFAULT_MAX_PAGES = 25;
const DEFAULT_TIMEOUT_MS = 45_000;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function compactIssue(value: unknown) {
  const issue = asRecord(value);
  if (!issue) return null;
  return {
    ...(stringValue(issue.id) ? { id: stringValue(issue.id) } : {}),
    ...(stringValue(issue.category) ? { category: stringValue(issue.category) } : {}),
    ...(stringValue(issue.severity) ? { severity: stringValue(issue.severity) } : {}),
    ...(stringValue(issue.message) ? { message: stringValue(issue.message) } : {}),
    ...(stringValue(issue.description) ? { description: stringValue(issue.description) } : {}),
    ...(stringValue(issue.howToFix) ? { howToFix: stringValue(issue.howToFix) } : {}),
    ...(issue.details !== undefined ? { details: issue.details } : {}),
  };
}

function compactFlaggedCode(value: unknown) {
  const issue = asRecord(value);
  if (!issue) return null;
  return {
    ...(stringValue(issue.message) ? { message: stringValue(issue.message) } : {}),
    ...(stringValue(issue.policy) ? { policy: stringValue(issue.policy) } : {}),
    ...(Array.isArray(issue.flaggedCode) ? { flaggedCode: issue.flaggedCode.slice(0, 5) } : {}),
  };
}

function sum(values: Array<number | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function normalizePublicHttpsUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new AirtableClientError('INVALID_PUBLISHED_URL', 'Provide a valid published URL.', 400, {
      published_url: value,
    });
  }

  if (parsed.protocol !== 'https:') {
    throw new AirtableClientError('INVALID_PUBLISHED_URL', 'Published-site validation requires an https URL.', 400, {
      published_url: value,
    });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  ) {
    throw new AirtableClientError('INVALID_PUBLISHED_URL', 'Published-site validation only accepts public https URLs.', 400, {
      published_url: value,
    });
  }

  parsed.hash = '';
  return parsed.toString();
}

function normalizeChecks(checks?: PublishedSiteValidationCheck[]): PublishedSiteValidationCheck[] {
  if (!checks || checks.length === 0) return [...PUBLISHED_SITE_VALIDATION_CHECKS];
  return [...new Set(checks)];
}

function validationErrorPayload(error: unknown) {
  if (error instanceof AirtableClientError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status ?? 500,
      details: error.details,
    };
  }
  if (error instanceof Error) {
    return {
      code: error.name === 'AbortError' ? 'VALIDATION_TIMEOUT' : 'VALIDATION_FAILED',
      message: error.name === 'AbortError' ? 'Published-site validation timed out.' : error.message,
      status: 500,
    };
  }
  return {
    code: 'VALIDATION_FAILED',
    message: String(error),
    status: 500,
  };
}

async function postJson(
  endpoint: string,
  payload: JsonRecord,
  timeoutMs: number,
  fetcher: typeof fetch,
): Promise<JsonRecord> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      data = null;
    }
    const record = asRecord(data);

    if (!response.ok) {
      throw new AirtableClientError('VALIDATION_WORKER_HTTP_ERROR', `Validation worker returned HTTP ${response.status}.`, response.status, {
        endpoint,
        response: record ?? text,
      });
    }

    if (!record) {
      throw new AirtableClientError('VALIDATION_WORKER_INVALID_RESPONSE', 'Validation worker returned a non-JSON response.', 502, {
        endpoint,
      });
    }

    return record;
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeWebflowWayValidation(data: JsonRecord, includeRaw: boolean) {
  const analysis = asRecord(data.analysis) ?? {};
  const categories = ['assets', 'content', 'accessibility', 'interactions'].map((key) => {
    const category = asRecord(analysis[key]) ?? {};
    const issues = asArray(category.issues).map(compactIssue).filter(Boolean).slice(0, 25);
    const stats = asRecord(category.stats) ?? {};
    const pages = asArray(category.pages);
    const assets = asArray(category.assets);

    return {
      key,
      issueCount: asArray(category.issues).length,
      errorCount: asArray(category.issues).filter((issue) => asRecord(issue)?.severity === 'error').length,
      warningCount: asArray(category.issues).filter((issue) => asRecord(issue)?.severity === 'warning').length,
      stats,
      ...(pages.length > 0 ? { pagesAnalyzed: pages.length } : {}),
      ...(assets.length > 0 ? { assetsAnalyzed: assets.length } : {}),
      sampleIssues: issues,
    };
  });

  return {
    ok: true,
    source: 'webflow-template-validation-worker',
    coverage: ['content', 'assets', 'accessibility', 'legacy_ix2_interactions'],
    summary: asRecord(data.summary) ?? {},
    categories,
    ...(includeRaw ? { raw: data } : {}),
  };
}

function summarizeGsapValidation(data: JsonRecord, includeRaw: boolean) {
  const pageResults = asArray(data.pageResults).map((page) => asRecord(page)).filter((page): page is JsonRecord => Boolean(page));
  const siteResults = asRecord(data.siteResults);
  const crawlStats = asRecord(data.crawlStats);
  const pageCount = numberValue(siteResults?.pageCount) ?? numberValue(data.totalPagesFound) ?? pageResults.length;
  const analyzedCount = numberValue(siteResults?.analyzedCount) ?? numberValue(data.validatedPages) ?? pageResults.filter((page) => page.success !== false).length;
  const passedCount = numberValue(siteResults?.passedCount) ?? numberValue(data.passedPages) ?? pageResults.filter((page) => page.success !== false && page.passed === true).length;
  const failedCount =
    numberValue(siteResults?.failedCount) ??
    numberValue(data.failedPages) ??
    pageResults.filter((page) => page.success === false || page.passed === false).length;
  const incomplete = booleanValue(siteResults?.incomplete) ?? booleanValue(data.crawlIncomplete) ?? booleanValue(crawlStats?.partial) ?? false;

  const pageSummaries = pageResults.slice(0, 25).map((page) => {
    const summary = asRecord(page.summary) ?? {};
    const details = asRecord(page.details) ?? {};
    const flaggedCode = asArray(details.flaggedCode).map(compactFlaggedCode).filter(Boolean).slice(0, 10);
    const securityRisks = asArray(details.securityRisks).map(compactFlaggedCode).filter(Boolean).slice(0, 10);
    return {
      url: stringValue(page.url),
      title: stringValue(page.title),
      success: page.success !== false,
      passed: booleanValue(page.passed),
      error: stringValue(page.error),
      summary: {
        scriptCount: numberValue(summary.scriptCount),
        styleCount: numberValue(summary.styleCount),
        externalScriptCount: numberValue(summary.externalScriptCount),
        validGsapCount: numberValue(summary.validGsapCount),
        allowedCustomCodeCount: numberValue(summary.allowedCustomCodeCount),
        flaggedCodeCount: numberValue(summary.flaggedCodeCount) ?? numberValue(page.flaggedCodeCount),
        securityRiskCount: numberValue(summary.securityRiskCount),
        legacyIx2Detected: booleanValue(summary.legacyIx2Detected),
        legacyIx2Count: numberValue(summary.legacyIx2Count),
        unicornStudioDetected: booleanValue(summary.unicornStudioDetected),
        unicornStudioCount: numberValue(summary.unicornStudioCount),
      },
      flaggedCode,
      securityRisks,
    };
  });

  const flaggedCodeCount = sum(pageSummaries.map((page) => page.summary.flaggedCodeCount));
  const securityRiskCount = sum(pageSummaries.map((page) => page.summary.securityRiskCount));
  const legacyIx2Count = sum(pageSummaries.map((page) => page.summary.legacyIx2Count));
  const unicornStudioCount = sum(pageSummaries.map((page) => page.summary.unicornStudioCount));

  return {
    ok: true,
    source: 'gsap-validation-worker',
    coverage: ['custom_code', 'gsap_usage', 'legacy_ix2_interactions', 'unicorn_studio_embeds', 'security_risk_patterns'],
    passed: data.passed === true,
    siteResults: {
      pageCount,
      analyzedCount,
      passedCount,
      failedCount,
      incomplete,
      passRate: numberValue(siteResults?.passRate) ?? numberValue(data.passRate),
    },
    detections: {
      gsapDetected: pageSummaries.some((page) => (page.summary.validGsapCount ?? 0) > 0),
      flaggedCodeCount,
      securityRiskCount,
      legacyIx2Detected: pageSummaries.some((page) => page.summary.legacyIx2Detected === true) || legacyIx2Count > 0,
      legacyIx2Count,
      unicornStudioDetected: pageSummaries.some((page) => page.summary.unicornStudioDetected === true) || unicornStudioCount > 0,
      unicornStudioCount,
    },
    pages: pageSummaries,
    ...(stringValue(data.error) ? { error: stringValue(data.error) } : {}),
    ...(includeRaw ? { raw: data } : {}),
  };
}

async function runWebflowWayValidation(
  publishedUrl: string,
  templateName: string | undefined,
  templateType: PublishedSiteValidationInput['template_type'] | undefined,
  pageSlugs: string[] | undefined,
  maxPages: number,
  includeRaw: boolean,
  config: Required<Pick<ValidationToolConfig, 'webflowValidationWorkerUrl' | 'timeoutMs' | 'fetcher'>>,
) {
  const data = await postJson(
    config.webflowValidationWorkerUrl,
    {
      siteUrl: publishedUrl,
      designerData: {
        components: [],
        styles: [],
        pages: [],
        assets: [],
      },
      ...(pageSlugs && pageSlugs.length > 0 ? { pageSlugs } : {}),
      options: {
        maxPages,
        ...(templateName ? { marketplaceTemplateName: templateName } : {}),
        ...(templateType ? { marketplaceTemplateType: templateType } : {}),
      },
    },
    config.timeoutMs,
    config.fetcher,
  );

  return summarizeWebflowWayValidation(data, includeRaw);
}

async function runGsapValidation(
  publishedUrl: string,
  maxPages: number,
  includeRaw: boolean,
  config: Required<Pick<ValidationToolConfig, 'gsapValidationWorkerUrl' | 'timeoutMs' | 'fetcher'>>,
) {
  const data = await postJson(
    config.gsapValidationWorkerUrl,
    {
      url: publishedUrl,
      maxDepth: 10,
      maxPages,
    },
    config.timeoutMs,
    config.fetcher,
  );

  return summarizeGsapValidation(data, includeRaw);
}

export async function runPublishedSiteValidation(input: PublishedSiteValidationInput, config: ValidationToolConfig = {}) {
  const publishedUrl = normalizePublicHttpsUrl(input.published_url);
  const checks = normalizeChecks(input.checks);
  const maxPages = input.max_pages ?? DEFAULT_MAX_PAGES;
  const includeRaw = input.include_raw === true;
  const fetcher = config.fetcher ?? fetch;
  const timeoutMs = typeof config.timeoutMs === 'number' && Number.isFinite(config.timeoutMs) && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_TIMEOUT_MS;

  const webflowValidationWorkerUrl = config.webflowValidationWorkerUrl ?? DEFAULT_WEBFLOW_VALIDATION_WORKER_URL;
  const gsapValidationWorkerUrl = config.gsapValidationWorkerUrl ?? DEFAULT_GSAP_VALIDATION_WORKER_URL;

  const results: Partial<Record<PublishedSiteValidationCheck, unknown>> = {};

  await Promise.all(
    checks.map(async (check) => {
      try {
        if (check === 'webflow_way') {
          results[check] = await runWebflowWayValidation(
            publishedUrl,
            stringValue(input.template_name),
            input.template_type,
            input.page_slugs,
            maxPages,
            includeRaw,
            {
              webflowValidationWorkerUrl,
              timeoutMs,
              fetcher,
            },
          );
          return;
        }
        results[check] = await runGsapValidation(publishedUrl, maxPages, includeRaw, {
          gsapValidationWorkerUrl,
          timeoutMs,
          fetcher,
        });
      } catch (error) {
        results[check] = {
          ok: false,
          source: check === 'webflow_way' ? 'webflow-template-validation-worker' : 'gsap-validation-worker',
          error: validationErrorPayload(error),
        };
      }
    }),
  );

  return {
    publishedUrl,
    ...(stringValue(input.template_name) ? { templateName: stringValue(input.template_name) } : {}),
    ...(input.template_type ? { templateType: input.template_type } : {}),
    maxPages,
    checksRequested: checks,
    evidenceQuality: 'Partial published-site validator evidence. Useful for review triage and concrete feedback, not a final Designer/manual decision.',
    rubricCoverage: 'partial_published_site_validation',
    caveats: [
      'No Designer API data, Preview URL, or Designer-only checks are used.',
      'No Airtable writes or review status changes are performed.',
      'Accessibility coverage is limited to validator-detectable published-site signals; visual contrast and manual keyboard review still need reviewer judgment.',
      'Lorem/placeholder findings are review evidence, not automatic blockers; request changes only when the evidence points to authored customer-facing placeholder content.',
      'Alt-text findings should be treated as actionable only for editable content images/icons; generated Webflow video fallback/poster assets and intentionally decorative empty-alt images are not creator-fixable missing-alt failures.',
      'GSAP/custom-code validation currently requires a public .webflow.io published URL.',
    ],
    results,
  };
}
