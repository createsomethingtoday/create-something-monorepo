#!/usr/bin/env tsx

import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { OpenAI } from 'openai';

import {
  AirtableClient,
  type TemplateReviewAsset,
  type TemplateReviewVersion,
} from '../packages/webflow-template-review-mcp/src/airtable.ts';
import {
  DEFAULT_AIRTABLE_BASE_ID,
  REVIEW_STATUS_OPTIONS,
} from '../packages/webflow-template-review-mcp/src/schema.ts';
import type {
  TemplateReviewJobRecord,
  UnifiedTemplateReviewReport,
} from '../packages/webflow-site-analyzer-mcp/src/types.ts';

type Args = {
  dryRun: boolean;
  overwrite: boolean;
  limit: number;
  versionId?: string;
  model: string;
  historyLimit: number;
  crawlMaxPages: number;
  crawlMaxDepth: number;
  skipCrawl: boolean;
  statuses: string[];
  analyzer: 'auto' | 'off' | 'stdio' | 'remote';
  analyzerPollIntervalMs: number;
  analyzerMaxWaitMs: number;
  analyzerTimeoutMs: number;
};

type PageSummary = {
  url: string;
  status: number | null;
  title?: string;
  description?: string;
  h1?: string[];
  h2?: string[];
  textSnippet?: string;
};

type SiteCrawlResult = {
  startUrl: string;
  discoveredPages: PageSummary[];
  visitedCount: number;
  maxDepth: number;
  maxPages: number;
  error?: string;
};

type AnalyzerClientContext = {
  source: 'stdio' | 'remote';
  toolNames: Set<string>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  close: () => Promise<void>;
};

type AnalyzerReviewOutcome =
  | {
      ok: true;
      source: 'stdio' | 'remote';
      tool: 'enqueue_template_review' | 'run_template_review';
      report: UnifiedTemplateReviewReport;
    }
  | {
      ok: false;
      source?: 'stdio' | 'remote';
      error: string;
    };

function isAnalyzerFailure(
  result: AnalyzerReviewOutcome | null | undefined,
): result is Extract<AnalyzerReviewOutcome, { ok: false }> {
  return Boolean(result && result.ok === false);
}

const READY_FOR_REVIEW_VIEW_ID = 'viwlVxrTFxnP0O9xp';

const TEMPLATE_REVIEW_POLICY = {
  internalFaq: {
    slaDays: 3,
    reviewLifecycle: [
      'Ready for Review and Response to Review should be checked promptly.',
      'Creators do not see internal reviewer comments directly.',
      'If a creator resubmits, prior issues may still exist; reviewers should not assume the latest response fixed everything.',
    ],
    hardRules: [
      'License page is required even for single-page templates.',
      'Changelog page is recommended but not required.',
      'Affiliate links are not allowed in templates.',
      'Templates are not allowed to retain an installed Library on submission or after publish.',
      'Ecommerce templates for intangible products may be acceptable without a product image.',
      'Thumbnail guidance in internal FAQ: 750x995 and max 300kb.',
    ],
    ecommerceChecks: [
      'Internal admin review checks should confirm commerceConfig values are unset/false for forbidden ecommerce setup states before publish.',
      'If ecommerce business address, shipping, tax, or processor configuration has been baked into a template and cannot be removed, reviewers may need to require a rebuilt clean project.',
    ],
  },
  submissionGuidelines: {
    topLevel: [
      'To be publishable, templates must meet all submission requirements and achieve at least Good on all rubric sections.',
      'A style guide page is required.',
      'An instructions page is required when advanced interactions, hidden components, or GSAP custom code are used.',
      'If GSAP is present in custom code, instructions must explain animated selectors, editable variables, and safe removal steps.',
      'License page slug must be /licenses and must include the required license intro text and linked license details for assets.',
      'Footer should include Powered by Webflow linking to Webflow homepage.',
      'Custom branded 404 page with navigation and CTAs is required.',
    ],
    designSystem: [
      'Use reusable components for nav, footer, and CTAs.',
      'Variables and class naming should be consistent and human-readable.',
      'Hover, pressed, and focus states should be styled.',
    ],
    contentAndLayout: [
      'Avoid placeholder copy and empty links.',
      'Content should fit the template category and remain globally appropriate.',
      'Responsive layouts should be fluid and usable across breakpoints.',
      'Forms need labels, legible placeholders, correct field types, and customized success states.',
    ],
    seoAndAccessibility: [
      'Each page should have unique titles, descriptions, OG metadata, and sound heading hierarchy.',
      'Main pages should pass PageSpeed-based SEO and accessibility expectations.',
      'Contrast, alt text, keyboard/screen-reader structure, and descriptive link labels matter.',
    ],
    assets: [
      'Images should be optimized, preferably modern formats, with below-the-fold lazy loading and explicit dimensions/aspect ratio handling.',
      'Premium or trademarked graphics/logos are not allowed except functional social/account/payment-store icon usage that does not imply endorsement.',
      'Nav logo should match template name and be easy to replace.',
    ],
  },
  rubric: {
    areas: [
      'Overall user experience',
      'Graphic design',
      'Typography',
      'Interaction design',
      'Hierarchy',
      'Layout design quality',
      'Responsive design',
      'Conversion best practices',
      'Site optimization',
      'Accessibility',
    ],
    interpretation: [
      'Good is the minimum acceptable bar in every rubric section.',
      'Satisfactory may still receive one revision cycle but should be treated as below the publish bar.',
      'Drafts should prioritize concrete reviewer checks tied to rubric failure risk, not generic QA commentary.',
    ],
  },
  webflowWayChecklist: {
    core: [
      'Submission should clear both the submission guidelines and quality rubric before publish.',
      'Licenses and changelog pages should use noindex head code when present.',
      'Homepage SEO title should match the template naming formula.',
    ],
    designUsability: [
      'No layout bugs across desktop, tablet, mobile landscape, and mobile portrait.',
      'Dynamic pages should not be blank.',
      'Use one consistent class naming system across the template.',
      'Audit Panel should show one H1 per page, no skipped heading levels, and no missing alt text.',
      'Nav, footer, and CTAs should be Components with title-cased names.',
      'Unused interactions and unused styles/classes should be cleaned up.',
      'Color, typography, and spacing variables should be reusable, human-readable, and breakpoint-aware.',
      'Static pages should have meta title, meta description, and OG tags; CMS pages should use dynamic SEO tags.',
      '404 page should be branded and images should define dimensions.',
      'Below-the-fold images should lazy load; modern formats should be used where possible.',
      'Hover/press states should prefer simple CSS transitions.',
    ],
    performanceFunctionality: [
      'No legacy interactions; use Interactions 2.0.',
      'Large videos should be compressed and provide pause/skip controls.',
      'Ecommerce templates should have a functional cart styled consistently with the site.',
      'Ecommerce product pages should include add-to-cart, description, and product image for tangible products.',
    ],
    technicalSafety: [
      'Page-level custom code should be avoided except approved noindex/meta or font antialiasing cases.',
      'Site-level custom code should be minimal, typically only font smoothing.',
      'Ecommerce setup steps like business address, shipping, tax, payment provider, hosting, and checkout should remain unchecked in the template submission state.',
      'Responsive images should be enabled in project settings.',
      'No trademarked logos, branded content, or premium stock assets; use replaceable placeholders and properly licensed assets.',
      'License page must include the required opening license statement exactly.',
    ],
  },
} as const;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getAirtableApiKey(): string {
  return process.env.AIRTABLE_API_KEY?.trim() || process.env.AIRTABLE_PAT?.trim() || requireEnv('AIRTABLE_API_KEY');
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseArgs(): Args {
  const raw = process.argv.slice(2);
  const statuses: string[] = [];
  let versionId: string | undefined;
  let model = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
  let limit = 10;
  let historyLimit = 3;
  let crawlMaxPages = 10;
  let crawlMaxDepth = 2;
  let analyzer: Args['analyzer'] =
    process.env.TEMPLATE_REVIEW_ANALYZER_MODE?.trim().toLowerCase() === 'remote'
      ? 'remote'
      : process.env.TEMPLATE_REVIEW_ANALYZER_MODE?.trim().toLowerCase() === 'stdio'
        ? 'stdio'
        : process.env.TEMPLATE_REVIEW_ANALYZER_MODE?.trim().toLowerCase() === 'off'
          ? 'off'
          : 'auto';
  let analyzerPollIntervalMs = toPositiveInt(process.env.TEMPLATE_REVIEW_ANALYZER_POLL_INTERVAL_MS, 3000);
  let analyzerMaxWaitMs = toPositiveInt(process.env.TEMPLATE_REVIEW_ANALYZER_MAX_WAIT_MS, 90_000);
  let analyzerTimeoutMs = toPositiveInt(process.env.TEMPLATE_REVIEW_ANALYZER_TIMEOUT_MS, 90_000);

  for (let index = 0; index < raw.length; index += 1) {
    const arg = raw[index];
    const next = raw[index + 1];

    if (arg === '--version-id' && next) {
      versionId = next;
      index += 1;
      continue;
    }
    if (arg === '--model' && next) {
      model = next;
      index += 1;
      continue;
    }
    if (arg === '--limit' && next) {
      limit = toPositiveInt(next, limit);
      index += 1;
      continue;
    }
    if (arg === '--history-limit' && next) {
      historyLimit = toPositiveInt(next, historyLimit);
      index += 1;
      continue;
    }
    if (arg === '--crawl-max-pages' && next) {
      crawlMaxPages = toPositiveInt(next, crawlMaxPages);
      index += 1;
      continue;
    }
    if (arg === '--crawl-max-depth' && next) {
      crawlMaxDepth = toPositiveInt(next, crawlMaxDepth);
      index += 1;
      continue;
    }
    if (arg === '--analyzer' && next) {
      if (next === 'auto' || next === 'off' || next === 'stdio' || next === 'remote') {
        analyzer = next;
      }
      index += 1;
      continue;
    }
    if (arg === '--analyzer-poll-interval-ms' && next) {
      analyzerPollIntervalMs = toPositiveInt(next, analyzerPollIntervalMs);
      index += 1;
      continue;
    }
    if (arg === '--analyzer-max-wait-ms' && next) {
      analyzerMaxWaitMs = toPositiveInt(next, analyzerMaxWaitMs);
      index += 1;
      continue;
    }
    if (arg === '--analyzer-timeout-ms' && next) {
      analyzerTimeoutMs = toPositiveInt(next, analyzerTimeoutMs);
      index += 1;
      continue;
    }
    if (arg === '--status' && next) {
      statuses.push(next);
      index += 1;
      continue;
    }
  }

  return {
    dryRun: raw.includes('--dry-run'),
    overwrite: raw.includes('--overwrite'),
    limit,
    versionId,
    model,
    historyLimit,
    crawlMaxPages,
    crawlMaxDepth,
    skipCrawl: raw.includes('--skip-crawl'),
    statuses: statuses.length > 0 ? statuses : [REVIEW_STATUS_OPTIONS[0]],
    analyzer,
    analyzerPollIntervalMs,
    analyzerMaxWaitMs,
    analyzerTimeoutMs,
  };
}

function stripHtml(value: string | undefined, limit = 600): string | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return undefined;
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

function clip(value: string | undefined, limit: number): string | undefined {
  if (!value) return undefined;
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item : null))
    .filter((item): item is string => Boolean(item))
    .slice(0, limit);
}

function normalizeUnifiedTemplateReviewReport(
  value: unknown,
  depth = 0,
): UnifiedTemplateReviewReport | null {
  if (depth > 3) return null;

  const record = asRecord(value);
  const hasCoreFields =
    typeof record.generatedAt === 'string' &&
    typeof record.provider === 'string' &&
    typeof record.publishedUrl === 'string';

  if (hasCoreFields) {
    return record as unknown as UnifiedTemplateReviewReport;
  }

  if (record.result) {
    const nested = normalizeUnifiedTemplateReviewReport(record.result, depth + 1);
    if (nested) return nested;
  }

  if (record.report) {
    const nested = normalizeUnifiedTemplateReviewReport(record.report, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function normalizeTemplateReviewJobRecord(value: unknown, depth = 0): TemplateReviewJobRecord | null {
  if (depth > 3) return null;

  const record = asRecord(value);
  const hasCoreFields =
    typeof record.jobId === 'string' &&
    typeof record.status === 'string' &&
    typeof record.queuedAt === 'string';

  if (hasCoreFields) {
    return record as unknown as TemplateReviewJobRecord;
  }

  if (record.result) {
    const nested = normalizeTemplateReviewJobRecord(record.result, depth + 1);
    if (nested) return nested;
  }

  if (record.job) {
    const nested = normalizeTemplateReviewJobRecord(record.job, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function normalizeUrl(raw: string, origin: string): string | null {
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return null;
    if (['mailto:', 'tel:', 'javascript:'].includes(url.protocol)) return null;
    url.hash = '';
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString();
  } catch {
    return null;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? clip(decodeHtml(stripHtml(match[1], 200) ?? ''), 200) : undefined;
}

function extractMetaDescription(html: string): string | undefined {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  return match ? clip(decodeHtml(match[1].trim()), 240) : undefined;
}

function extractHeadings(html: string, tagName: 'h1' | 'h2'): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) && values.length < 4) {
    const text = stripHtml(decodeHtml(match[1]), 160);
    if (text) values.push(text);
  }
  return values;
}

function extractTextSnippet(html: string): string | undefined {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const text = stripHtml(bodyMatch?.[1] ?? html, 420);
  return text ? clip(text, 420) : undefined;
}

function extractLinks(html: string, origin: string): string[] {
  const links = new Set<string>();
  const regex = /<a\b[^>]*href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const normalized = normalizeUrl(match[1], origin);
    if (normalized) links.add(normalized);
  }
  return [...links];
}

async function discoverSitePages(
  startUrl: string,
  options: { maxPages: number; maxDepth: number },
): Promise<SiteCrawlResult> {
  const start = new URL(startUrl);
  const queue: Array<{ url: string; depth: number }> = [{ url: start.toString(), depth: 0 }];
  const queued = new Set<string>([start.toString()]);
  const visited = new Set<string>();
  const discoveredPages: PageSummary[] = [];

  while (queue.length > 0 && visited.size < options.maxPages) {
    const current = queue.shift();
    if (!current) break;
    if (visited.has(current.url)) continue;
    visited.add(current.url);

    try {
      const response = await fetch(current.url, {
        headers: {
          'User-Agent': 'create-something-template-review-agent/0.1',
        },
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) {
        discoveredPages.push({
          url: current.url,
          status: response.status,
        });
        continue;
      }

      const html = await response.text();
      discoveredPages.push({
        url: current.url,
        status: response.status,
        title: extractTitle(html),
        description: extractMetaDescription(html),
        h1: extractHeadings(html, 'h1'),
        h2: extractHeadings(html, 'h2'),
        textSnippet: extractTextSnippet(html),
      });

      if (current.depth >= options.maxDepth) {
        continue;
      }

      for (const link of extractLinks(html, start.origin)) {
        if (!visited.has(link) && !queued.has(link) && queued.size + visited.size < options.maxPages * 3) {
          queued.add(link);
          queue.push({ url: link, depth: current.depth + 1 });
        }
      }
    } catch (error) {
      discoveredPages.push({
        url: current.url,
        status: null,
        description: error instanceof Error ? clip(error.message, 240) : clip(String(error), 240),
      });
    }
  }

  return {
    startUrl: start.toString(),
    discoveredPages,
    visitedCount: visited.size,
    maxDepth: options.maxDepth,
    maxPages: options.maxPages,
  };
}

function serializeAsset(asset: TemplateReviewAsset): Record<string, unknown> {
  return {
    assetId: asset.assetId,
    templateName: asset.templateName,
    descriptionShort: clip(asset.descriptionShort, 300),
    descriptionLongText: stripHtml(asset.descriptionLongHtml, 700),
    websiteUrl: asset.websiteUrl,
    previewSiteUrl: asset.previewSiteUrl,
    marketplaceStatus: asset.marketplaceStatus,
    latestReviewStatus: asset.latestReviewStatus,
    latestReviewDate: asset.latestReviewDate,
    latestReviewFeedback: clip(asset.latestReviewFeedback, 500),
    rejectionFeedback: clip(asset.rejectionFeedback, 500),
    qualityRating: asset.qualityRating,
    priceString: asset.priceString,
    submittedDate: asset.submittedDate,
    decisionDate: asset.decisionDate,
  };
}

function serializeVersion(version: TemplateReviewVersion): Record<string, unknown> {
  return {
    versionId: version.versionId,
    assetId: version.assetId,
    versionNumber: version.versionNumber,
    reviewStatus: version.reviewStatus,
    reviewOwner: version.reviewOwner,
    qualityRating: version.qualityRating,
    improvementAreas: version.improvementAreas,
    reviewFeedback: clip(version.reviewFeedback, 600),
    agentReviewFeedback: clip(version.agentReviewFeedback, 600),
    rejectionFeedback: clip(version.rejectionFeedback, 500),
    rejectReason: clip(version.rejectReason, 280),
    submissionDatetime: version.createdAt,
    decisionDate: version.decisionDate,
    createdBy: version.createdBy,
  };
}

function serializeHistory(versions: TemplateReviewVersion[]): Array<Record<string, unknown>> {
  return versions.map((version) => ({
    versionId: version.versionId,
    versionNumber: version.versionNumber,
    reviewStatus: version.reviewStatus,
    qualityRating: version.qualityRating,
    improvementAreas: version.improvementAreas,
    reviewFeedback: clip(version.reviewFeedback, 320),
    rejectionFeedback: clip(version.rejectionFeedback, 320),
    rejectReason: clip(version.rejectReason, 180),
    createdAt: version.createdAt,
    decisionDate: version.decisionDate,
  }));
}

function serializePages(crawl: SiteCrawlResult | null): Record<string, unknown> {
  if (!crawl) {
    return {
      status: 'not_attempted',
    };
  }

  return {
    status: crawl.error ? 'error' : 'ok',
    startUrl: crawl.startUrl,
    visitedCount: crawl.visitedCount,
    maxDepth: crawl.maxDepth,
    maxPages: crawl.maxPages,
    error: crawl.error,
    pages: crawl.discoveredPages.slice(0, 8),
  };
}

function serializeAnalyzerReport(result: AnalyzerReviewOutcome | null): Record<string, unknown> {
  if (!result) {
    return {
      status: 'not_attempted',
    };
  }

  if (isAnalyzerFailure(result)) {
    return {
      status: 'error',
      source: result.source ?? null,
      error: result.error,
    };
  }

  const report = normalizeUnifiedTemplateReviewReport(result.report);
  if (!report) {
    return {
      status: 'error',
      source: result.source,
      tool: result.tool,
      error: 'Analyzer returned an unrecognized report payload.',
      rawKeys: Object.keys(asRecord(result.report)).slice(0, 20),
    };
  }

  const designer = asRecord(report.designer);
  const designerMetadataSummary = asRecord(designer.metadataSummary);
  const designerSummary = asRecord(designer.summary);
  const precheck = asRecord(report.precheck);
  const published = asRecord(report.published);
  const publishedPages = Array.isArray(published.pages) ? published.pages.map((page) => asRecord(page)) : [];
  const rows = Array.isArray(report.rows) ? report.rows : [];

  return {
    status: 'ok',
    source: result.source,
    tool: result.tool,
    provider: report.provider,
    generatedAt: report.generatedAt,
    summary: report.summary,
    precheck: Object.keys(precheck).length > 0
      ? {
          discoveredUrls: asStringArray(precheck.discoveredUrls, 12),
          requiredPages: precheck.requiredPages ?? null,
          sitemap: precheck.sitemap ?? null,
          errors: asStringArray(precheck.errors, 12),
        }
      : null,
    providerMetrics: report.providerMetrics ?? null,
    designer: {
      metadataSummary: {
        siteName:
          typeof designerMetadataSummary.siteName === 'string' ? designerMetadataSummary.siteName : undefined,
        sitePlan:
          typeof designerMetadataSummary.sitePlan === 'string' ? designerMetadataSummary.sitePlan : undefined,
        totalPages:
          typeof designerMetadataSummary.totalPages === 'number' ? designerMetadataSummary.totalPages : undefined,
        totalComponents:
          typeof designerMetadataSummary.totalComponents === 'number'
            ? designerMetadataSummary.totalComponents
            : undefined,
        totalInteractions:
          typeof designerMetadataSummary.totalInteractions === 'number'
            ? designerMetadataSummary.totalInteractions
            : undefined,
        totalCMSCollections:
          typeof designerMetadataSummary.totalCMSCollections === 'number'
            ? designerMetadataSummary.totalCMSCollections
            : undefined,
      },
      summary: designerSummary,
    },
    published:
      Object.keys(published).length > 0
        ? {
            visitedPages: typeof published.visitedPages === 'number' ? published.visitedPages : publishedPages.length,
            auditedPages: typeof published.auditedPages === 'number' ? published.auditedPages : null,
            pagesWithSnippet: typeof published.pagesWithSnippet === 'number' ? published.pagesWithSnippet : null,
            pagesWithInstalledSnippet:
              typeof published.pagesWithInstalledSnippet === 'number' ? published.pagesWithInstalledSnippet : null,
            pagesWithInjectedSnippet:
              typeof published.pagesWithInjectedSnippet === 'number' ? published.pagesWithInjectedSnippet : null,
            pagesWithDomFallback:
              typeof published.pagesWithDomFallback === 'number' ? published.pagesWithDomFallback : null,
            failingPages: typeof published.failingPages === 'number' ? published.failingPages : null,
            snippetVersion: typeof published.snippetVersion === 'string' ? published.snippetVersion : null,
            snippetInjectionUrl:
              typeof published.snippetInjectionUrl === 'string' ? published.snippetInjectionUrl : null,
            snippetInjectionErrors: asStringArray(published.snippetInjectionErrors, 5),
            sitemapStatus: published.sitemapStatus ?? null,
            issueCounts: published.issueCounts ?? null,
            samplePages: publishedPages.slice(0, 6).map((page) => ({
              url: typeof page.url === 'string' ? page.url : null,
              statusCode: typeof page.statusCode === 'number' ? page.statusCode : null,
              hasSnippet: page.hasSnippet === true,
              snippetSource: typeof page.snippetSource === 'string' ? page.snippetSource : null,
              failCount: asRecord(page.summary).failCount ?? 0,
              failReasons: asStringArray(asRecord(page.summary).failReasons, 5),
              error: typeof page.error === 'string' ? page.error : null,
            })),
          }
        : null,
    keyRows: rows
      .filter((row) => row.status === 'fail' || row.status === 'partial')
      .slice(0, 14)
      .map((row) => ({
        id: row.id,
        section: row.section,
        requirement: row.requirement,
        status: row.status,
        confidence: row.confidence,
        evidence: row.evidence.slice(0, 4),
        fixHint: row.fixHint,
      })),
  };
}

function completionText(content: string | Array<{ type?: string; text?: string }> | null | undefined): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => (typeof item?.text === 'string' ? item.text : ''))
    .join('\n')
    .trim();
}

function formatFeedback(model: string, body: string): string {
  const timestamp = new Date().toISOString();
  return `[AI supplemental review draft | ${timestamp} | ${model}]\n\n${body.trim()}`;
}

function parseToolJson(result: unknown): unknown {
  const record = asRecord(result);
  const hasStructuredContent = Object.prototype.hasOwnProperty.call(record, 'structuredContent');
  const structuredContent = hasStructuredContent ? record.structuredContent : undefined;
  const content = Array.isArray(record.content) ? record.content : [];
  const rawText = content
    .map((entry) => asRecord(entry))
    .filter((entry) => entry.type === 'text' && typeof entry.text === 'string')
    .map((entry) => entry.text as string)
    .join('\n')
    .trim();

  let parsed: unknown = structuredContent;
  if (parsed == null && rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  if (record.isError === true) {
    const parsedRecord = asRecord(parsed);
    const message =
      (typeof parsedRecord.error === 'string' ? parsedRecord.error : null) ??
      rawText ??
      'Analyzer tool call failed.';
    throw new Error(message);
  }

  return parsed;
}

async function postRemoteMcp(
  url: string,
  apiKey: string,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${method}-${Date.now()}`,
      method,
      params,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Remote analyzer request failed (${response.status}): ${text}`);
  }

  const payload = JSON.parse(text) as Record<string, unknown>;
  if (payload.error) {
    const errorRecord = asRecord(payload.error);
    throw new Error(
      typeof errorRecord.message === 'string' ? errorRecord.message : JSON.stringify(payload.error),
    );
  }

  return payload.result;
}

async function getRemoteAnalyzerHealth(url: string): Promise<Record<string, unknown> | null> {
  try {
    const healthUrl = new URL(url);
    healthUrl.pathname = '/health';
    healthUrl.search = '';

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;
    return asRecord(await response.json());
  } catch {
    return null;
  }
}

async function runLocalAnalyzerReview(
  args: Args,
  asset: TemplateReviewAsset,
): Promise<AnalyzerReviewOutcome> {
  return new Promise<AnalyzerReviewOutcome>((resolve) => {
    const analyzerArgs = [
      './scripts/test-template-review-mcp.mjs',
      '--published-url',
      asset.websiteUrl ?? '',
      '--mode',
      'sync',
      '--crawl-max-pages',
      String(args.crawlMaxPages),
      '--crawl-max-depth',
      String(args.crawlMaxDepth),
      '--timeout-ms',
      String(args.analyzerTimeoutMs),
      '--max-total-timeout-ms',
      String(args.analyzerMaxWaitMs),
      '--poll-interval-ms',
      String(args.analyzerPollIntervalMs),
      '--output',
      'report',
    ];
    if (asset.previewSiteUrl) {
      analyzerArgs.splice(1, 0, '--preview-url', asset.previewSiteUrl);
    }

    const child = spawn(
      'node',
      analyzerArgs,
      {
        cwd: fileURLToPath(new URL('../packages/webflow-site-analyzer-mcp/', import.meta.url)),
        env: Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === 'string')),
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      resolve({
        ok: false,
        source: 'stdio',
        error: error instanceof Error ? error.message : String(error),
      });
    });
    child.on('exit', (code) => {
      if (code !== 0) {
        const preferredError = stdout.trim() || stderr.trim() || `Local analyzer exited with code ${code}.`;
        resolve({
          ok: false,
          source: 'stdio',
          error: clip(preferredError, 1200) ?? 'Local analyzer failed.',
        });
        return;
      }

      try {
        const report = normalizeUnifiedTemplateReviewReport(JSON.parse(stdout.trim()));
        if (!report) {
          throw new Error('Local analyzer produced an unrecognized report payload.');
        }
        resolve({
          ok: true,
          source: 'stdio',
          tool: 'enqueue_template_review',
          report,
        });
      } catch (error) {
        resolve({
          ok: false,
          source: 'stdio',
          error:
            clip(
              `Failed to parse local analyzer output: ${
                error instanceof Error ? error.message : String(error)
              }\n${stdout.trim() || stderr.trim()}`,
              1200,
            ) ?? 'Failed to parse local analyzer output.',
        });
      }
    });
  });
}

async function connectRemoteAnalyzerClient(): Promise<AnalyzerClientContext> {
  const url = process.env.WEBFLOW_SITE_ANALYZER_MCP_URL?.trim();
  const apiKey =
    process.env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY?.trim() ?? process.env.MCP_API_KEY?.trim() ?? '';

  if (!url || !apiKey) {
    throw new Error('Remote analyzer MCP credentials are not configured.');
  }

  const health = await getRemoteAnalyzerHealth(url);
  const templateReview = asRecord(health?.templateReview);
  if (templateReview?.browserAutomationSupported === false) {
    throw new Error('Remote analyzer health reports browser-backed template review is unsupported on this deployment.');
  }

  const toolsResult = asRecord(await postRemoteMcp(url, apiKey, 'tools/list', {}));
  const toolList = Array.isArray(toolsResult.tools) ? toolsResult.tools : [];

  return {
    source: 'remote',
    toolNames: new Set(
      toolList
        .map((tool) => asRecord(tool))
        .map((tool) => (typeof tool.name === 'string' ? tool.name : ''))
        .filter(Boolean),
    ),
    callTool: async (name, args) =>
      parseToolJson(
        await postRemoteMcp(url, apiKey, 'tools/call', {
          name,
          arguments: args,
        }),
      ),
    close: async () => {},
  };
}

async function connectStdioAnalyzerClient(): Promise<AnalyzerClientContext> {
  const child = spawn('node', ['./packages/webflow-site-analyzer-mcp/dist/index.js'], {
    cwd: process.cwd(),
    env: Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === 'string')),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let nextId = 1;
  let stdoutBuffer = Buffer.alloc(0);
  const pending = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();

  child.stdout.on('data', (chunk: Buffer) => {
    stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]);

    while (stdoutBuffer.length > 0) {
      const headerEnd = stdoutBuffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = stdoutBuffer.subarray(0, headerEnd).toString('utf8');
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        stdoutBuffer = stdoutBuffer.subarray(headerEnd + 4);
        continue;
      }

      const contentLength = Number.parseInt(match[1] ?? '0', 10);
      const bodyStart = headerEnd + 4;
      const messageEnd = bodyStart + contentLength;
      if (stdoutBuffer.length < messageEnd) break;

      const body = stdoutBuffer.subarray(bodyStart, messageEnd).toString('utf8');
      stdoutBuffer = stdoutBuffer.subarray(messageEnd);

      try {
        const payload = JSON.parse(body) as Record<string, unknown>;
        const id = typeof payload.id === 'string' || typeof payload.id === 'number' ? String(payload.id) : '';
        if (!id) continue;

        const waiter = pending.get(id);
        if (!waiter) continue;
        pending.delete(id);

        if (payload.error) {
          const errorRecord = asRecord(payload.error);
          waiter.reject(
            new Error(
              typeof errorRecord.message === 'string' ? errorRecord.message : JSON.stringify(payload.error),
            ),
          );
          continue;
        }

        waiter.resolve(payload.result);
      } catch {
        // Ignore malformed frames and keep parsing subsequent messages.
      }
    }
  });

  child.on('exit', (code) => {
    for (const waiter of pending.values()) {
      waiter.reject(new Error(`Local analyzer process exited with code ${code ?? 'unknown'}.`));
    }
    pending.clear();
  });

  async function send(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = String(nextId++);
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });
    const framed = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;

    return new Promise<unknown>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.stdin.write(framed, (error) => {
        if (error) {
          pending.delete(id);
          reject(error);
        }
      });
    });
  }

  function notify(method: string, params: Record<string, unknown>): void {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
    });
    const framed = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;
    child.stdin.write(framed);
  }

  await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'template-review-agent-feedback',
      version: '0.1.0',
    },
  });
  notify('notifications/initialized', {});

  const toolsResult = asRecord(await send('tools/list', {}));
  const toolList = Array.isArray(toolsResult.tools) ? toolsResult.tools : [];

  return {
    source: 'stdio',
    toolNames: new Set(
      toolList
        .map((tool) => asRecord(tool))
        .map((tool) => (typeof tool.name === 'string' ? tool.name : ''))
        .filter(Boolean),
    ),
    callTool: async (name, args) =>
      parseToolJson(
        await send('tools/call', {
          name,
          arguments: args,
        }),
      ),
    close: async () => {
      if (!child.killed) {
        child.kill();
      }
    },
  };
}

async function connectAnalyzerClient(mode: Args['analyzer']): Promise<AnalyzerClientContext> {
  const modes: Array<'stdio' | 'remote'> =
    mode === 'auto' ? ['stdio', 'remote'] : mode === 'stdio' ? ['stdio'] : ['remote'];
  const errors: string[] = [];

  for (const candidate of modes) {
    try {
      const context =
        candidate === 'stdio'
          ? await connectStdioAnalyzerClient()
          : await connectRemoteAnalyzerClient();
      if (
        context.toolNames.has('enqueue_template_review') && context.toolNames.has('get_template_review_job')
      ) {
        return context;
      }
      if (context.toolNames.has('run_template_review')) {
        return context;
      }
      await context.close();
      errors.push(`${candidate}: required review tools are not available`);
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(errors.join('; '));
}

async function runAnalyzerReview(
  args: Args,
  asset: TemplateReviewAsset,
): Promise<AnalyzerReviewOutcome | null> {
  if (args.analyzer === 'off') return null;
  if (!asset.websiteUrl) {
    return {
      ok: false,
      error: 'Analyzer skipped because published URL is missing.',
    };
  }

  if (args.analyzer === 'stdio') {
    return runLocalAnalyzerReview(args, asset);
  }

  if (args.analyzer === 'auto') {
    const remoteResult = await runAnalyzerReview(
      {
        ...args,
        analyzer: 'remote',
      },
      asset,
    );
    if (remoteResult?.ok) {
      return remoteResult;
    }

    const localResult = await runLocalAnalyzerReview(args, asset);
    if (localResult.ok) {
      return localResult;
    }

    const remoteError = isAnalyzerFailure(remoteResult) ? remoteResult.error : 'unavailable';
    const localError = isAnalyzerFailure(localResult) ? localResult.error : 'unexpected local success';
    return {
      ok: false,
      error: `remote: ${remoteError}; local: ${localError}`,
    };
  }

  if (args.analyzer === 'remote') {
    let context: AnalyzerClientContext | null = null;

    try {
      context = await connectRemoteAnalyzerClient();

      const toolArgs: Record<string, unknown> = {
        publishedUrl: asset.websiteUrl,
        timeout: args.analyzerTimeoutMs,
        crawlMaxPages: args.crawlMaxPages,
        crawlMaxDepth: args.crawlMaxDepth,
        includeManual: true,
      };
      if (asset.previewSiteUrl) {
        toolArgs.previewUrl = asset.previewSiteUrl;
      }

      if (context.toolNames.has('run_template_review')) {
        const reviewData = normalizeUnifiedTemplateReviewReport(await context.callTool(
          'run_template_review',
          toolArgs,
        ));
        if (!reviewData) {
          throw new Error('Analyzer returned an unrecognized synchronous review payload.');
        }

        return {
          ok: true,
          source: context.source,
          tool: 'run_template_review',
          report: reviewData,
        };
      }

      if (context.toolNames.has('enqueue_template_review') && context.toolNames.has('get_template_review_job')) {
        const enqueueData = asRecord(await context.callTool('enqueue_template_review', toolArgs));
        const jobId = typeof enqueueData.jobId === 'string' ? enqueueData.jobId : '';
        if (!jobId) {
          throw new Error('Analyzer did not return a template review job id.');
        }
        console.error(
          `[template-review:agent-feedback] analyzer job ${jobId} queued via ${context.source} for ${
            asset.websiteUrl ?? asset.previewSiteUrl
          }`,
        );

        const startedAt = Date.now();
        let lastProgressSignature = '';
        while (Date.now() - startedAt < args.analyzerMaxWaitMs) {
          const jobData = normalizeTemplateReviewJobRecord(await context.callTool('get_template_review_job', {
            jobId,
          }));
          if (!jobData) {
            throw new Error(`Analyzer returned an unrecognized job payload for ${jobId}.`);
          }

          const progress = jobData.progress;
          if (progress) {
            const signature = `${progress.phase}:${progress.progress}:${progress.total}:${progress.message}`;
            if (signature !== lastProgressSignature) {
              lastProgressSignature = signature;
              console.error(
                `[template-review:agent-feedback] analyzer job ${jobId} ${progress.phase} ${progress.progress}/${progress.total} ${progress.message}`.trim(),
              );
            }
          }

          if (jobData.status === 'succeeded' && jobData.result) {
            const report = normalizeUnifiedTemplateReviewReport(jobData.result);
            if (!report) {
              throw new Error(`Analyzer job ${jobId} succeeded without a recognizable review report.`);
            }
            console.error(
              `[template-review:agent-feedback] analyzer job ${jobId} succeeded in ${Date.now() - startedAt}ms`,
            );
            return {
              ok: true,
              source: context.source,
              tool: 'enqueue_template_review',
              report,
            };
          }
          if (jobData.status === 'failed' || jobData.status === 'canceled') {
            throw new Error(jobData.error || `Analyzer job ${jobId} ${jobData.status}.`);
          }

          await new Promise((resolve) => setTimeout(resolve, args.analyzerPollIntervalMs));
        }

        throw new Error(`Analyzer job timed out after ${args.analyzerMaxWaitMs}ms.`);
      }

      throw new Error('Analyzer review tools are not available on the remote MCP deployment.');
    } catch (error) {
      return {
        ok: false,
        source: context?.source,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }
    }
  }

  return runLocalAnalyzerReview(
    {
      ...args,
      analyzer: 'stdio',
    },
    asset,
  );
}

async function generateFeedback(
  openai: OpenAI,
  args: Args,
  asset: TemplateReviewAsset,
  currentVersion: TemplateReviewVersion,
  history: TemplateReviewVersion[],
  analyzerReview: AnalyzerReviewOutcome | null,
  crawl: SiteCrawlResult | null,
): Promise<string> {
  const systemPrompt = [
    'You are generating supplemental internal review notes for Webflow Template Reviewers.',
    'This is internal reviewer support, not creator-facing copy and not a final approval/rejection decision.',
    'Use only the provided Airtable data, analyzer outputs, and site crawl summaries.',
    'Apply the provided internal reviewer FAQ guidance, Webflow submission guidelines, and rubric thresholds.',
    'Assume the publish bar is Good-or-better across every rubric section.',
    'If crawl coverage is partial or missing, say that explicitly.',
    'Do not claim you reviewed pages that were not provided.',
    'Focus on likely policy/rubric risks, manual verification priorities, and what a human reviewer should inspect next.',
    'Prefer structured analyzer findings over weaker crawl-only inference when both are present.',
    'Be concise and specific.',
  ].join(' ');

  const userPrompt = [
    'Generate supplemental review feedback for the current template version.',
    '',
    'Output requirements:',
    '- Use exactly these headings: Scope, Likely Risks, Manual Checks.',
    '- Under each heading, use short dash bullets.',
    '- Keep the whole output under 1400 characters.',
    '- Mention uncertainty directly when evidence is incomplete.',
    '- If prior review history exists, call out recurring patterns briefly.',
    '- Prefer findings that map to submission requirements or rubric sections over generic observations.',
    '- Call out likely issues such as missing required pages, weak conversion design, typography/accessibility risks, empty or misleading links, trademark/logo misuse, library attachment risks, GSAP instruction/documentation gaps, ecommerce misconfiguration, licensing/asset concerns, Audit Panel failures, inconsistent naming/variables/components, or legacy interaction/custom-code risks when the evidence suggests them.',
    '- Do not recommend approval unless the evidence strongly suggests Good-or-better quality across all rubric areas; otherwise frame as reviewer checks and likely risk areas.',
    '',
    `Policy JSON:\n${JSON.stringify(TEMPLATE_REVIEW_POLICY, null, 2)}`,
    '',
    `Asset JSON:\n${JSON.stringify(serializeAsset(asset), null, 2)}`,
    '',
    `Current version JSON:\n${JSON.stringify(serializeVersion(currentVersion), null, 2)}`,
    '',
    `Prior versions JSON:\n${JSON.stringify(serializeHistory(history), null, 2)}`,
    '',
    `Analyzer review JSON:\n${JSON.stringify(serializeAnalyzerReport(analyzerReview), null, 2)}`,
    '',
    `Site crawl JSON:\n${JSON.stringify(serializePages(crawl), null, 2)}`,
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: args.model,
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = completionText(response.choices[0]?.message?.content);
  if (!text) {
    throw new Error('OpenAI returned an empty review draft.');
  }
  return formatFeedback(args.model, text);
}

function logCandidate(version: TemplateReviewVersion, asset: TemplateReviewAsset): void {
  const versionLabel = version.versionNumber ?? '?';
  console.log(`- ${asset.templateName} | ${version.versionId} | v${versionLabel} | ${version.reviewStatus ?? 'Unknown status'}`);
}

async function main() {
  const args = parseArgs();
  const airtableClient = new AirtableClient({
    apiKey: getAirtableApiKey(),
    baseId: process.env.AIRTABLE_BASE_ID?.trim() || DEFAULT_AIRTABLE_BASE_ID,
  });
  const openai = new OpenAI({
    apiKey: requireEnv('OPENAI_API_KEY'),
  });

  const versions = args.versionId
    ? [await airtableClient.getVersionById(args.versionId)]
    : await airtableClient.listVersionsForAgentFeedback({
        limit: args.limit,
        includeStatuses: args.statuses,
        includeExistingFeedback: args.overwrite,
        viewId: READY_FOR_REVIEW_VIEW_ID,
      });

  const candidates = versions.filter((version): version is TemplateReviewVersion => Boolean(version));
  if (candidates.length === 0) {
    console.log('No candidate Asset Versions matched the current filter.');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const version of candidates) {
    try {
      if (!version.assetId) {
        throw new Error(`Version ${version.versionId} is missing its linked asset id.`);
      }

      const asset = await airtableClient.getAssetById(version.assetId);
      if (!asset) {
        throw new Error(`Asset ${version.assetId} is not available in template-review scope.`);
      }

      if (version.agentReviewFeedback && !args.overwrite) {
        skipCount += 1;
        console.log(`Skipping ${version.versionId}; agent feedback already exists.`);
        continue;
      }

      logCandidate(version, asset);

      const history = (await airtableClient.listVersionsForAsset(asset.assetId, Math.max(args.historyLimit + 1, 5)))
        .filter((item) => item.versionId !== version.versionId)
        .slice(0, args.historyLimit);

      const siteUrl = asset.websiteUrl ?? asset.previewSiteUrl;
      let analyzerReview: AnalyzerReviewOutcome | null = null;
      let crawl: SiteCrawlResult | null = null;

      if (asset.previewSiteUrl && asset.websiteUrl) {
        analyzerReview = await runAnalyzerReview(args, asset);
        if (isAnalyzerFailure(analyzerReview)) {
          console.warn(`[template-review:agent-feedback] analyzer fallback for ${version.versionId}: ${analyzerReview.error}`);
        }
      }

      if (siteUrl && !args.skipCrawl && !analyzerReview?.ok) {
        try {
          crawl = await discoverSitePages(siteUrl, {
            maxPages: args.crawlMaxPages,
            maxDepth: args.crawlMaxDepth,
          });
        } catch (error) {
          crawl = {
            startUrl: siteUrl,
            discoveredPages: [],
            visitedCount: 0,
            maxDepth: args.crawlMaxDepth,
            maxPages: args.crawlMaxPages,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      const feedback = await generateFeedback(openai, args, asset, version, history, analyzerReview, crawl);

      if (args.dryRun) {
        console.log(feedback);
        console.log('');
      } else {
        await airtableClient.updateVersionReview(version.versionId, {
          agent_review_feedback: feedback,
        });
      }

      successCount += 1;
    } catch (error) {
      errorCount += 1;
      console.error(
        `[template-review:agent-feedback] ${version.versionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: errorCount === 0,
        processed: candidates.length,
        succeeded: successCount,
        skipped: skipCount,
        failed: errorCount,
        dryRun: args.dryRun,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
