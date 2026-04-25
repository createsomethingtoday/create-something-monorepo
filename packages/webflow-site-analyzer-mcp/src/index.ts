#!/usr/bin/env node

/**
 * Webflow Site Analyzer MCP Server
 * 
 * MCP server for analyzing Webflow sites - touchpoints, SEO, structure,
 * images, and performance metrics. Part of the CREATE SOMETHING intelligence layer.
 * 
 * Architecture:
 * - Database Layer: URL (the web pages are the source of truth)
 * - Automation Layer: MCP tools, versioned scripts, browser providers
 * - Intelligence Layer: Observability, feedback, self-improvement
 */

import { fileURLToPath } from 'node:url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { createProviderManager, type ProviderManager } from './providers/index.js';
import {
  initRegistry,
  createIntelligenceAnalyzer,
  type RegistryManager,
  type ExtractionFeedback,
  type FeedbackIssue
} from './versioning/index.js';
import {
  initAnalyzerObservability,
  createAnalysisTrace,
  createBrowserSpan,
  recordAnalysisMetrics,
  recordAnalysisError,
  recordSEOScore,
  recordImageOptimizationScore,
  recordTouchpointCount
} from './observability.js';
import {
  beginToolTrace,
  endToolTraceError,
  endToolTraceSuccess,
  initMcpTracing,
  shutdownMcpTracing,
} from './mcp-tracing.js';
import { getWebflowPolicySnapshot, refreshWebflowPolicySnapshot } from './policy/index.js';
import {
  createUnavailableDesignerChecklistReport,
  scoreDesignerChecklist
} from './checklist/designer-checklist.js';
import { TemplateReviewJobManager } from './template-review-jobs.js';
import { classifyUrls, type ClassifyOptions } from './url-classifier.js';
import { is404PageTitle } from './review-utils.js';
import {
  PUBLISHED_BROWSER_PROBE_SCRIPT,
  getPublishedBrowserProbeMode,
  getPublishedBrowserProbeSources,
  type PublishedPageEval
} from './published/browser-probe.js';
import { runPublishedFetchProbe } from './published/fetch-probe.js';
import { runPublishedResponsiveProbe } from './published/responsive-probe.js';
import type {
  TouchpointAnalysis,
  SEOAnalysis,
  PageStructure,
  ImageAnalysis,
  PerformanceMetrics,
  DesignerMetadata,
  DesignerChecklistReport,
  UnifiedReviewStatus,
  UnifiedReviewRow,
  UnifiedTemplateReviewReport,
  TemplateReviewJobRecord,
  TemplateReviewJobStatus,
  PublishedSnippetCrawlResult,
  PublishedSnippetIssueCounts,
  PublishedSnippetPageResult,
  PublishedSitePrecheckResult,
  RunTemplateReviewInput,
  EnqueueTemplateReviewInput,
  GetTemplateReviewJobInput,
  ListTemplateReviewJobsInput,
  AnalyzeTouchpointsInput,
  ExtractSEOInput,
  GetPageStructureInput,
  AnalyzeImagesInput,
  CaptureScreenshotInput,
  GetPerformanceInput,
  ExtractDesignerMetadataInput,
  ScoreDesignerChecklistInput
} from './types.js';

// =============================================================================
// Initialization
// =============================================================================

// Initialize observability
initAnalyzerObservability();
initMcpTracing();

// Create provider manager
let providerManager: ProviderManager | null = null;
let registry: RegistryManager | null = null;
let templateReviewJobs: TemplateReviewJobManager | null = null;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getApiKey(): string | null {
  const value =
    process.env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY?.trim() ??
    process.env.MCP_API_KEY?.trim() ??
    '';
  return value ? value : null;
}

function getRegistryPath(): string | undefined {
  const value = process.env.WEBFLOW_ANALYZER_REGISTRY_PATH?.trim();
  return value ? value : undefined;
}

function getAnalyzerRuntime(): string {
  return process.env.WEBFLOW_SITE_ANALYZER_RUNTIME?.trim() || 'node';
}

function isDirectWorkerRuntime(): boolean {
  return getAnalyzerRuntime() === 'worker';
}

function isRemoteSyncConstrainedRuntime(): boolean {
  const runtime = getAnalyzerRuntime();
  return runtime === 'worker' || runtime === 'container-worker';
}

function isBrowserAutomationSupported(): boolean {
  return !isDirectWorkerRuntime();
}

function assertBrowserAutomationSupported(toolName: string): void {
  if (isBrowserAutomationSupported()) return;
  throw new Error(
    `${toolName} is not supported on the Cloudflare Worker deployment. Use the local analyzer or a non-Worker host for browser-backed review execution.`,
  );
}

const REMOTE_SYNC_REVIEW_MAX_PAGES = 1;
const REMOTE_SYNC_REVIEW_MAX_DEPTH = 0;
const REMOTE_SYNC_REVIEW_MAX_TIMEOUT_MS = 45_000;

function getRunTemplateReviewSyncGuardError(input: RunTemplateReviewInput): string | null {
  if (!isRemoteSyncConstrainedRuntime() || input.allowLongSync) {
    return null;
  }

  const reasons: string[] = [];
  const designerMode = input.designerMode ?? 'best-effort';
  const timeout = input.timeout ?? 90_000;

  if (designerMode !== 'skip') {
    reasons.push(`designerMode=${designerMode}`);
  }

  if (input.crawlMaxPages === undefined) {
    reasons.push('crawlMaxPages=full-discovered-coverage');
  } else if (input.crawlMaxPages > REMOTE_SYNC_REVIEW_MAX_PAGES) {
    reasons.push(`crawlMaxPages=${input.crawlMaxPages}`);
  }

  if (input.crawlMaxDepth === undefined) {
    reasons.push('crawlMaxDepth=unbounded');
  } else if (input.crawlMaxDepth > REMOTE_SYNC_REVIEW_MAX_DEPTH) {
    reasons.push(`crawlMaxDepth=${input.crawlMaxDepth}`);
  }

  if (timeout > REMOTE_SYNC_REVIEW_MAX_TIMEOUT_MS) {
    reasons.push(`timeout=${timeout}`);
  }

  if (reasons.length === 0) {
    return null;
  }

  return [
    '`run_template_review` on the remote deployment is reserved for bounded smoke checks.',
    `This request is likely to outlive the synchronous transport (${reasons.join(', ')}).`,
    'Use `enqueue_template_review` + `get_template_review_job` for multi-page or preview-enabled reviews, or pass `allowLongSync=true` to force the synchronous path anyway.'
  ].join(' ');
}

function getProvider(): ProviderManager {
  if (!providerManager) {
    providerManager = createProviderManager();
  }
  return providerManager;
}

async function getScriptRegistry(): Promise<RegistryManager> {
  if (!registry) {
    registry = await initRegistry(getRegistryPath());
  }
  return registry;
}

function getTemplateReviewJobManager(): TemplateReviewJobManager {
  if (!templateReviewJobs) {
    templateReviewJobs = new TemplateReviewJobManager(executeTemplateReview, {
      concurrency: parsePositiveInt(process.env.WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS, 2),
      maxQueueSize: parsePositiveInt(process.env.WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE, 100),
    });
  }
  return templateReviewJobs;
}

// =============================================================================
// Versioned Script Execution Helper
// =============================================================================

interface VersionedExecutionResult<T> {
  data: T;
  versionId: string;
  durationMs: number;
}

async function executeVersionedScript<T>(
  scriptName: string,
  url: string,
  options?: { waitForSelector?: string; timeout?: number; waitForNavigation?: boolean }
): Promise<VersionedExecutionResult<T>> {
  const reg = await getScriptRegistry();
  const manager = getProvider();
  const provider = manager.getProvider();
  const startTime = Date.now();

  // Get versioned script (may use testing version for A/B)
  const { code, versionId } = reg.getScriptForExecution(scriptName);

  try {
    const data = await provider.analyze<T>(url, code, options);
    const durationMs = Date.now() - startTime;

    // Record metrics for this version
    await reg.recordExecution(versionId, true, durationMs, 
      typeof (data as Record<string, unknown>).totalCount === 'number' 
        ? (data as Record<string, number>).totalCount 
        : undefined
    );

    return { data, versionId, durationMs };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    await reg.recordExecution(versionId, false, durationMs);
    throw error;
  }
}

// =============================================================================
// Tool Handlers - Analysis (Automation Layer)
// =============================================================================

async function analyzeTouchpoints(input: AnalyzeTouchpointsInput): Promise<TouchpointAnalysis & { _version: string }> {
  const manager = getProvider();
  const provider = manager.getProvider();

  const trace = createAnalysisTrace({
    tool: 'analyze_touchpoints',
    url: input.url,
    provider: provider.name
  });

  const browserSpan = createBrowserSpan(trace, input.url);

  try {
    const { data, versionId, durationMs } = await executeVersionedScript<TouchpointAnalysis>(
      'touchpoints',
      input.url,
      {
        waitForSelector: input.waitForSelector,
        timeout: input.timeout
      }
    );

    browserSpan.end({ success: true, touchpointCount: data.totalCount, versionId });

    recordTouchpointCount(trace, data.totalCount);
    recordAnalysisMetrics(trace, {
      tool: 'analyze_touchpoints',
      url: input.url,
      provider: provider.name,
      durationMs,
      success: true,
      itemsExtracted: data.totalCount,
      browserMinutes: durationMs / 60000
    });

    manager.recordAnalysis(true, durationMs);
    return { ...data, _version: versionId };

  } catch (error) {
    browserSpan.end({ success: false, error: String(error) });
    recordAnalysisError(trace, 'analyze_touchpoints', error as Error, { url: input.url });
    manager.recordAnalysis(false, 0);
    throw error;
  }
}

async function extractSEO(input: ExtractSEOInput): Promise<SEOAnalysis & { _version: string }> {
  const manager = getProvider();
  const provider = manager.getProvider();

  const trace = createAnalysisTrace({
    tool: 'extract_seo',
    url: input.url,
    provider: provider.name,
    aiTaskType: 'analyze'
  });

  const browserSpan = createBrowserSpan(trace, input.url);

  try {
    const { data, versionId, durationMs } = await executeVersionedScript<SEOAnalysis>(
      'seo',
      input.url,
      { timeout: input.timeout }
    );

    browserSpan.end({ success: true, seoScore: data.score, versionId });

    recordSEOScore(trace, data.score);
    recordAnalysisMetrics(trace, {
      tool: 'extract_seo',
      url: input.url,
      provider: provider.name,
      durationMs,
      success: true,
      itemsExtracted: data.issues.length,
      browserMinutes: durationMs / 60000
    });

    manager.recordAnalysis(true, durationMs);
    return { ...data, _version: versionId };

  } catch (error) {
    browserSpan.end({ success: false, error: String(error) });
    recordAnalysisError(trace, 'extract_seo', error as Error, { url: input.url });
    manager.recordAnalysis(false, 0);
    throw error;
  }
}

async function getPageStructure(input: GetPageStructureInput): Promise<PageStructure & { _version: string }> {
  const manager = getProvider();
  const provider = manager.getProvider();

  const trace = createAnalysisTrace({
    tool: 'get_page_structure',
    url: input.url,
    provider: provider.name
  });

  const browserSpan = createBrowserSpan(trace, input.url);

  try {
    const { data, versionId, durationMs } = await executeVersionedScript<PageStructure>(
      'structure',
      input.url,
      { timeout: input.timeout }
    );

    browserSpan.end({ success: true, sectionCount: data.sections.length, versionId });

    recordAnalysisMetrics(trace, {
      tool: 'get_page_structure',
      url: input.url,
      provider: provider.name,
      durationMs,
      success: true,
      itemsExtracted: data.sections.length,
      browserMinutes: durationMs / 60000
    });

    manager.recordAnalysis(true, durationMs);
    return { ...data, _version: versionId };

  } catch (error) {
    browserSpan.end({ success: false, error: String(error) });
    recordAnalysisError(trace, 'get_page_structure', error as Error, { url: input.url });
    manager.recordAnalysis(false, 0);
    throw error;
  }
}

async function analyzeImages(input: AnalyzeImagesInput): Promise<ImageAnalysis & { _version: string }> {
  const manager = getProvider();
  const provider = manager.getProvider();

  const trace = createAnalysisTrace({
    tool: 'analyze_images',
    url: input.url,
    provider: provider.name
  });

  const browserSpan = createBrowserSpan(trace, input.url);

  try {
    const { data, versionId, durationMs } = await executeVersionedScript<ImageAnalysis>(
      'images',
      input.url,
      { timeout: input.timeout }
    );

    browserSpan.end({ success: true, imageCount: data.totalImages, versionId });

    recordImageOptimizationScore(trace, data.optimizationScore);
    recordAnalysisMetrics(trace, {
      tool: 'analyze_images',
      url: input.url,
      provider: provider.name,
      durationMs,
      success: true,
      itemsExtracted: data.totalImages,
      browserMinutes: durationMs / 60000
    });

    manager.recordAnalysis(true, durationMs);
    return { ...data, _version: versionId };

  } catch (error) {
    browserSpan.end({ success: false, error: String(error) });
    recordAnalysisError(trace, 'analyze_images', error as Error, { url: input.url });
    manager.recordAnalysis(false, 0);
    throw error;
  }
}

async function getPerformance(input: GetPerformanceInput): Promise<PerformanceMetrics & { _version: string }> {
  const manager = getProvider();
  const provider = manager.getProvider();

  const trace = createAnalysisTrace({
    tool: 'get_performance',
    url: input.url,
    provider: provider.name,
    aiTaskType: 'analyze'
  });

  const browserSpan = createBrowserSpan(trace, input.url);

  try {
    const { data, versionId, durationMs } = await executeVersionedScript<PerformanceMetrics>(
      'performance',
      input.url,
      { timeout: input.timeout, waitForNavigation: true }
    );

    browserSpan.end({ success: true, loadTime: data.loadTime, versionId });

    recordAnalysisMetrics(trace, {
      tool: 'get_performance',
      url: input.url,
      provider: provider.name,
      durationMs,
      success: true,
      browserMinutes: durationMs / 60000
    });

    manager.recordAnalysis(true, durationMs);
    return { ...data, _version: versionId };

  } catch (error) {
    browserSpan.end({ success: false, error: String(error) });
    recordAnalysisError(trace, 'get_performance', error as Error, { url: input.url });
    manager.recordAnalysis(false, 0);
    throw error;
  }
}

async function captureScreenshot(input: CaptureScreenshotInput): Promise<{ screenshot: string; format: string }> {
  const manager = getProvider();
  const provider = manager.getProvider();
  const startTime = Date.now();

  const trace = createAnalysisTrace({
    tool: 'capture_screenshot',
    url: input.url,
    provider: provider.name,
    aiTaskType: 'transform'
  });

  const browserSpan = createBrowserSpan(trace, input.url);

  try {
    const buffer = await provider.screenshot(input.url, {
      viewport: input.viewport,
      fullPage: input.fullPage,
      format: input.format,
      quality: input.quality
    });

    const durationMs = Date.now() - startTime;
    browserSpan.end({ success: true, sizeBytes: buffer.length });

    recordAnalysisMetrics(trace, {
      tool: 'capture_screenshot',
      url: input.url,
      provider: provider.name,
      durationMs,
      success: true,
      browserMinutes: durationMs / 60000
    });

    manager.recordAnalysis(true, durationMs);

    return {
      screenshot: buffer.toString('base64'),
      format: input.format || 'png'
    };

  } catch (error) {
    const durationMs = Date.now() - startTime;
    browserSpan.end({ success: false, error: String(error) });
    recordAnalysisError(trace, 'capture_screenshot', error as Error, { url: input.url });
    manager.recordAnalysis(false, durationMs);
    throw error;
  }
}

async function extractDesignerMetadata(input: ExtractDesignerMetadataInput): Promise<DesignerMetadata> {
  const manager = getProvider();
  const provider = manager.getProvider();
  const startTime = Date.now();

  const trace = createAnalysisTrace({
    tool: 'extract_designer_metadata',
    url: input.url,
    provider: provider.name,
    aiTaskType: 'analyze'
  });

  const browserSpan = createBrowserSpan(trace, input.url);

  try {
    // Use the specialized extractDesignerMetadata method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = await (provider as any).extractDesignerMetadata(input.url, input.timeout);

    const durationMs = Date.now() - startTime;

    // Build the full DesignerMetadata response
    const metadata: DesignerMetadata = {
      url: input.url,
      timestamp: new Date().toISOString(),
      siteName: rawData.siteName,
      sitePlan: rawData.sitePlan,
      
      pages: rawData.pages,
      totalPages: rawData.pages.length,
      
      styleClasses: rawData.styleClasses,
      totalClasses: rawData.styleClasses.length,
      globalClasses: rawData.styleClasses.filter((c: { isGlobal: boolean }) => c.isGlobal).length,
      customClasses: rawData.styleClasses.filter((c: { isGlobal: boolean }) => !c.isGlobal).length,
      
      components: rawData.components,
      totalComponents: rawData.components.length,
      unusedComponents: rawData.components.filter((c: { isUnused: boolean }) => c.isUnused).length,
      
      interactions: rawData.interactions,
      totalInteractions: rawData.interactions.length,
      
      cmsCollections: rawData.cmsCollections,
      totalCMSItems: rawData.cmsCollections.reduce((sum: number, c: { itemCount: number }) => sum + c.itemCount, 0),
      
      assets: rawData.assets,
      totalAssets: rawData.assets.length,
      
      breakpoints: rawData.breakpoints
    };

    browserSpan.end({ 
      success: true, 
      pagesCount: metadata.totalPages,
      classesCount: metadata.totalClasses,
      componentsCount: metadata.totalComponents
    });

    recordAnalysisMetrics(trace, {
      tool: 'extract_designer_metadata',
      url: input.url,
      provider: provider.name,
      durationMs,
      success: true,
      itemsExtracted: metadata.totalPages + metadata.totalClasses + metadata.totalComponents,
      browserMinutes: durationMs / 60000
    });

    manager.recordAnalysis(true, durationMs);
    return metadata;

  } catch (error) {
    const durationMs = Date.now() - startTime;
    browserSpan.end({ success: false, error: String(error) });
    recordAnalysisError(trace, 'extract_designer_metadata', error as Error, { url: input.url });
    manager.recordAnalysis(false, durationMs);
    throw error;
  }
}

async function scoreDesignerChecklistTool(input: ScoreDesignerChecklistInput): Promise<DesignerChecklistReport> {
  if (!input?.designerMetadata && !input?.url) {
    throw new Error('Provide either `url` (for live extraction) or `designerMetadata`.');
  }

  let metadata: DesignerMetadata;
  let source: DesignerChecklistReport['source'];

  if (input.designerMetadata) {
    metadata = input.designerMetadata;
    source = 'provided-metadata';
  } else {
    metadata = await extractDesignerMetadata({
      url: input.url as string,
      timeout: input.timeout
    });
    source = 'live-extraction';
  }

  return scoreDesignerChecklist(metadata, {
    includeManual: input.includeManual,
    source
  });
}

type PageAuditSummary = NonNullable<PublishedSnippetPageResult['summary']>;

type ProgressReporter = (progress: number, total: number, message: string) => Promise<void>;

type RunTemplateReviewOptions = {
  reportProgress?: ProgressReporter;
};

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : JSON.stringify(error);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(label)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Detect and repair the "every-s-to-space" text corruption that occurs when
 * a page uses a web font whose "s" glyph is missing or zero-width and the
 * extraction layer uses innerText (rendering-dependent) instead of textContent.
 *
 * Detection heuristic: if a string contains at least 2 instances of a lowercase
 * letter followed by a space followed by a lowercase letter where inserting "s"
 * back produces a known English word fragment, we consider it corrupted.
 *
 * Applied to audit payloads from __wfReview before they enter our pipeline.
 */
function detectSCorruption(sample: string): boolean {
  // Known fragments that appear corrupted: "de cription" (description),
  // "di play" (display), "tab " (tabs), "cla s" (class), "http :" (https:),
  // "ub cri" (subscri), "po t" (post).
  const knownCorrupted = [
    'de cription', 'di play', 'tab ', 'cla s', 'http :', 'ub cri',
    'po t', 'ub mit', 'e ion', 'e ign', 'e arch', 'tyle '
  ];
  let hits = 0;
  const lower = sample.toLowerCase();
  for (const fragment of knownCorrupted) {
    if (lower.includes(fragment)) hits++;
  }
  return hits >= 2;
}

function repairSCorruption(text: string): string {
  // If the string already contains a real "s", it's not corrupted
  if (/s/i.test(text)) return text;

  // Must contain at least one known corruption fragment to proceed
  const knownFragments = [
    'de cription', 'di play', 'ub cri', 'ub mit', 'tab ', 'cla ',
    'http :', 'po t', 'e ign', 'e ion', 'e arch', 'tyle ',
    'item ', 'image ', 'cript', 'lider', 'ection', 'croll',
    'u ic', 'pon or', 'peaker', 'pon e', 'peed', 'tatu '
  ];
  const lower = text.toLowerCase();
  if (!knownFragments.some((f) => lower.includes(f))) return text;

  return text
    .replace(/([a-z]) ([a-z])/g, '$1s$2')
    .replace(/([a-z]) ([-:,)])/g, '$1s$2')
    .replace(/([a-z]) $/g, '$1s');
}

function sanitizeAuditPayload(raw: unknown): unknown {
  if (raw == null || typeof raw !== 'object') return raw;

  const json = JSON.stringify(raw);
  if (!detectSCorruption(json)) return raw;

  // Walk the object tree and repair string values
  function walk(value: unknown): unknown {
    if (typeof value === 'string') {
      return repairSCorruption(value);
    }
    if (Array.isArray(value)) {
      return value.map(walk);
    }
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        result[key] = walk(val);
      }
      return result;
    }
    return value;
  }

  return walk(raw);
}

function normalizeCrawlUrl(rawUrl: string, origin: string): string | null {
  try {
    const parsed = new URL(rawUrl, origin);
    if (parsed.origin !== origin) return null;
    if (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:' || parsed.protocol === 'javascript:') return null;
    parsed.hash = '';
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    return `${parsed.origin}${path}${parsed.search}`;
  } catch {
    return null;
  }
}

function comparableSameOriginUrl(rawUrl: string, origin: string): string | null {
  const normalized = normalizeCrawlUrl(rawUrl, origin);
  return normalized ? normalized.toLowerCase().replace(/\/$/, '') : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asFiniteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function summarizePublishedPageAudit(audit: unknown): PageAuditSummary {
  const root = asRecord(audit);
  const meta = asRecord(root.meta);
  const headingsRoot = asRecord(root.headings);
  const headings = asRecord(headingsRoot.summary);
  const linksRoot = asRecord(root.links);
  const links = asRecord(linksRoot.summary);
  const imagesRoot = asRecord(root.images);
  const images = asRecord(imagesRoot.summary);
  const formsRoot = asRecord(root.forms);
  const forms = asRecord(formsRoot.summary);
  const structureRoot = asRecord(root.structure);
  const structure = asRecord(structureRoot.summary);
  const mediaRoot = asRecord(root.media);
  const media = asRecord(mediaRoot.summary);
  const accessibilityRoot = asRecord(root.accessibility);
  const accessibility = asRecord(accessibilityRoot.summary);
  const assetsRoot = asRecord(root.assets);
  const assets = asRecord(assetsRoot.summary);
  const interactions = asRecord(root.interactions);
  const ix2 = asRecord(interactions.ix2);
  const ix3 = asRecord(interactions.ix3);
  const ix2Summary = asRecord(ix2.summary);
  const ix3Summary = asRecord(ix3.summary);
  const imageFormats = asRecord(imagesRoot.formats);

  const metaMissing = asStringArray(meta.missing);
  const hasCanonical = Boolean(meta.hasCanonical);
  const hasStructuredData = Boolean(meta.hasStructuredData);
  const hasAriaLandmarks = Boolean(meta.hasAriaLandmarks);
  const failReasons: string[] = [];

  if (metaMissing.length > 0) failReasons.push(`meta_missing:${metaMissing.join(',')}`);
  if (Boolean(headings.missingH1)) failReasons.push('missing_h1');
  if (Boolean(headings.multipleH1)) failReasons.push('multiple_h1');
  if (asFiniteNumber(headings.skippedHeadingLevels) > 0) {
    failReasons.push(`skipped_heading_levels:${asFiniteNumber(headings.skippedHeadingLevels)}`);
  }
  if (asFiniteNumber(headings.emptyHeadings) > 0) {
    failReasons.push(`empty_headings:${asFiniteNumber(headings.emptyHeadings)}`);
  }
  if (asFiniteNumber(images.images) > 0 && asFiniteNumber(images.missingAlt) > 0) {
    failReasons.push(`images_missing_alt:${asFiniteNumber(images.missingAlt)}`);
  }
  if (asFiniteNumber(links.blankTargetMissingRel) > 0) {
    failReasons.push(`blank_target_missing_rel:${asFiniteNumber(links.blankTargetMissingRel)}`);
  }
  if (asFiniteNumber(links.missingAccessibleName) > 0) {
    failReasons.push(`links_missing_accessible_name:${asFiniteNumber(links.missingAccessibleName)}`);
  }
  if (asFiniteNumber(links.emptyHref) > 0) {
    failReasons.push(`links_empty_href:${asFiniteNumber(links.emptyHref)}`);
  }
  if (asFiniteNumber(links.placeholderHref) > 0) {
    failReasons.push(`links_placeholder_href:${asFiniteNumber(links.placeholderHref)}`);
  }
  if (asFiniteNumber(images.missingDimensions) > 0) {
    failReasons.push(`images_missing_dimensions:${asFiniteNumber(images.missingDimensions)}`);
  }
  if (asFiniteNumber(images.aboveFoldLazy) > 0) {
    failReasons.push(`images_above_fold_lazy:${asFiniteNumber(images.aboveFoldLazy)}`);
  }
  if (asFiniteNumber(forms.missingLabels) > 0) {
    failReasons.push(`forms_missing_labels:${asFiniteNumber(forms.missingLabels)}`);
  }
  if (asFiniteNumber(media.autoplayWithoutControls) > 0) {
    failReasons.push(`media_autoplay_without_controls:${asFiniteNumber(media.autoplayWithoutControls)}`);
  }
  if (asFiniteNumber(media.backgroundVideosMissingControl) > 0) {
    failReasons.push(
      `bg_video_missing_controls:${asFiniteNumber(media.backgroundVideosMissingControl)}`
    );
  }

  return {
    failCount: failReasons.length,
    failReasons,
    metaMissing,
    headings: {
      headings: asFiniteNumber(headings.headings),
      h1: asFiniteNumber(headings.h1),
      missingH1: Boolean(headings.missingH1),
      multipleH1: Boolean(headings.multipleH1),
      skippedHeadingLevels: asFiniteNumber(headings.skippedHeadingLevels),
      emptyHeadings: asFiniteNumber(headings.emptyHeadings)
    },
    links: {
      links: asFiniteNumber(links.links),
      emptyHref: asFiniteNumber(links.emptyHref),
      placeholderHref: asFiniteNumber(links.placeholderHref),
      blankTargetMissingRel: asFiniteNumber(links.blankTargetMissingRel),
      missingAccessibleName: asFiniteNumber(links.missingAccessibleName)
    },
    images: {
      images: asFiniteNumber(images.images),
      missingAlt: asFiniteNumber(images.missingAlt),
      missingDimensions: asFiniteNumber(images.missingDimensions),
      aboveFoldLazy: asFiniteNumber(images.aboveFoldLazy),
      belowFoldNotLazy: asFiniteNumber(images.belowFoldNotLazy)
    },
    imageFormats: Object.fromEntries(
      Object.entries(imageFormats).map(([key, value]) => [key, asFiniteNumber(value)])
    ),
    forms: {
      fields: asFiniteNumber(forms.fields),
      missingLabels: asFiniteNumber(forms.missingLabels),
      wrongFieldTypes: asFiniteNumber(forms.wrongFieldTypes),
      sampleWrongFieldTypes: asStringArray(forms.sampleWrongFieldTypes)
    },
    structure: {
      hasNav: Boolean(structure.hasNav),
      hasFooter: Boolean(structure.hasFooter),
      ctaCount: asFiniteNumber(structure.ctaCount)
    },
    media: {
      videos: asFiniteNumber(media.videos),
      autoplayWithoutControls: asFiniteNumber(media.autoplayWithoutControls),
      backgroundVideosMissingControl: asFiniteNumber(media.backgroundVideosMissingControl)
    },
    ix2: {
      events: asFiniteNumber(ix2Summary.events),
      actionLists: asFiniteNumber(ix2Summary.actionLists),
      usedActionLists: asFiniteNumber(ix2Summary.usedActionLists),
      unusedActionLists: asFiniteNumber(ix2Summary.unusedActionLists),
      missingTargets: asFiniteNumber(ix2Summary.missingTargets),
      missingActionLists: asFiniteNumber(ix2Summary.missingActionLists)
    },
    ix3: {
      interactions: asFiniteNumber(ix3Summary.interactions),
      timelines: asFiniteNumber(ix3Summary.timelines),
      missingTimelines: asFiniteNumber(ix3Summary.missingTimelines),
      deletedInteractions: asFiniteNumber(ix3Summary.deletedInteractions),
      missingTargetSelectors: asFiniteNumber(ix3Summary.missingTargetSelectors)
    },
    comboClassDepth: (() => {
      const cc = asRecord(root.comboClassDepth);
      return cc.maxDepth != null ? {
        maxDepth: asFiniteNumber(cc.maxDepth),
        maxDepthSelector: typeof cc.maxDepthSelector === 'string' ? cc.maxDepthSelector : '',
        sampled: asFiniteNumber(cc.sampled)
      } : null;
    })(),
    states: (() => {
      const states = asRecord(root.states);
      return states.hoverSelectors != null ? {
        hoverSelectors: asFiniteNumber(states.hoverSelectors),
        focusSelectors: asFiniteNumber(states.focusSelectors),
        focusVisibleSelectors: asFiniteNumber(states.focusVisibleSelectors),
        activeSelectors: asFiniteNumber(states.activeSelectors)
      } : null;
    })(),
    transitions: (() => {
      const t = asRecord(root.transitions);
      return t.totalInteractive != null ? {
        totalInteractive: asFiniteNumber(t.totalInteractive),
        withTransition: asFiniteNumber(t.withTransition),
        withoutTransition: asFiniteNumber(t.withoutTransition),
        ratio: asFiniteNumber(t.ratio),
        withSpecificTransition: asFiniteNumber(t.withSpecificTransition),
        withTransitionAll: asFiniteNumber(t.withTransitionAll),
        gpuFriendlyTransitions: asFiniteNumber(t.gpuFriendlyTransitions),
        expensiveTransitions: asFiniteNumber(t.expensiveTransitions),
        maxDurationMs: asFiniteNumber(t.maxDurationMs),
        averageDurationMs: asFiniteNumber(t.averageDurationMs)
      } : null;
    })(),
    contrast: (() => {
      const c = asRecord(root.contrast);
      return c.checked != null ? {
        checked: asFiniteNumber(c.checked),
        pass: asFiniteNumber(c.pass),
        fail: asFiniteNumber(c.fail),
        passRate: asFiniteNumber(c.passRate)
      } : null;
    })(),
    accessibility: accessibility.hasMainLandmark != null ? {
      hasMainLandmark: Boolean(accessibility.hasMainLandmark),
      hasNavLandmark: Boolean(accessibility.hasNavLandmark),
      hasSkipLink: Boolean(accessibility.hasSkipLink),
      genericLinkLabels: asFiniteNumber(accessibility.genericLinkLabels),
      sampleGenericLinkLabels: asStringArray(accessibility.sampleGenericLinkLabels)
    } : null,
    assets: assets.responsiveImages != null ? {
      responsiveImages: asFiniteNumber(assets.responsiveImages),
      imagesWithSrcset: asFiniteNumber(assets.imagesWithSrcset),
      imagesWithSizes: asFiniteNumber(assets.imagesWithSizes),
      navLogoImages: asFiniteNumber(assets.navLogoImages)
    } : null,
    styles: (() => {
      const styles = asRecord(root.styles);
      return styles.accessibleStyleSheets != null ? {
        accessibleStyleSheets: asFiniteNumber(styles.accessibleStyleSheets),
        blockedStyleSheets: asFiniteNumber(styles.blockedStyleSheets),
        mediaRules: asFiniteNumber(styles.mediaRules),
        breakpointHints: asStringArray(styles.breakpointHints),
        definedVariables: asFiniteNumber(styles.definedVariables),
        usedVariables: asFiniteNumber(styles.usedVariables),
        variableCategories: asStringArray(styles.variableCategories),
        baseTagRules: asFiniteNumber(styles.baseTagRules),
        baseTagVariableRules: asFiniteNumber(styles.baseTagVariableRules),
        componentVariantSelectors: asFiniteNumber(styles.componentVariantSelectors),
        sampleVariables: asStringArray(styles.sampleVariables),
        sampleBaseTagSelectors: asStringArray(styles.sampleBaseTagSelectors),
        sampleComponentVariantSelectors: asStringArray(styles.sampleComponentVariantSelectors)
      } : null;
    })()
  };
}

function mergeMetaDiagnosticsIntoSummary(
  summary: PageAuditSummary,
  extraMissing: string[]
): PageAuditSummary {
  if (extraMissing.length === 0) return summary;
  const mergedMissing = Array.from(new Set([...summary.metaMissing, ...extraMissing]));
  if (
    mergedMissing.length === summary.metaMissing.length &&
    mergedMissing.every((value, index) => value === summary.metaMissing[index])
  ) {
    return summary;
  }

  const failReasons = summary.failReasons.filter((reason) => !reason.startsWith('meta_missing:'));
  if (mergedMissing.length > 0) {
    failReasons.unshift(`meta_missing:${mergedMissing.join(',')}`);
  }

  return {
    ...summary,
    metaMissing: mergedMissing,
    failReasons,
    failCount: failReasons.length
  };
}

function mergeStyleSignalsIntoSummary(
  summary: PageAuditSummary,
  styleSignals: PublishedPageEval['styleSignals']
): PageAuditSummary {
  if (!styleSignals || styleSignals.accessibleStyleSheets == null) return summary;
  return {
    ...summary,
    styles: {
      accessibleStyleSheets: asFiniteNumber(styleSignals.accessibleStyleSheets),
      blockedStyleSheets: asFiniteNumber(styleSignals.blockedStyleSheets),
      mediaRules: asFiniteNumber(styleSignals.mediaRules),
      breakpointHints: asStringArray(styleSignals.breakpointHints),
      definedVariables: asFiniteNumber(styleSignals.definedVariables),
      usedVariables: asFiniteNumber(styleSignals.usedVariables),
      variableCategories: asStringArray(styleSignals.variableCategories),
      baseTagRules: asFiniteNumber(styleSignals.baseTagRules),
      baseTagVariableRules: asFiniteNumber(styleSignals.baseTagVariableRules),
      componentVariantSelectors: asFiniteNumber(styleSignals.componentVariantSelectors),
      sampleVariables: asStringArray(styleSignals.sampleVariables),
      sampleBaseTagSelectors: asStringArray(styleSignals.sampleBaseTagSelectors),
      sampleComponentVariantSelectors: asStringArray(styleSignals.sampleComponentVariantSelectors)
    }
  };
}

function mergeStructureSignalsIntoSummary(
  summary: PageAuditSummary,
  structureSignals: PublishedPageEval['structureSignals']
): PageAuditSummary {
  if (!structureSignals) return summary;
  return {
    ...summary,
    structure: {
      hasNav: Boolean(structureSignals.hasNav),
      hasFooter: Boolean(structureSignals.hasFooter),
      ctaCount: asFiniteNumber(structureSignals.ctaCount)
    }
  };
}

function mergeStateSignalsIntoSummary(
  summary: PageAuditSummary,
  stateSignals: PublishedPageEval['stateSignals']
): PageAuditSummary {
  if (!stateSignals) return summary;
  return {
    ...summary,
    states: {
      hoverSelectors: asFiniteNumber(stateSignals.hoverSelectors),
      focusSelectors: asFiniteNumber(stateSignals.focusSelectors),
      focusVisibleSelectors: asFiniteNumber(stateSignals.focusVisibleSelectors),
      activeSelectors: asFiniteNumber(stateSignals.activeSelectors)
    },
    transitions: {
      totalInteractive: asFiniteNumber(stateSignals.interactiveElements),
      withTransition: asFiniteNumber(stateSignals.interactiveWithTransition),
      withoutTransition: Math.max(
        0,
        asFiniteNumber(stateSignals.interactiveElements) -
          asFiniteNumber(stateSignals.interactiveWithTransition)
      ),
      ratio: asFiniteNumber(stateSignals.interactiveElements) > 0
        ? asFiniteNumber(stateSignals.interactiveWithTransition) /
          asFiniteNumber(stateSignals.interactiveElements)
        : 0,
      withSpecificTransition: asFiniteNumber(stateSignals.interactiveWithSpecificTransition),
      withTransitionAll: asFiniteNumber(stateSignals.interactiveWithTransitionAll),
      gpuFriendlyTransitions: asFiniteNumber(stateSignals.interactiveGpuFriendlyTransitions),
      expensiveTransitions: asFiniteNumber(stateSignals.interactiveExpensiveTransitions),
      maxDurationMs: asFiniteNumber(stateSignals.maxTransitionDurationMs),
      averageDurationMs: asFiniteNumber(stateSignals.averageTransitionDurationMs)
    }
  };
}

function mergeAccessibilitySignalsIntoSummary(
  summary: PageAuditSummary,
  accessibilitySignals: PublishedPageEval['accessibilitySignals']
): PageAuditSummary {
  if (!accessibilitySignals) return summary;
  return {
    ...summary,
    accessibility: {
      hasMainLandmark: Boolean(accessibilitySignals.hasMainLandmark),
      hasNavLandmark: Boolean(accessibilitySignals.hasNavLandmark),
      hasSkipLink: Boolean(accessibilitySignals.hasSkipLink),
      genericLinkLabels: asFiniteNumber(accessibilitySignals.genericLinkLabels),
      sampleGenericLinkLabels: asStringArray(accessibilitySignals.sampleGenericLinkLabels)
    }
  };
}

function mergeAssetSignalsIntoSummary(
  summary: PageAuditSummary,
  assetSignals: PublishedPageEval['assetSignals']
): PageAuditSummary {
  if (!assetSignals) return summary;
  return {
    ...summary,
    assets: {
      responsiveImages: asFiniteNumber(assetSignals.responsiveImages),
      imagesWithSrcset: asFiniteNumber(assetSignals.imagesWithSrcset),
      imagesWithSizes: asFiniteNumber(assetSignals.imagesWithSizes),
      navLogoImages: asFiniteNumber(assetSignals.navLogoImages)
    }
  };
}

function mergeFormSignalsIntoSummary(
  summary: PageAuditSummary,
  formSignals: PublishedPageEval['formSignals']
): PageAuditSummary {
  if (!formSignals) return summary;
  return {
    ...summary,
    forms: summary.forms ? {
      ...summary.forms,
      wrongFieldTypes: asFiniteNumber(formSignals.wrongFieldTypes),
      sampleWrongFieldTypes: asStringArray(formSignals.sampleWrongFieldTypes)
    } : {
      fields: 0,
      missingLabels: 0,
      wrongFieldTypes: asFiniteNumber(formSignals.wrongFieldTypes),
      sampleWrongFieldTypes: asStringArray(formSignals.sampleWrongFieldTypes)
    }
  };
}

function emptyIssueCounts(): PublishedSnippetIssueCounts & { imagesBelowFoldNotLazy: number } {
  return {
    metaMissing: 0,
    missingH1: 0,
    multipleH1: 0,
    skippedHeadingLevels: 0,
    imagesMissingAlt: 0,
    linksMissingRel: 0,
    linksMissingAccessibleName: 0,
    linksEmptyHref: 0,
    linksPlaceholderHref: 0,
    imagesMissingDimensions: 0,
    imagesAboveFoldLazy: 0,
    formsMissingLabels: 0,
    autoplayWithoutControls: 0,
    backgroundVideosMissingControl: 0,
    imagesBelowFoldNotLazy: 0
  };
}

function snapshotProviderMetrics(provider: ReturnType<ProviderManager['getProvider']>) {
  return provider.getSessionMetrics();
}

function diffProviderMetrics(
  before: ReturnType<ReturnType<ProviderManager['getProvider']>['getSessionMetrics']>,
  after: ReturnType<ReturnType<ProviderManager['getProvider']>['getSessionMetrics']>
) {
  const sessionsCreated = after.sessionsCreated - before.sessionsCreated;
  const sessionsClosed = after.sessionsClosed - before.sessionsClosed;
  const sessionErrors = after.sessionErrors - before.sessionErrors;
  const totalDurationMs = after.totalDurationMs - before.totalDurationMs;
  const pageLoadsCompleted = after.pageLoadsCompleted - before.pageLoadsCompleted;
  const pageLoadErrors = after.pageLoadErrors - before.pageLoadErrors;

  return {
    sessionsCreated,
    sessionsClosed,
    sessionErrors,
    totalDurationMs,
    averageDurationMs: sessionsCreated > 0 ? totalDurationMs / sessionsCreated : 0,
    pageLoadsCompleted,
    pageLoadErrors,
    browserMinutes: totalDurationMs / 60000
  };
}

async function crawlPublishedWebMcp(
  publishedUrl: string,
  options: {
    timeout?: number;
    crawlMaxPages?: number;
    crawlMaxDepth?: number;
    seedUrls?: string[];
    fetchProbe?: PublishedSitePrecheckResult['probe'];
    /** URL classifications from precheck (attached to each crawled page result). */
    classifiedUrls?: import('./types.js').ClassifiedUrl[];
    onProgress?: (processedPages: number, maxPages: number, message: string) => Promise<void>;
  } = {}
): Promise<PublishedSnippetCrawlResult> {
  const manager = getProvider();
  const provider = manager.getProvider();
  const timeout = options.timeout ?? 90000;
  // Every page must be crawled to validate against the review rubric.
  // Default: no cap.  Most templates have 15-40 pages; even 50 pages
  // completes within the 5-minute timeout at ~5s/page.
  const maxPages = options.crawlMaxPages ?? Infinity;
  // No depth limit by default — crawl every reachable page for full coverage.
  const maxDepth = options.crawlMaxDepth ?? Infinity;
  const origin = new URL(publishedUrl).origin;
  const startUrl = normalizeCrawlUrl(publishedUrl, origin) || `${origin}/`;
  const seedUrls = (options.seedUrls || [])
    .map((url) => normalizeCrawlUrl(url, origin))
    .filter((url): url is string => Boolean(url));
  // Prioritize critical utility pages so they're crawled before the maxPages
  // cap is hit.  These pages are required for review checks (license text,
  // instructions, changelog) and must not be dropped.
  const criticalPatterns = ['/license', '/instruction', '/changelog', '/style-guide'];
  const prioritySeedUrls = seedUrls.filter((url) => {
    const path = new URL(url).pathname.toLowerCase();
    return criticalPatterns.some((p) => path.includes(p));
  });
  const nonPrioritySeedUrls = seedUrls.filter((url) => !prioritySeedUrls.includes(url));
  const initialUrls = [
    startUrl,
    ...prioritySeedUrls.filter((url) => url !== startUrl),
    ...nonPrioritySeedUrls.filter((url) => url !== startUrl)
  ];
  const queue: Array<{ url: string; depth: number }> = initialUrls.map((url, index) => ({
    url,
    depth: index === 0 ? 0 : 1
  }));
  const seen = new Set<string>(initialUrls);
  const pages: PublishedSnippetPageResult[] = [];
  // Build classification lookup for tagging crawled pages
  const classificationMap = new Map(
    (options.classifiedUrls || []).map((c) => [c.url, c.classification])
  );

  let snippetVersion: string | null = null;
  let snippetTools: string[] = [];
  let sitemapStatus: PublishedSnippetCrawlResult['sitemapStatus'] = {
    ok: false,
    error: 'Sitemap check was not executed'
  };
  let audit404: PublishedSnippetCrawlResult['audit404'] = {
    ok: false,
    error: '404 audit was not executed'
  };
  const browserProbeSurfaces = new Set<string>(['browser-dom']);
  const session = provider.openSession
    ? await provider.openSession({
        url: startUrl,
        options: {
          timeout,
          waitForNavigation: false
        }
      })
    : null;

  try {
    while (queue.length > 0 && pages.length < maxPages) {
      const current = queue.shift();
      if (!current) break;

      const pageResult: PublishedSnippetPageResult = {
        url: current.url,
        depth: current.depth,
        title: null,
        statusCode: null,
        classification: classificationMap.get(current.url),
        hasSnippet: false,
        snippetVersion: null,
        probeMode: 'dom-fallback',
        probeSources: ['browser-dom'],
        internalLinks: [],
        hasRequiredLicenseText: null,
        error: null,
        summary: null
      };

      try {
        let raw: PublishedPageEval;
        if (session) {
          if (session.getPageUrl() !== current.url) {
            await session.goto(current.url, {
              timeout,
              waitForNavigation: false
            });
          }
          raw = await session.evaluate<PublishedPageEval>(PUBLISHED_BROWSER_PROBE_SCRIPT, {
            target: 'main',
            timeout
          });
        } else {
          raw = await provider.analyze<PublishedPageEval>(current.url, PUBLISHED_BROWSER_PROBE_SCRIPT, {
            timeout,
            waitForNavigation: false
          });
        }

        pageResult.title = raw?.title ?? null;
        pageResult.hasSnippet = Boolean(raw?.hasSnippet);
        pageResult.snippetVersion = raw?.snippetVersion ?? null;
        const probeMode = getPublishedBrowserProbeMode(raw || {});
        pageResult.probeMode = probeMode;
        pageResult.probeSources = getPublishedBrowserProbeSources(probeMode);
        for (const surface of pageResult.probeSources) {
          browserProbeSurfaces.add(surface);
        }
        pageResult.hasRequiredLicenseText =
          typeof raw?.hasRequiredLicenseText === 'boolean' ? raw.hasRequiredLicenseText : null;
        if (raw?.policyChecks) {
          pageResult.policyChecks = {
            hasPoweredByWebflow: Boolean(raw.policyChecks.hasPoweredByWebflow),
            affiliateLinks: Array.isArray(raw.policyChecks.affiliateLinks) ? raw.policyChecks.affiliateLinks : [],
            hasGsap: Boolean(raw.policyChecks.hasGsap),
            hasCustomCode: Boolean(raw.policyChecks.hasCustomCode)
          };
        }
        if (raw?.contentQuality) {
          pageResult.contentQuality = {
            hasLoremIpsum: Boolean(raw.contentQuality.hasLoremIpsum),
            hasPlaceholderText: Boolean(raw.contentQuality.hasPlaceholderText)
          };
        }
        if (raw?.siteSettings) {
          pageResult.siteSettings = {
            hasCustomFavicon: Boolean(raw.siteSettings.hasCustomFavicon),
            hasCustomWebclip: Boolean(raw.siteSettings.hasCustomWebclip),
            hasCustomFonts: Boolean(raw.siteSettings.hasCustomFonts),
            customFontSources: Array.isArray(raw.siteSettings.customFontSources) ? raw.siteSettings.customFontSources : [],
            detectedApps: Array.isArray(raw.siteSettings.detectedApps) ? raw.siteSettings.detectedApps : []
          };
        }

        if (pageResult.hasSnippet) {
          if (!snippetVersion) snippetVersion = raw?.snippetVersion ?? null;
          if (snippetTools.length === 0 && Array.isArray(raw?.tools)) {
            snippetTools = raw.tools.map((tool) => String(tool));
          }

          if (sitemapStatus.error === 'Sitemap check was not executed' || sitemapStatus.ok === false) {
            const sitemapRecord = asRecord(raw?.sitemap);
            if (typeof sitemapRecord.error === 'string') {
              sitemapStatus = { ok: false, error: sitemapRecord.error };
            } else {
              sitemapStatus = { ok: true, count: asFiniteNumber(sitemapRecord.count) };
            }
          }

          if ((audit404 as { error?: string }).error === '404 audit was not executed') {
            const a404Record = asRecord(raw?.audit404);
            if (typeof a404Record.error === 'string') {
              audit404 = { ok: false, error: a404Record.error };
            } else {
              audit404 = {
                ok: Boolean(a404Record.ok),
                status: asFiniteNumber(a404Record.status),
                title: typeof a404Record.title === 'string' ? a404Record.title : null,
                navCount: asFiniteNumber(a404Record.navCount),
                linkCount: asFiniteNumber(a404Record.linkCount),
                h1Count: asFiniteNumber(a404Record.h1Count)
              };
            }
          }

          if (typeof raw?.auditError === 'string' && raw.auditError) {
            pageResult.error = raw.auditError;
          } else {
            // Sanitize audit payload to repair "s→space" font corruption
            pageResult.summary = summarizePublishedPageAudit(sanitizeAuditPayload(raw?.audit));
          }
        } else if (raw?.audit) {
          // DOM fallback audit is available even without __wfReview
          pageResult.summary = summarizePublishedPageAudit(sanitizeAuditPayload(raw.audit));
        } else {
          pageResult.error = 'window.__wfReview is not available and DOM fallback failed';
        }

        const deterministicMetaMissing = asStringArray(raw?.metaDiagnostics?.missing);
        if (pageResult.summary && deterministicMetaMissing.length > 0) {
          pageResult.summary = mergeMetaDiagnosticsIntoSummary(
            pageResult.summary,
            deterministicMetaMissing
          );
        }
        if (pageResult.summary && raw?.styleSignals) {
          pageResult.summary = mergeStyleSignalsIntoSummary(pageResult.summary, raw.styleSignals);
        }
        if (pageResult.summary && raw?.structureSignals) {
          pageResult.summary = mergeStructureSignalsIntoSummary(
            pageResult.summary,
            raw.structureSignals
          );
        }
        if (pageResult.summary && raw?.stateSignals) {
          pageResult.summary = mergeStateSignalsIntoSummary(pageResult.summary, raw.stateSignals);
        }
        if (pageResult.summary && raw?.accessibilitySignals) {
          pageResult.summary = mergeAccessibilitySignalsIntoSummary(
            pageResult.summary,
            raw.accessibilitySignals
          );
        }
        if (pageResult.summary && raw?.assetSignals) {
          pageResult.summary = mergeAssetSignalsIntoSummary(pageResult.summary, raw.assetSignals);
        }
        if (pageResult.summary && raw?.formSignals) {
          pageResult.summary = mergeFormSignalsIntoSummary(pageResult.summary, raw.formSignals);
        }

        const rawLinks = Array.isArray(raw?.links) ? raw.links : [];
        const normalizedLinks = Array.from(
          new Set(
            rawLinks
              .map((candidate) => normalizeCrawlUrl(String(candidate), origin))
              .filter((link): link is string => Boolean(link))
          )
        );
        pageResult.internalLinks = normalizedLinks;
        if (current.depth < maxDepth) {
          for (const normalized of normalizedLinks) {
            if (seen.has(normalized)) continue;
            seen.add(normalized);
            queue.push({ url: normalized, depth: current.depth + 1 });
          }
        }
      } catch (error) {
        pageResult.error = error instanceof Error ? error.message : String(error);
      }

      pages.push(pageResult);
      if (options.onProgress) {
        await options.onProgress(
          pages.length,
          maxPages,
          `Published crawl: ${pages.length}/${maxPages} pages (${current.url})`
        );
      }
    }
  } finally {
    await session?.close();
  }

  const issueCounts = emptyIssueCounts();
  for (const page of pages) {
    if (!page.summary) continue;
    // Skip 404/error pages from issue aggregation — they inflate per-page
    // counts when the crawler visits non-existent paths (e.g. /license vs
    // /utility/license both resolve but the bare path returns the 404 page).
    const pageTitle = (page.title || '').toLowerCase();
    if (
      pageTitle === 'not found' ||
      pageTitle === '404' ||
      pageTitle.startsWith('404 ') ||
      pageTitle.includes('page not found')
    ) {
      continue;
    }
    const summary = page.summary;
    if (summary.metaMissing.length > 0) issueCounts.metaMissing += 1;
    if (summary.headings?.missingH1) issueCounts.missingH1 += 1;
    if (summary.headings?.multipleH1) issueCounts.multipleH1 += 1;
    if ((summary.headings?.skippedHeadingLevels || 0) > 0) issueCounts.skippedHeadingLevels += 1;
    if ((summary.images?.missingAlt || 0) > 0) issueCounts.imagesMissingAlt += 1;
    if ((summary.links?.blankTargetMissingRel || 0) > 0) issueCounts.linksMissingRel += 1;
    if ((summary.links?.missingAccessibleName || 0) > 0) issueCounts.linksMissingAccessibleName += 1;
    if ((summary.links?.emptyHref || 0) > 0) issueCounts.linksEmptyHref += 1;
    if ((summary.links?.placeholderHref || 0) > 0) issueCounts.linksPlaceholderHref += 1;
    if ((summary.images?.missingDimensions || 0) > 0) issueCounts.imagesMissingDimensions += 1;
    if ((summary.images?.aboveFoldLazy || 0) > 0) issueCounts.imagesAboveFoldLazy += 1;
    if ((summary.images?.belowFoldNotLazy || 0) > 0) issueCounts.imagesBelowFoldNotLazy += 1;
    if ((summary.forms?.missingLabels || 0) > 0) issueCounts.formsMissingLabels += 1;
    if ((summary.media?.autoplayWithoutControls || 0) > 0) issueCounts.autoplayWithoutControls += 1;
    if ((summary.media?.backgroundVideosMissingControl || 0) > 0) {
      issueCounts.backgroundVideosMissingControl += 1;
    }
  }

  // Fallback: if the 404 audit wasn't executed (snippet unavailable), infer
  // from any crawled page whose URL ends in /404 and has DOM audit data.
  if ((audit404 as { error?: string }).error === '404 audit was not executed') {
    const candidate404 = pages.find(
      (p) => /\/404\/?$/.test(p.url) && p.summary
    );
    if (candidate404 && candidate404.summary) {
      const s = candidate404.summary;
      const navCount = s.links?.links || 0;
      const linkCount = navCount;
      const h1Count = s.headings?.h1 || 0;
      audit404 = {
        ok: true,
        status: 404,
        title: candidate404.title,
        navCount,
        linkCount,
        h1Count
      };
    }
  }

  const auditedPages = pages.filter((page) => Boolean(page.summary)).length;
  const pagesWithSnippet = pages.filter((page) => page.hasSnippet).length;
  const failingPages = pages.filter((page) => (page.summary?.failCount || 0) > 0).length;
  const domFallbackPages = pages.filter((page) => page.probeMode === 'dom-fallback').length;

  // Aggregate policy checks across all pages
  const allAffiliateLinks: string[] = [];
  let anyPageHasPoweredBy = false;
  let anyPageHasGsap = false;
  let anyPageHasCustomCode = false;
  for (const page of pages) {
    if (page.policyChecks) {
      if (page.policyChecks.hasPoweredByWebflow) anyPageHasPoweredBy = true;
      if (page.policyChecks.hasGsap) anyPageHasGsap = true;
      if (page.policyChecks.hasCustomCode) anyPageHasCustomCode = true;
      if (page.policyChecks.affiliateLinks) {
        allAffiliateLinks.push(...page.policyChecks.affiliateLinks);
      }
    }
  }
  const uniqueAffiliateLinks = Array.from(new Set(allAffiliateLinks));

  // Aggregate site settings across all pages
  let anyPageHasCustomFavicon = false;
  let anyPageHasCustomWebclip = false;
  let anyPageHasCustomFonts = false;
  const allCustomFontSources: string[] = [];
  const allDetectedApps: string[] = [];
  for (const page of pages) {
    if (page.siteSettings) {
      if (page.siteSettings.hasCustomFavicon) anyPageHasCustomFavicon = true;
      if (page.siteSettings.hasCustomWebclip) anyPageHasCustomWebclip = true;
      if (page.siteSettings.hasCustomFonts) anyPageHasCustomFonts = true;
      if (page.siteSettings.customFontSources) {
        allCustomFontSources.push(...page.siteSettings.customFontSources);
      }
      if (page.siteSettings.detectedApps) {
        allDetectedApps.push(...page.siteSettings.detectedApps);
      }
    }
  }
  const uniqueFontSources = Array.from(new Set(allCustomFontSources));
  const uniqueDetectedApps = Array.from(new Set(allDetectedApps));

  // Aggregate content quality signals
  const pagesWithLorem = pages.filter((p) => p.contentQuality?.hasLoremIpsum);
  const pagesWithPlaceholder = pages.filter((p) => p.contentQuality?.hasPlaceholderText);

  // Collect URLs that were discovered but not crawled (maxPages cap)
  const visitedUrls = new Set(pages.map((p) => p.url));
  const skippedUrls = Array.from(seen).filter((url) => !visitedUrls.has(url));
  const responsiveSecondaryUrl =
    (options.classifiedUrls || []).find((candidate) =>
      candidate.url !== startUrl &&
      (
        candidate.classification === 'content' ||
        candidate.classification === 'cms-listing' ||
        candidate.classification === 'cms-detail' ||
        candidate.classification === 'ecommerce'
      )
    )?.url ||
    pages.find((page) =>
      page.url !== startUrl &&
      !page.error &&
      page.summary &&
      page.classification !== 'utility:license' &&
      page.classification !== 'utility:instructions' &&
      page.classification !== 'utility:style-guide' &&
      page.classification !== 'utility:changelog' &&
      page.classification !== 'error-page'
    )?.url;
  const responsiveSampleUrls = Array.from(
    new Set(
      [
        startUrl,
        responsiveSecondaryUrl
      ].filter((url): url is string => Boolean(url))
    )
  ).slice(0, 2);
  const responsive = responsiveSampleUrls.length > 0
    ? await runPublishedResponsiveProbe(provider, responsiveSampleUrls, {
        timeout: Math.min(timeout, 30000)
      })
    : {
        pagesSampled: 0,
        totalViewportChecks: 0,
        pages: []
      };

  return {
    startUrl,
    origin,
    maxPages,
    maxDepth,
    visitedPages: pages.length,
    auditedPages,
    pagesWithSnippet,
    failingPages,
    skippedUrls,
    snippetVersion,
    snippetTools,
    probes: {
      fetch: options.fetchProbe,
      browser: {
        evaluatedPages: pages.length,
        snippetPages: pagesWithSnippet,
        domFallbackPages,
        surfaces: Array.from(browserProbeSurfaces).sort() as PublishedSnippetCrawlResult['probes']['browser']['surfaces']
      }
    },
    sitemapStatus,
    audit404,
    issueCounts,
    policyChecks: {
      hasPoweredByWebflow: anyPageHasPoweredBy,
      affiliateLinkCount: uniqueAffiliateLinks.length,
      affiliateLinks: uniqueAffiliateLinks,
      hasGsap: anyPageHasGsap,
      hasCustomCode: anyPageHasCustomCode
    },
    siteSettings: {
      hasCustomFavicon: anyPageHasCustomFavicon,
      hasCustomWebclip: anyPageHasCustomWebclip,
      hasCustomFonts: anyPageHasCustomFonts,
      customFontSources: uniqueFontSources,
      detectedApps: uniqueDetectedApps
    },
    responsive,
    pages
  };
}

function mapDesignerStatus(
  designer: DesignerChecklistReport,
  id: string
): { status: UnifiedReviewStatus; evidence: string[]; confidence: number } {
  const check = designer.checks.find((item) => item.id === id);
  if (!check) {
    return {
      status: 'manual',
      evidence: [`Designer check not found: ${id}`],
      confidence: 0.15
    };
  }
  const heuristicIds = new Set([
    'components.title_case_naming',
    'styles.class_naming_consistency',
    'pages.title_case_naming',
    'pages.style_guide_exists',
    'pages.instructions_exists',
    'pages.licenses_exists',
    'cms.collection_name_title_case',
  ]);
  const panelInventoryIds = new Set([
    'components.nav_footer_cta',
    'variables.breakpoint_modes',
    'styles.base_tag_selectors',
    'cms.collection_pages_present',
    'cms.collections_detected',
    'cms.item_count_range',
  ]);
  const confidence =
    check.result === 'manual'
      ? 0.2
      : heuristicIds.has(id)
        ? 0.6
        : panelInventoryIds.has(id)
          ? 0.78
          : 0.7;
  if (check.result === 'pass') return { status: 'pass', evidence: check.evidence, confidence };
  if (check.result === 'fail') return { status: 'fail', evidence: check.evidence, confidence };
  return { status: 'manual', evidence: check.evidence, confidence };
}

function unifyRows(
  designer: DesignerChecklistReport,
  published: PublishedSnippetCrawlResult,
  includeManual: boolean,
  precheck?: PublishedSitePrecheckResult
): UnifiedReviewRow[] {
  const home = published.pages.find((page) => page.url === published.startUrl) || published.pages[0] || null;
  const homeTitle = home?.title || '';
  const totalAudited = published.auditedPages;
  // When the Webflow Review snippet isn't available (pagesWithSnippet=0),
  // the DOM fallback is used which is less accurate.  Apply a confidence
  // discount to published-crawl checks so reviewers know the data quality.
  const snippetAvailable = published.pagesWithSnippet > 0;
  const confDiscount = snippetAvailable ? 1.0 : 0.85;
  const formatKeys = Array.from(
    new Set(
      published.pages.flatMap((page) =>
        Object.keys(page.summary?.imageFormats || {}).map((key) => key.toLowerCase())
      )
    )
  ).sort();
  const styleSignalPages = published.pages.filter((page) => page.summary?.styles);
  const aggregatedBreakpointHints = Array.from(
    new Set(
      styleSignalPages.flatMap((page) => page.summary?.styles?.breakpointHints || [])
    )
  ).sort();
  const aggregatedVariableCategories = Array.from(
    new Set(
      styleSignalPages.flatMap((page) => page.summary?.styles?.variableCategories || [])
    )
  ).sort();
  const maxDefinedVariables = styleSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.styles?.definedVariables || 0),
    0
  );
  const maxUsedVariables = styleSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.styles?.usedVariables || 0),
    0
  );
  const maxAccessibleStyleSheets = styleSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.styles?.accessibleStyleSheets || 0),
    0
  );
  const maxBlockedStyleSheets = styleSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.styles?.blockedStyleSheets || 0),
    0
  );
  const maxBaseTagRules = styleSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.styles?.baseTagRules || 0),
    0
  );
  const maxBaseTagVariableRules = styleSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.styles?.baseTagVariableRules || 0),
    0
  );
  const maxComponentVariantSelectors = styleSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.styles?.componentVariantSelectors || 0),
    0
  );
  const samplePublishedVariables =
    styleSignalPages.find((page) => (page.summary?.styles?.sampleVariables.length || 0) > 0)
      ?.summary?.styles?.sampleVariables || [];
  const samplePublishedBaseTagSelectors =
    styleSignalPages.find((page) => (page.summary?.styles?.sampleBaseTagSelectors.length || 0) > 0)
      ?.summary?.styles?.sampleBaseTagSelectors || [];
  const samplePublishedComponentVariantSelectors =
    styleSignalPages.find((page) => (page.summary?.styles?.sampleComponentVariantSelectors.length || 0) > 0)
      ?.summary?.styles?.sampleComponentVariantSelectors || [];
  const hasPublishedStyleSignals = styleSignalPages.length > 0 && maxAccessibleStyleSheets > 0;
  const hasPublishedBreakpointHints = ['479', '767', '991'].every((hint) =>
    aggregatedBreakpointHints.includes(hint)
  );
  const hasPublishedReusableVariableSignals =
    hasPublishedStyleSignals &&
    maxDefinedVariables >= 6 &&
    maxUsedVariables >= 6 &&
    aggregatedVariableCategories.length >= 2;
  const stateSignalPages = published.pages.filter((page) => page.summary?.states);
  const maxHoverSelectors = stateSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.states?.hoverSelectors || 0),
    0
  );
  const maxFocusSelectors = stateSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.states?.focusSelectors || 0),
    0
  );
  const maxFocusVisibleSelectors = stateSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.states?.focusVisibleSelectors || 0),
    0
  );
  const maxActiveSelectors = stateSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.states?.activeSelectors || 0),
    0
  );
  const transitionSignalPages = published.pages.filter((page) => page.summary?.transitions);
  const totalInteractiveElements = transitionSignalPages.reduce(
    (sum, page) => sum + (page.summary?.transitions?.totalInteractive || 0),
    0
  );
  const totalInteractiveWithTransition = transitionSignalPages.reduce(
    (sum, page) => sum + (page.summary?.transitions?.withTransition || 0),
    0
  );
  const totalInteractiveWithSpecificTransition = transitionSignalPages.reduce(
    (sum, page) => sum + (page.summary?.transitions?.withSpecificTransition || 0),
    0
  );
  const totalInteractiveWithTransitionAll = transitionSignalPages.reduce(
    (sum, page) => sum + (page.summary?.transitions?.withTransitionAll || 0),
    0
  );
  const totalInteractiveGpuFriendlyTransitions = transitionSignalPages.reduce(
    (sum, page) => sum + (page.summary?.transitions?.gpuFriendlyTransitions || 0),
    0
  );
  const totalInteractiveExpensiveTransitions = transitionSignalPages.reduce(
    (sum, page) => sum + (page.summary?.transitions?.expensiveTransitions || 0),
    0
  );
  const maxTransitionDurationMs = transitionSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.transitions?.maxDurationMs || 0),
    0
  );
  const averageTransitionDurationMs = totalInteractiveWithTransition > 0
    ? transitionSignalPages.reduce(
        (sum, page) =>
          sum + (
            (page.summary?.transitions?.averageDurationMs || 0) *
            (page.summary?.transitions?.withTransition || 0)
          ),
        0
      ) / totalInteractiveWithTransition
    : 0;
  const accessibilitySignalPages = published.pages.filter((page) => page.summary?.accessibility);
  const allSampledPagesHaveMainLandmark =
    accessibilitySignalPages.length > 0 &&
    accessibilitySignalPages.every((page) => Boolean(page.summary?.accessibility?.hasMainLandmark));
  const allSampledPagesHaveNavLandmark =
    accessibilitySignalPages.length > 0 &&
    accessibilitySignalPages.every((page) => Boolean(page.summary?.accessibility?.hasNavLandmark));
  const anySampledPageHasSkipLink = accessibilitySignalPages.some(
    (page) => Boolean(page.summary?.accessibility?.hasSkipLink)
  );
  const totalGenericLinkLabels = accessibilitySignalPages.reduce(
    (sum, page) => sum + (page.summary?.accessibility?.genericLinkLabels || 0),
    0
  );
  const sampleGenericLinkLabels =
    accessibilitySignalPages.find(
      (page) => (page.summary?.accessibility?.sampleGenericLinkLabels.length || 0) > 0
    )?.summary?.accessibility?.sampleGenericLinkLabels || [];
  const assetSignalPages = published.pages.filter(
    (page) => page.summary?.assets && (page.summary?.images?.images || 0) > 0
  );
  const totalPublishedImages = assetSignalPages.reduce(
    (sum, page) => sum + (page.summary?.images?.images || 0),
    0
  );
  const totalResponsiveImages = assetSignalPages.reduce(
    (sum, page) => sum + (page.summary?.assets?.responsiveImages || 0),
    0
  );
  const totalImagesWithSrcset = assetSignalPages.reduce(
    (sum, page) => sum + (page.summary?.assets?.imagesWithSrcset || 0),
    0
  );
  const totalImagesWithSizes = assetSignalPages.reduce(
    (sum, page) => sum + (page.summary?.assets?.imagesWithSizes || 0),
    0
  );
  const maxNavLogoImages = assetSignalPages.reduce(
    (max, page) => Math.max(max, page.summary?.assets?.navLogoImages || 0),
    0
  );
  const responsiveImageCoverage = totalPublishedImages > 0
    ? totalResponsiveImages / totalPublishedImages
    : 0;
  const formSignalPages = published.pages.filter((page) => page.summary?.forms && (page.summary?.forms?.fields || 0) > 0);
  const totalWrongFieldTypes = formSignalPages.reduce(
    (sum, page) => sum + (page.summary?.forms?.wrongFieldTypes || 0),
    0
  );
  const sampleWrongFieldTypes =
    formSignalPages.find((page) => (page.summary?.forms?.sampleWrongFieldTypes.length || 0) > 0)
      ?.summary?.forms?.sampleWrongFieldTypes || [];
  const responsiveViewportChecks = published.responsive?.pages.flatMap((page) =>
    page.viewports.map((viewport) => ({
      pageUrl: page.url,
      ...viewport
    }))
  ) || [];
  const responsiveOverflowChecks = responsiveViewportChecks.filter((viewport) => viewport.horizontalOverflow);
  const responsiveClippedTextChecks = responsiveViewportChecks.filter(
    (viewport) => viewport.clippedTextElements > 0
  );
  const responsiveTinyTapChecks = responsiveViewportChecks.filter(
    (viewport) => viewport.tinyTapTargets > 0
  );
  const firstResponsiveTinyTapCheck = responsiveTinyTapChecks[0] || null;

  // Match /license, /licenses, /licensing, /templates/licensing, etc.
  const licenseUrlPattern = '/licens';
  const hasLicensePageCrawled = published.pages.some(
    (page) => page.url.toLowerCase().includes(licenseUrlPattern)
  );
  // Fall back to precheck discovered URLs when the license page wasn't crawled
  // (e.g. maxPages cap was hit before reaching utility pages).
  const hasLicensePageDiscovered = precheck?.discoveredUrls?.some(
    (url) => url.toLowerCase().includes(licenseUrlPattern)
  ) ?? false;
  const hasLicensePage = hasLicensePageCrawled || hasLicensePageDiscovered;
  const licensePages = published.pages.filter(
    (page) => page.url.toLowerCase().includes(licenseUrlPattern)
  );
  const hasKnownLicenseTextResult = licensePages.some(
    (page) => typeof page.hasRequiredLicenseText === 'boolean'
  );
  const hasRequiredLicenseText = licensePages.some((page) => page.hasRequiredLicenseText === true);
  const hasPrecheckClassification = (classification: import('./types.js').PageClassification) =>
    (precheck?.classifiedUrls ?? []).some((item) => item.classification === classification);
  const hasCrawledClassification = (classification: import('./types.js').PageClassification) =>
    published.pages.some((page) => page.classification === classification);
  const designerPageNamesLower = designer.metadataSummary.pages.map((page) => page.name.toLowerCase());
  const designerHasStyleGuidePage = designerPageNamesLower.some(
    (name) => name.includes('style guide') || name.includes('styleguide')
  );
  const designerHasInstructionsPage = designerPageNamesLower.some(
    (name) =>
      name.includes('instruction') ||
      name.includes('instructions') ||
      name.includes('start here') ||
      name.includes('getting started') ||
      name.includes('documentation') ||
      (name.includes('guide') && !name.includes('style guide') && !name.includes('styleguide'))
  );
  const designerHasLicensePage = designerPageNamesLower.some(
    (name) => name.includes('license') || name.includes('licenses')
  );

  const rows: UnifiedReviewRow[] = [];
  // Severity mapping: checks are classified by impact on template quality
  const severityMap: Record<string, import('./types.js').UnifiedReviewSeverity> = {
    // Critical: blocks publishing or causes user-facing breakage
    'policy.powered_by_webflow': 'critical',
    'policy.no_affiliate_links': 'critical',
    'pages.home_seo_title_formula': 'critical',
    'pages.license_text_exact': 'critical',
    'pages.custom_404': 'major',
    // Major: significant quality issues
    'webflow_audit.h1_hierarchy': 'major',
    'webflow_audit.alt_text': 'major',
    'components.nav_footer_cta': 'major',
    'pages.style_guide_exists': 'major',
    'pages.instructions_exists': 'major',
    'pages.licenses_exists': 'major',
    'pages.meta_tags_static': 'major',
    'pages.cms_used_relational': 'major',
    'styles.base_tag_styles': 'major',
    'forms.field_types': 'major',
    // Minor: nice to have, lower impact
    'components.title_case_names': 'minor',
    'pages.image_loading_strategy': 'minor',
    'pages.image_dimensions': 'minor',
    'pages.videos_controls': 'minor',
    'variables.breakpoint_modes': 'minor',
    'assets.modern_formats': 'minor',
    'assets.responsive_images': 'minor',
    'responsive.tap_target_sizing': 'minor',
    'styles.interactive_states': 'minor',
    'interactions.transition_properties': 'minor',
    'a11y.landmarks_present': 'minor',
    'a11y.descriptive_link_labels': 'minor',
    'settings.custom_webclip': 'minor',
    // Info: informational, doesn't affect quality rating
    'policy.gsap_detected': 'info',
    'policy.custom_code_detected': 'info',
    'pages.meta_tags_cms_dynamic': 'info',
    // Accessibility
    'a11y.link_accessible_names': 'major',
    // Links & forms
    'links.no_empty_href': 'major',
    'links.no_broken_internal': 'major',
    'links.external_target_blank': 'minor',
    'forms.labels_present': 'major',
    // Content quality
    'content.no_placeholder_text': 'critical',
    // Site settings: from the review checklist
    'settings.custom_favicon': 'minor',
    'settings.custom_fonts': 'major',
    'settings.no_connected_apps': 'major',
    // Coverage: critical — incomplete coverage means the review is not complete
    'coverage.all_pages_crawled': 'critical',
  };

  const pushRow = (
    id: string,
    section: string,
    requirement: string,
    status: UnifiedReviewStatus,
    evidence: string[],
    source: string[],
    confidence: number,
    fixHint?: string
  ) => {
    // Apply confidence discount for published-crawl checks when snippet is absent
    const adjustedConfidence = source.includes('published-webmcp-crawl')
      ? Math.round(confidence * confDiscount * 100) / 100
      : confidence;
    const adjustedEvidence = !snippetAvailable && source.includes('published-webmcp-crawl')
      ? [...evidence, 'Note: Webflow Review snippet not available — using DOM fallback (lower accuracy)']
      : evidence;
    const severity = severityMap[id] || 'minor';
    rows.push({
      id, section, requirement, status, severity,
      evidence: adjustedEvidence, source,
      confidence: adjustedConfidence, fixHint
    });
  };

  const dNavFooter = mapDesignerStatus(designer, 'components.nav_footer_cta');
  const dComponentNames = mapDesignerStatus(designer, 'components.title_case_naming');
  const dVarReusable = mapDesignerStatus(designer, 'variables.defined_reusable');
  const dVarTitle = mapDesignerStatus(designer, 'variables.title_case_naming');
  const dVarBreakpoints = mapDesignerStatus(designer, 'variables.breakpoint_modes');
  const dStylesUnused = mapDesignerStatus(designer, 'styles.unused_classes_cleaned');
  const dStylesBase = mapDesignerStatus(designer, 'styles.base_tag_selectors');
  const dComboDepth = mapDesignerStatus(designer, 'styles.combo_class_depth');
  const dCmsRel = mapDesignerStatus(designer, 'cms.collection_pages_present');
  const dStyleGuideExists = mapDesignerStatus(designer, 'pages.style_guide_exists');
  const dInstructionsExists = mapDesignerStatus(designer, 'pages.instructions_exists');
  const dLicensesExists = mapDesignerStatus(designer, 'pages.licenses_exists');
  const policy = published.policyChecks;

  // Helper: extract short paths for pages matching a predicate (for evidence)
  const failingPaths = (
    predicate: (summary: PageAuditSummary) => boolean,
    limit = 5
  ): string[] => {
    const origin = published.origin;
    return published.pages
      .filter((p) => p.summary && predicate(p.summary))
      .map((p) => p.url.replace(origin, ''))
      .slice(0, limit);
  };

  const h1FailPages = failingPaths(
    (s) => Boolean(s.headings?.missingH1) || Boolean(s.headings?.multipleH1) || (s.headings?.skippedHeadingLevels ?? 0) > 0
  );
  pushRow(
    'webflow_audit.h1_hierarchy',
    'Webflow Audit Panel',
    'One H1 per page; no skipped heading levels',
    published.issueCounts.missingH1 > 0 ||
      published.issueCounts.multipleH1 > 0 ||
      published.issueCounts.skippedHeadingLevels > 0
      ? 'fail'
      : 'pass',
    [
      `missingH1Pages=${published.issueCounts.missingH1}/${totalAudited}`,
      `multipleH1Pages=${published.issueCounts.multipleH1}/${totalAudited}`,
      `skippedHeadingLevelsPages=${published.issueCounts.skippedHeadingLevels}/${totalAudited}`,
      ...(h1FailPages.length > 0 ? [`affectedPages=${h1FailPages.join(', ')}`] : [])
    ],
    ['published-webmcp-crawl'],
    0.9,
    'Fix heading hierarchy per page and keep a single primary H1.'
  );

  const altFailPages = failingPaths((s) => (s.images?.missingAlt ?? 0) > 0);
  pushRow(
    'webflow_audit.alt_text',
    'Webflow Audit Panel',
    'No missing alt texts',
    published.issueCounts.imagesMissingAlt > 0 ? 'fail' : 'pass',
    [
      `pagesWithMissingAlt=${published.issueCounts.imagesMissingAlt}/${totalAudited}`,
      ...(altFailPages.length > 0 ? [`affectedPages=${altFailPages.join(', ')}`] : [])
    ],
    ['published-webmcp-crawl'],
    0.9,
    'Add descriptive alt text for informative images and mark decorative images appropriately.'
  );

  const publishedStructure = home?.summary?.structure;
  const hasPublishedNavFooterCtaSignal = Boolean(
    publishedStructure?.hasNav &&
    publishedStructure?.hasFooter &&
    (publishedStructure?.ctaCount || 0) > 0 &&
    maxComponentVariantSelectors > 0
  );
  pushRow(
    'components.nav_footer_cta',
    'Components Panel',
    'Nav, Footer and CTAs are Components',
    dNavFooter.status !== 'manual'
      ? dNavFooter.status
      : hasPublishedNavFooterCtaSignal
        ? 'partial'
        : 'manual',
    dNavFooter.status !== 'manual'
      ? dNavFooter.evidence
      : hasPublishedNavFooterCtaSignal
        ? [
            `publishedHasNav=${Boolean(publishedStructure?.hasNav)}`,
            `publishedHasFooter=${Boolean(publishedStructure?.hasFooter)}`,
            `publishedCtaCount=${publishedStructure?.ctaCount || 0}`,
            `publishedVariantSelectors=${maxComponentVariantSelectors}`,
            ...(samplePublishedComponentVariantSelectors.length > 0
              ? [`sampleVariantSelectors=${samplePublishedComponentVariantSelectors.join(', ')}`]
              : []),
            'Published DOM and stylesheet signals suggest reusable nav/footer/CTA variants, but Designer component setup is not directly confirmed.'
          ]
        : dNavFooter.evidence,
    hasPublishedNavFooterCtaSignal ? ['designer-mcp', 'published-webmcp-crawl'] : ['designer-mcp'],
    dNavFooter.status !== 'manual'
      ? dNavFooter.confidence
      : hasPublishedNavFooterCtaSignal
        ? 0.58
        : dNavFooter.confidence
  );

  pushRow(
    'components.title_case_names',
    'Components Panel',
    'Components use title casing in names',
    dComponentNames.status,
    dComponentNames.evidence,
    ['designer-mcp'],
    dComponentNames.confidence,
    'Rename components/variants to Title Case with concise human-readable labels.'
  );

  const styleGuideDetected =
    designerHasStyleGuidePage ||
    hasCrawledClassification('utility:style-guide') ||
    hasPrecheckClassification('utility:style-guide');
  const styleGuideConfidence = styleGuideDetected
    ? hasCrawledClassification('utility:style-guide') || hasPrecheckClassification('utility:style-guide')
      ? 0.84
      : dStyleGuideExists.confidence
    : 0.62;
  pushRow(
    'pages.style_guide_exists',
    'Required Pages',
    'Style Guide page exists',
    styleGuideDetected ? 'pass' : 'fail',
    [
      `designerFound=${designerHasStyleGuidePage}`,
      `publishedFound=${hasCrawledClassification('utility:style-guide')}`,
      `precheckFound=${hasPrecheckClassification('utility:style-guide')}`,
      ...(!styleGuideDetected ? dStyleGuideExists.evidence : [])
    ],
    ['designer-mcp', 'published-webmcp-crawl'],
    styleGuideConfidence,
    styleGuideDetected ? undefined : 'Add a Style Guide page or ensure it is published and discoverable from the site.'
  );

  const instructionsPageDetected =
    designerHasInstructionsPage ||
    hasCrawledClassification('utility:instructions') ||
    Boolean(precheck?.requiredPages.instructions) ||
    hasPrecheckClassification('utility:instructions');
  const instructionsRequiredByPublishedPolicy = policy.hasGsap || policy.hasCustomCode;
  const instructionsExistsStatus: UnifiedReviewStatus = instructionsPageDetected
    ? 'pass'
    : instructionsRequiredByPublishedPolicy
      ? 'fail'
      : dInstructionsExists.status === 'fail'
        ? 'partial'
        : dInstructionsExists.status;
  const instructionsConfidence =
    instructionsExistsStatus === 'pass'
      ? instructionsPageDetected && (hasCrawledClassification('utility:instructions') || Boolean(precheck?.requiredPages.instructions))
        ? 0.84
        : dInstructionsExists.confidence
      : instructionsExistsStatus === 'fail'
        ? 0.82
        : instructionsExistsStatus === 'partial'
          ? 0.5
          : 0.3;
  pushRow(
    'pages.instructions_exists',
    'Required Pages',
    'Instructions page exists when advanced interactions/components or custom setup are used',
    instructionsExistsStatus,
    [
      `designerFound=${designerHasInstructionsPage}`,
      `publishedFound=${hasCrawledClassification('utility:instructions')}`,
      `precheckFound=${Boolean(precheck?.requiredPages.instructions) || hasPrecheckClassification('utility:instructions')}`,
      `requiredByPublishedPolicy=${instructionsRequiredByPublishedPolicy}`,
      ...dInstructionsExists.evidence
    ],
    ['designer-mcp', 'published-webmcp-crawl'],
    instructionsConfidence,
    instructionsExistsStatus === 'pass'
      ? undefined
      : 'Add an Instructions/Start Here page when advanced interactions, GSAP, or custom code require setup guidance.'
  );

  const licenseDetected =
    designerHasLicensePage ||
    hasLicensePage ||
    hasCrawledClassification('utility:license') ||
    hasPrecheckClassification('utility:license');
  const licenseExistsConfidence = licenseDetected
    ? hasLicensePage || hasCrawledClassification('utility:license') || hasPrecheckClassification('utility:license')
      ? 0.86
      : dLicensesExists.confidence
    : 0.66;
  pushRow(
    'pages.licenses_exists',
    'Required Pages',
    'Licenses page exists',
    licenseDetected ? 'pass' : 'fail',
    [
      `designerFound=${designerHasLicensePage}`,
      `publishedFound=${hasLicensePageCrawled || hasCrawledClassification('utility:license')}`,
      `precheckFound=${hasLicensePageDiscovered || hasPrecheckClassification('utility:license')}`,
      ...(!licenseDetected ? dLicensesExists.evidence : [])
    ],
    ['designer-mcp', 'published-webmcp-crawl'],
    licenseExistsConfidence,
    licenseDetected ? undefined : 'Add a Licenses page or ensure it is published and discoverable from the site.'
  );

  const ix2MissingTargets = home?.summary?.ix2?.missingTargets ?? 0;
  const ix2Unused = home?.summary?.ix2?.unusedActionLists ?? 0;
  const ix3MissingSelectors = home?.summary?.ix3?.missingTargetSelectors ?? 0;
  const interactionsStatus: UnifiedReviewStatus =
    ix2Unused > 0
      ? 'fail'
      : ix2MissingTargets > 0 || ix3MissingSelectors > 0
        ? 'partial'
        : 'pass';
  pushRow(
    'interactions.unused_cleaned',
    'Interactions Panel',
    'Interactions are cleaned of unused animations',
    interactionsStatus,
    [
      `home.ix2.unusedActionLists=${ix2Unused}`,
      `home.ix2.missingTargets=${ix2MissingTargets}`,
      `home.ix3.missingTargetSelectors=${ix3MissingSelectors}`,
      'Strict unused/deleted state still needs Designer panel confirmation.'
    ],
    ['published-webmcp-crawl', 'designer-mcp'],
    interactionsStatus === 'partial' ? 0.6 : 0.82,
    'Remove orphaned targets/action lists and verify in Designer Interactions panel.'
  );

  pushRow(
    'variables.defined_reusable',
    'Variables Panel',
    'Color, typography, and spacing variables are defined and reusable',
    dVarReusable.status !== 'manual'
      ? dVarReusable.status
      : hasPublishedReusableVariableSignals
        ? 'partial'
        : 'manual',
    dVarReusable.status !== 'manual'
      ? dVarReusable.evidence
      : hasPublishedReusableVariableSignals
        ? [
            `publishedDefinedVariables=${maxDefinedVariables}`,
            `publishedUsedVariables=${maxUsedVariables}`,
            `publishedVariableCategories=${aggregatedVariableCategories.join(', ')}`,
            `accessibleStyleSheets=${maxAccessibleStyleSheets}`,
            ...(samplePublishedVariables.length > 0
              ? [`sampleVariables=${samplePublishedVariables.join(', ')}`]
              : []),
            'Published CSS shows reusable custom-property signals, but Designer variable inventory is not confirmed.'
          ]
        : dVarReusable.evidence,
    hasPublishedReusableVariableSignals ? ['designer-mcp', 'published-webmcp-crawl'] : ['designer-mcp'],
    dVarReusable.status !== 'manual'
      ? dVarReusable.confidence
      : hasPublishedReusableVariableSignals
        ? 0.56
        : dVarReusable.confidence
  );
  pushRow(
    'variables.title_case',
    'Variables Panel',
    'Variables use Title Case, human readable naming',
    dVarTitle.status,
    dVarTitle.evidence,
    ['designer-mcp'],
    dVarTitle.confidence
  );
  pushRow(
    'variables.breakpoint_modes',
    'Variables Panel',
    'Variable Modes exist for tablet, mobile landscape, portrait breakpoints',
    dVarBreakpoints.status !== 'manual'
      ? dVarBreakpoints.status
      : hasPublishedStyleSignals && hasPublishedBreakpointHints
        ? 'partial'
        : 'manual',
    dVarBreakpoints.status !== 'manual'
      ? dVarBreakpoints.evidence
      : hasPublishedStyleSignals && hasPublishedBreakpointHints
        ? [
            `publishedBreakpointHints=${aggregatedBreakpointHints.join(', ')}`,
            `accessibleStyleSheets=${maxAccessibleStyleSheets}`,
            `blockedStyleSheets=${maxBlockedStyleSheets}`,
            `pagesWithStyleSignals=${styleSignalPages.length}`,
            'Published CSS includes standard breakpoint media queries, but Designer variable modes are not directly confirmed.'
          ]
        : dVarBreakpoints.evidence,
    hasPublishedStyleSignals && hasPublishedBreakpointHints
      ? ['designer-mcp', 'published-webmcp-crawl']
      : ['designer-mcp'],
    dVarBreakpoints.status !== 'manual'
      ? dVarBreakpoints.confidence
      : hasPublishedStyleSignals && hasPublishedBreakpointHints
        ? 0.5
        : dVarBreakpoints.confidence
  );

  pushRow(
    'styles.unused_classes',
    'Styles Selector',
    'Unused styles/classes are cleaned up',
    dStylesUnused.status,
    dStylesUnused.evidence,
    ['designer-mcp'],
    dStylesUnused.confidence
  );
  pushRow(
    'styles.base_tag_styles',
    'Styles Selector',
    'Base styles applied to HTML tags',
    dStylesBase.status,
    dStylesBase.evidence,
    ['designer-mcp'],
    dStylesBase.confidence
  );
  pushRow(
    'styles.base_uses_variables',
    'Styles Selector',
    'Variables are used to define base tag styles',
    !hasPublishedStyleSignals
      ? 'manual'
      : maxBaseTagVariableRules > 0
        ? 'pass'
        : maxBaseTagRules > 0
          ? 'fail'
          : 'manual',
    !hasPublishedStyleSignals
      ? ['Published stylesheet signals were not available for this page sample.']
      : [
          `accessibleStyleSheets=${maxAccessibleStyleSheets}`,
          `blockedStyleSheets=${maxBlockedStyleSheets}`,
          `baseTagRules=${maxBaseTagRules}`,
          `baseTagVariableRules=${maxBaseTagVariableRules}`,
          ...(samplePublishedBaseTagSelectors.length > 0
            ? [`sampleSelectors=${samplePublishedBaseTagSelectors.join(' | ')}`]
            : [])
        ],
    ['published-webmcp-crawl'],
    hasPublishedStyleSignals ? 0.74 : 0.2
  );
  const interactiveStateStatus: UnifiedReviewStatus =
    stateSignalPages.length === 0
      ? 'manual'
      : maxHoverSelectors > 0 && (maxFocusSelectors > 0 || maxFocusVisibleSelectors > 0)
        ? maxActiveSelectors > 0 ? 'pass' : 'partial'
        : maxHoverSelectors > 0 || maxFocusSelectors > 0 || maxFocusVisibleSelectors > 0
          ? 'partial'
          : 'fail';
  pushRow(
    'styles.interactive_states',
    'Styles Selector',
    'Hover, focus, and active states are styled where applicable',
    interactiveStateStatus,
    stateSignalPages.length > 0
      ? [
          `hoverSelectors=${maxHoverSelectors}`,
          `focusSelectors=${maxFocusSelectors}`,
          `focusVisibleSelectors=${maxFocusVisibleSelectors}`,
          `activeSelectors=${maxActiveSelectors}`,
          `pagesChecked=${stateSignalPages.length}`
        ]
      : ['Published state-selector signals were not available.'],
    ['published-webmcp-crawl'],
    stateSignalPages.length > 0 ? 0.68 : 0.2,
    interactiveStateStatus === 'fail'
      ? 'Add explicit hover and focus-visible styles for interactive elements; include active/pressed states where relevant.'
      : interactiveStateStatus === 'partial'
        ? 'Interactive state styling is only partially evidenced in published CSS. Expand focus-visible and active coverage.'
        : undefined
  );
  // Supplement combo depth with DOM-extracted data when Designer check is manual
  const comboPages = published.pages.filter((p) => p.summary?.comboClassDepth);
  const maxComboDepth = comboPages.reduce(
    (max, p) => Math.max(max, p.summary?.comboClassDepth?.maxDepth || 0), 0
  );
  const worstComboSelector = comboPages
    .sort((a, b) => (b.summary?.comboClassDepth?.maxDepth || 0) - (a.summary?.comboClassDepth?.maxDepth || 0))
    [0]?.summary?.comboClassDepth?.maxDepthSelector || '';
  const hasComboData = comboPages.length > 0;
  const comboStatus: UnifiedReviewStatus =
    dComboDepth.status !== 'manual' ? dComboDepth.status
      : !hasComboData ? 'manual'
      : maxComboDepth <= 4 ? 'pass'
      : maxComboDepth <= 6 ? 'partial'
      : 'fail';
  const comboEvidence = hasComboData && dComboDepth.status === 'manual'
    ? [
        `maxClassesOnElement=${maxComboDepth}`,
        `worstElement=${worstComboSelector}`,
        `pagesChecked=${comboPages.length}`
      ]
    : dComboDepth.evidence;
  pushRow(
    'styles.combo_depth',
    'Styles Selector',
    'No more than 3-4 combo classes stacked per element',
    comboStatus,
    comboEvidence,
    hasComboData ? ['designer-mcp', 'published-webmcp-crawl'] : ['designer-mcp'],
    hasComboData ? 0.6 : dComboDepth.confidence
  );

  const htmlSuffix = ' - Webflow HTML website template';
  const ecomSuffix = ' - Webflow Ecommerce website template';
  const homeTitleLower = homeTitle.toLowerCase();
  const hasSuffix =
    homeTitleLower.includes(htmlSuffix.toLowerCase()) ||
    homeTitleLower.includes(ecomSuffix.toLowerCase());
  const siteName = designer.metadataSummary.siteName || '';
  const titlePrefix = homeTitleLower.includes(htmlSuffix.toLowerCase())
    ? homeTitle.slice(0, homeTitleLower.indexOf(htmlSuffix.toLowerCase())).trim()
    : homeTitleLower.includes(ecomSuffix.toLowerCase())
      ? homeTitle.slice(0, homeTitleLower.indexOf(ecomSuffix.toLowerCase())).trim()
      : '';
  // The Designer-extracted site name often includes "Webflow - " prefix
  // (e.g. "Webflow - Meetup W").  Strip common prefixes before comparing.
  const siteNameCleaned = siteName
    .replace(/^webflow\s*[-–—]\s*/i, '')
    .trim();
  const nameMatchesSite =
    !siteName || !titlePrefix
      ? false
      : titlePrefix.toLowerCase() === siteName.toLowerCase() ||
        titlePrefix.toLowerCase() === siteNameCleaned.toLowerCase();
  const homeTitleCompliant = hasSuffix && (nameMatchesSite || !siteName);
  const homeTitleEvidence = [
    `homeTitle=${homeTitle || 'n/a'}`,
    `siteName=${siteName || 'n/a'}`,
    `hasSuffix=${hasSuffix}`,
    `titlePrefix=${titlePrefix || 'n/a'}`,
    `nameMatchesSite=${nameMatchesSite}`
  ];
  pushRow(
    'pages.home_seo_title_formula',
    'Page Level Checks',
    'Home SEO title matches required naming formula',
    homeTitleCompliant ? 'pass' : hasSuffix && !nameMatchesSite ? 'partial' : 'fail',
    homeTitleEvidence,
    ['published-webmcp-crawl'],
    homeTitleCompliant ? 0.92 : hasSuffix ? 0.7 : 0.85,
    'Set homepage title to "{Template Name} - Webflow HTML website template" (or Ecommerce variant). The prefix must match the template name.'
  );

  // When the license page was discovered (precheck) but not crawled (maxPages
  // cap), report 'partial' instead of 'fail' — the page exists but we couldn't
  // verify the text content.
  const licenseNotCrawledButDiscovered = !hasLicensePageCrawled && hasLicensePageDiscovered;
  const licenseStatus: UnifiedReviewStatus = !hasLicensePage
    ? 'fail'
    : licenseNotCrawledButDiscovered
      ? 'partial'
      : hasKnownLicenseTextResult
        ? hasRequiredLicenseText
          ? 'pass'
          : 'fail'
        : 'partial';
  pushRow(
    'pages.license_text_exact',
    'Page Level Checks',
    'License page includes the exact required opening text',
    licenseStatus,
    [
      `licensePageFound=${hasLicensePage}`,
      `licensePageCrawled=${hasLicensePageCrawled}`,
      `hasKnownLicenseTextResult=${hasKnownLicenseTextResult}`,
      `hasRequiredLicenseText=${hasRequiredLicenseText}`,
      ...(licenseNotCrawledButDiscovered
        ? ['License page exists but was not crawled (maxPages cap) — verify text manually']
        : [])
    ],
    ['published-webmcp-crawl', 'designer-mcp'],
    hasKnownLicenseTextResult ? 0.85 : 0.5,
    'Ensure /licenses page exists and starts with the required exact text.'
  );

  // Webflow manages the loading attribute for images.  Shared component images
  // (nav logo, menu icon) appear above-fold on every page and are often set to
  // lazy by the platform.  Lower confidence when every page is affected (likely
  // a shared component, not a per-page authoring issue).
  const lazyAboveFoldCount = published.issueCounts.imagesAboveFoldLazy;
  const notLazyBelowFold = (published.issueCounts as { imagesBelowFoldNotLazy?: number }).imagesBelowFoldNotLazy || 0;
  const allPagesAffected = lazyAboveFoldCount === totalAudited && totalAudited > 1;
  const hasLoadingIssues = lazyAboveFoldCount > 0 || notLazyBelowFold > 0;
  pushRow(
    'pages.image_loading_strategy',
    'Page Level Checks',
    'Below-the-fold images are lazy-loaded and above-the-fold essentials are eager',
    hasLoadingIssues ? 'fail' : 'pass',
    [
      `pagesWithAboveFoldLazy=${lazyAboveFoldCount}/${totalAudited}`,
      `pagesWithBelowFoldNotLazy=${notLazyBelowFold}/${totalAudited}`,
      ...(allPagesAffected
        ? ['All pages affected — likely shared component images (nav/header) set to lazy by Webflow']
        : [])
    ],
    ['published-webmcp-crawl'],
    allPagesAffected ? 0.6 : 0.87,
    'Set hero/critical images to eager and keep below-fold images lazy. Note: Webflow may manage loading attributes for shared components.'
  );

  const videoControlsFail =
    published.issueCounts.autoplayWithoutControls > 0 ||
    published.issueCounts.backgroundVideosMissingControl > 0;
  pushRow(
    'pages.videos_controls',
    'Page Level Checks',
    'No autoplay without controls; background videos have pause/skip controls',
    videoControlsFail ? 'fail' : 'pass',
    [
      `pagesWithAutoplayWithoutControls=${published.issueCounts.autoplayWithoutControls}`,
      `pagesWithBackgroundVideoMissingControl=${published.issueCounts.backgroundVideosMissingControl}`
    ],
    ['published-webmcp-crawl'],
    0.86
  );

  const staticMetaPages = published.pages.filter(
    (page) =>
      page.summary &&
      page.classification !== 'cms-detail' &&
      page.classification !== 'error-page' &&
      !is404PageTitle(page.title)
  );
  const staticPagesWithMissingMeta = staticMetaPages.filter(
    (page) => (page.summary?.metaMissing.length || 0) > 0
  ).length;

  // Aggregate which specific meta tags are most commonly missing on static-like pages
  const metaTagCounts: Record<string, number> = {};
  for (const page of staticMetaPages) {
    if (!page.summary) continue;
    for (const tag of page.summary.metaMissing) {
      metaTagCounts[tag] = (metaTagCounts[tag] || 0) + 1;
    }
  }
  const topMissingTags = Object.entries(metaTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => `${tag}(${count}/${staticMetaPages.length || 0})`);

  pushRow(
    'pages.meta_tags_static',
    'Page Level Checks',
    'Each static page has title, meta description, and core Open Graph tags',
    staticPagesWithMissingMeta > 0 ? 'fail' : 'pass',
    [
      `staticPagesChecked=${staticMetaPages.length}`,
      `pagesWithMissingMeta=${staticPagesWithMissingMeta}/${staticMetaPages.length || 0}`,
      ...(topMissingTags.length > 0 ? [`mostCommonMissing=${topMissingTags.join(', ')}`] : [])
    ],
    ['published-webmcp-crawl'],
    0.9,
    'Add missing title, description, og:title, og:description, and og:image tags per page.'
  );

  pushRow(
    'pages.meta_tags_cms_dynamic',
    'Page Level Checks',
    'CMS pages use dynamic SEO tags',
    'partial',
    [
      `cmsCollectionsDetected=${designer.metadataSummary.totalCMSCollections}`,
      `cmsDetailPagesAudited=${published.pages.filter((page) => page.classification === 'cms-detail').length}`,
      'Dynamic field binding cannot be confirmed from current payloads.'
    ],
    ['designer-mcp', 'published-webmcp-crawl'],
    0.55
  );

  const a404 = published.audit404;
  const a404WasExecuted = a404.ok !== false || !(a404 as { error?: string }).error;
  const a404Status = asFiniteNumber((a404 as Record<string, unknown>).status);
  const a404NavCount = asFiniteNumber((a404 as Record<string, unknown>).navCount);
  const a404LinkCount = asFiniteNumber((a404 as Record<string, unknown>).linkCount);
  const hasHealthy404 =
    a404.ok === true &&
    a404Status === 404 &&
    a404NavCount > 0 &&
    a404LinkCount > 0;
  // When the 404 audit was never executed (snippet unavailable and no /404
  // page was crawled), report as 'manual' instead of a false 'fail'.
  const a404Result: UnifiedReviewStatus = !a404WasExecuted
    ? 'manual'
    : hasHealthy404 ? 'pass' : 'fail';
  pushRow(
    'pages.custom_404',
    'Page Level Checks',
    'Custom branded 404 page exists with nav and CTAs',
    a404Result,
    a404WasExecuted
      ? [
          `status=${a404Status || 'n/a'}`,
          `navCount=${a404NavCount || 'n/a'}`,
          `linkCount=${a404LinkCount || 'n/a'}`
        ]
      : ['404 audit was not executed — verify manually'],
    ['published-webmcp-crawl'],
    a404WasExecuted ? 0.92 : 0.2,
    a404Result === 'fail'
      ? 'Ensure a custom 404 page exists with navigation and links back to the site.'
      : undefined
  );

  const dimsMissingCount = published.issueCounts.imagesMissingDimensions;
  const allPagesDimsMissing = dimsMissingCount === totalAudited && totalAudited > 1;
  pushRow(
    'pages.image_dimensions',
    'Page Level Checks',
    'Images have explicit width/height or aspect-ratio hints',
    dimsMissingCount > 0 ? 'fail' : 'pass',
    [
      `pagesWithMissingImageDimensions=${dimsMissingCount}/${totalAudited}`,
      ...(allPagesDimsMissing
        ? ['All pages affected — Webflow does not always emit explicit width/height attributes']
        : [])
    ],
    ['published-webmcp-crawl'],
    allPagesDimsMissing ? 0.7 : 0.9,
    'Add width/height attributes or explicit aspect-ratio to image elements.'
  );

  const transitionRatio = totalInteractiveElements > 0
    ? totalInteractiveWithTransition / totalInteractiveElements
    : 0;
  const hasTransitionData = transitionSignalPages.length > 0;
  pushRow(
    'pages.transition_simple',
    'Page Level Checks',
    'Simple CSS transitions are used for hover/press states',
    !hasTransitionData ? 'manual'
      : transitionRatio >= 0.5 ? 'pass'
      : transitionRatio >= 0.2 ? 'partial'
      : 'fail',
    hasTransitionData
      ? [
          `interactiveElements=${totalInteractiveElements}`,
          `withTransitions=${totalInteractiveWithTransition}`,
          `ratio=${Math.round(transitionRatio * 100)}%`
        ]
      : ['Transition data not available.'],
    ['published-webmcp-crawl'],
    hasTransitionData ? 0.65 : 0.2,
    transitionRatio < 0.5
      ? 'Add CSS transitions (e.g. transition: opacity 0.2s ease) to buttons, links, and interactive elements for hover/press states.'
      : undefined
  );
  const transitionAllRatio = totalInteractiveWithTransition > 0
    ? totalInteractiveWithTransitionAll / totalInteractiveWithTransition
    : 0;
  const expensiveTransitionRatio = totalInteractiveWithTransition > 0
    ? totalInteractiveExpensiveTransitions / totalInteractiveWithTransition
    : 0;
  const specificTransitionRatio = totalInteractiveWithTransition > 0
    ? totalInteractiveWithSpecificTransition / totalInteractiveWithTransition
    : 0;
  const transitionPropertyStatus: UnifiedReviewStatus =
    !hasTransitionData
      ? 'manual'
      : expensiveTransitionRatio > 0.25 || transitionAllRatio > 0.5 || maxTransitionDurationMs > 900
        ? 'fail'
        : expensiveTransitionRatio > 0 || transitionAllRatio > 0.2 || averageTransitionDurationMs > 800
          ? 'partial'
          : 'pass';
  pushRow(
    'interactions.transition_properties',
    'Interactions Panel',
    'Transitions avoid "all" and expensive layout/filter properties on sampled interactive elements',
    transitionPropertyStatus,
    hasTransitionData
      ? [
          `withSpecificTransition=${totalInteractiveWithSpecificTransition}`,
          `withTransitionAll=${totalInteractiveWithTransitionAll}`,
          `gpuFriendlyTransitions=${totalInteractiveGpuFriendlyTransitions}`,
          `expensiveTransitions=${totalInteractiveExpensiveTransitions}`,
          `averageDurationMs=${Math.round(averageTransitionDurationMs)}`,
          `maxDurationMs=${Math.round(maxTransitionDurationMs)}`
        ]
      : ['Transition property data not available.'],
    ['published-webmcp-crawl'],
    hasTransitionData ? 0.72 : 0.2,
    transitionPropertyStatus === 'fail'
      ? 'Use specific transition properties instead of "all", prefer transform/opacity where possible, and avoid width/height/filter/box-shadow motion.'
      : transitionPropertyStatus === 'partial'
        ? 'Some interactive transitions still rely on broad or expensive properties. Tighten transition-property usage.'
        : undefined
  );

  // Aggregate contrast data across crawled pages
  const contrastPages = published.pages.filter((p) => p.summary?.contrast && p.summary.contrast.checked > 0);
  const totalContrastChecked = contrastPages.reduce(
    (sum, p) => sum + (p.summary?.contrast?.checked || 0), 0
  );
  const totalContrastPass = contrastPages.reduce(
    (sum, p) => sum + (p.summary?.contrast?.pass || 0), 0
  );
  const totalContrastFail = contrastPages.reduce(
    (sum, p) => sum + (p.summary?.contrast?.fail || 0), 0
  );
  const contrastPassRate = totalContrastChecked > 0 ? totalContrastPass / totalContrastChecked : 1;
  const hasContrastData = totalContrastChecked > 0;
  // Collect worst failures across all pages for evidence
  const allContrastFailures = contrastPages
    .flatMap((p) => p.summary?.contrast?.failures || [])
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 5);
  const failureEvidence = allContrastFailures.map(
    (f) => `"${f.text}" (${f.tag}): ${f.ratio}:1 on ${f.bg}, needs ${f.required}:1`
  );
  pushRow(
    'pages.wcag_contrast',
    'Page Level Checks',
    'WCAG AA contrast met (4.5:1 normal text, 3:1 large/bold text)',
    !hasContrastData ? 'manual'
      : contrastPassRate >= 0.9 ? 'pass'
      : contrastPassRate >= 0.7 ? 'partial'
      : 'fail',
    hasContrastData
      ? [
          `elementsChecked=${totalContrastChecked}`,
          `passing=${totalContrastPass}`,
          `failing=${totalContrastFail}`,
          `passRate=${Math.round(contrastPassRate * 100)}%`,
          ...(failureEvidence.length > 0 ? failureEvidence : []),
          'Note: uses ancestor background walk-up; hover/focus states require manual verification'
        ]
      : ['Color contrast data not available.'],
    ['published-webmcp-crawl'],
    hasContrastData ? 0.7 : 0.2,
    totalContrastFail > 0
      ? `${totalContrastFail} element(s) may not meet WCAG AA contrast ratio. Check text-on-background combinations.`
      : undefined
  );

  pushRow(
    'pages.cms_used_relational',
    'Page Level Checks',
    'CMS is used for repeatable/relational content',
    dCmsRel.status,
    dCmsRel.evidence,
    ['designer-mcp'],
    dCmsRel.confidence
  );

  const modernFormats = ['webp', 'avif', 'jpg', 'jpeg', 'png'];
  pushRow(
    'assets.modern_formats',
    'Page Level Checks',
    'Modern image formats are used (WebP, AVIF, JPEG, PNG)',
    formatKeys.some((format) => modernFormats.includes(format)) ? 'pass' : 'fail',
    [`detectedFormats=${formatKeys.join(',') || 'none'}`],
    ['published-webmcp-crawl'],
    0.86
  );
  const responsiveImagesStatus: UnifiedReviewStatus =
    assetSignalPages.length === 0 || totalPublishedImages === 0
      ? 'manual'
      : responsiveImageCoverage >= 0.8
        ? 'pass'
        : responsiveImageCoverage >= 0.4
          ? 'partial'
          : 'fail';
  pushRow(
    'assets.responsive_images',
    'Page Level Checks',
    'Published image elements show responsive image hints (srcset/sizes/picture)',
    responsiveImagesStatus,
    assetSignalPages.length > 0 && totalPublishedImages > 0
      ? [
          `images=${totalPublishedImages}`,
          `responsiveImages=${totalResponsiveImages}`,
          `imagesWithSrcset=${totalImagesWithSrcset}`,
          `imagesWithSizes=${totalImagesWithSizes}`,
          `navLogoImages=${maxNavLogoImages}`,
          `coverage=${Math.round(responsiveImageCoverage * 100)}%`
        ]
      : ['Responsive image signals were not available on the crawled sample.'],
    ['published-webmcp-crawl'],
    assetSignalPages.length > 0 ? 0.74 : 0.2,
    responsiveImagesStatus === 'fail'
      ? 'Enable responsive images so published image elements emit srcset/sizes or picture-based variants.'
      : responsiveImagesStatus === 'partial'
        ? 'Responsive image coverage is mixed across published pages. Check image settings on repeated components and CMS imagery.'
        : undefined
  );

  // Use published stylesheet breakpoint hints as deterministic responsive evidence.
  // Full visual validation still requires multi-viewport screenshots.
  const hasAllBreakpoints = dVarBreakpoints.status === 'pass';
  const responsiveStatus: UnifiedReviewStatus =
    responsiveViewportChecks.length > 0
      ? responsiveOverflowChecks.length > 0
        ? 'fail'
        : responsiveClippedTextChecks.length > 0
          ? 'partial'
          : 'pass'
      : hasPublishedStyleSignals && aggregatedBreakpointHints.length > 0
        ? 'partial'
        : hasAllBreakpoints
          ? 'partial'
          : 'manual';
  const responsiveEvidence =
    responsiveViewportChecks.length > 0
      ? [
          `pagesSampled=${published.responsive?.pagesSampled || 0}`,
          `viewportChecks=${published.responsive?.totalViewportChecks || 0}`,
          `overflowChecks=${responsiveOverflowChecks.length}`,
          `clippedTextChecks=${responsiveClippedTextChecks.length}`,
          ...(responsiveOverflowChecks[0]
            ? [
                `overflowExample=${new URL(responsiveOverflowChecks[0].pageUrl).pathname || '/'}@${responsiveOverflowChecks[0].label}:${responsiveOverflowChecks[0].sampleOverflowSelectors.join(' | ')}`
              ]
            : []),
          ...(responsiveClippedTextChecks[0]
            ? [
                `clippedTextExample=${new URL(responsiveClippedTextChecks[0].pageUrl).pathname || '/'}@${responsiveClippedTextChecks[0].label}:${responsiveClippedTextChecks[0].sampleClippedText.join(' | ')}`
              ]
            : [])
        ]
      : [
          `designerBreakpoints=${hasAllBreakpoints ? 'all present' : 'incomplete'}`,
          `publishedBreakpointHints=${aggregatedBreakpointHints.join(', ') || 'none'}`,
          `accessibleStyleSheets=${maxAccessibleStyleSheets}`,
          `pagesCrawled=${totalAudited}`,
          'Visual multi-viewport screenshot assertions not yet automated — verify manually.'
        ];
  pushRow(
    'responsive.multi_breakpoint_check',
    'Page Level Checks',
    'Responsive sample passes key published viewports or is surfaced for manual follow-up',
    responsiveStatus,
    responsiveEvidence,
    hasPublishedStyleSignals ? ['designer-mcp', 'published-webmcp-crawl'] : ['designer-mcp'],
    responsiveViewportChecks.length > 0
      ? 0.76
      : hasPublishedStyleSignals ? 0.52 : hasAllBreakpoints ? 0.4 : 0.25,
    responsiveStatus === 'fail'
      ? 'The published sample shows viewport overflow. Fix layout containment and retest tablet/mobile widths.'
      : responsiveStatus === 'partial'
        ? 'The published sample shows clipped text on sampled viewports. Review responsive spacing, sizing, and overflow behavior.'
        : undefined
  );
  const tapTargetStatus: UnifiedReviewStatus =
    responsiveViewportChecks.length === 0
      ? 'manual'
      : responsiveTinyTapChecks.length === 0
        ? 'pass'
        : 'partial';
  pushRow(
    'responsive.tap_target_sizing',
    'Page Level Checks',
    'Sampled interactive controls appear large enough for touch, with follow-up selectors when not',
    tapTargetStatus,
    responsiveViewportChecks.length > 0
      ? [
          `pagesSampled=${published.responsive?.pagesSampled || 0}`,
          `viewportChecks=${published.responsive?.totalViewportChecks || 0}`,
          `tapTargetChecksWithIssues=${responsiveTinyTapChecks.length}`,
          ...(firstResponsiveTinyTapCheck
            ? [
                `tapTargetExample=${new URL(firstResponsiveTinyTapCheck.pageUrl).pathname || '/'}@${firstResponsiveTinyTapCheck.label}:${firstResponsiveTinyTapCheck.tinyTapTargets}`,
                ...(firstResponsiveTinyTapCheck.sampleTinyTapSelectors.length > 0
                  ? [`sampleSelectors=${firstResponsiveTinyTapCheck.sampleTinyTapSelectors.join(' | ')}`]
                  : [])
              ]
            : [])
        ]
      : ['Responsive touch-target signals were not available.'],
    ['published-webmcp-crawl'],
    responsiveViewportChecks.length > 0 ? 0.42 : 0.2,
    tapTargetStatus === 'partial'
      ? 'Review the sampled selectors for mobile/tablet control size. Treat this as a follow-up signal rather than a hard published-truth failure.'
      : undefined
  );

  // Policy checks (deterministic)
  // Reuse the blended instructions-page signal so policy-dependent rows do not
  // drift from the unified required-pages row.
  const hasInstructionsPage = instructionsPageDetected;
  pushRow(
    'policy.powered_by_webflow',
    'Submission Policy',
    '"Powered by Webflow" badge is present and visible',
    policy.hasPoweredByWebflow ? 'pass' : 'fail',
    [`hasPoweredByWebflow=${policy.hasPoweredByWebflow}`],
    ['published-webmcp-crawl'],
    0.9,
    'Do not remove the "Powered by Webflow" badge. It must remain visible on the published site.'
  );
  pushRow(
    'policy.no_affiliate_links',
    'Submission Policy',
    'No affiliate or referral links found',
    policy.affiliateLinkCount === 0 ? 'pass' : 'fail',
    [
      `affiliateLinkCount=${policy.affiliateLinkCount}`,
      ...(policy.affiliateLinks.length > 0
        ? [`examples=${policy.affiliateLinks.slice(0, 5).join(' | ')}`]
        : [])
    ],
    ['published-webmcp-crawl'],
    0.85,
    'Remove all affiliate and referral links before submission.'
  );
  // GSAP detected + instructions page exists = pass (requirement met).
  // GSAP detected + no instructions page = partial (needs documentation).
  const gsapStatus: UnifiedReviewStatus = !policy.hasGsap
    ? 'pass'
    : hasInstructionsPage ? 'pass' : 'partial';
  pushRow(
    'policy.gsap_detected',
    'Submission Policy',
    'GSAP/ScrollTrigger usage detected (requires instructions page and library attachment)',
    gsapStatus,
    [
      `hasGsap=${policy.hasGsap}`,
      `hasInstructionsPage=${hasInstructionsPage}`,
      ...(policy.hasGsap && !hasInstructionsPage
        ? ['GSAP detected but no Instructions page found — add one documenting setup.']
        : []),
      ...(policy.hasGsap && hasInstructionsPage
        ? ['GSAP detected and Instructions page exists.']
        : [])
    ],
    ['designer-mcp', 'published-webmcp-crawl'],
    policy.hasGsap ? (hasInstructionsPage ? 0.85 : 0.75) : 0.85
  );
  // Same pattern for custom code: detected + instructions = pass.
  const customCodeStatus: UnifiedReviewStatus = !policy.hasCustomCode
    ? 'pass'
    : hasInstructionsPage ? 'pass' : 'partial';
  pushRow(
    'policy.custom_code_detected',
    'Submission Policy',
    'Custom code is present (requires instructions page)',
    customCodeStatus,
    [
      `hasCustomCode=${policy.hasCustomCode}`,
      `hasInstructionsPage=${hasInstructionsPage}`,
      ...(policy.hasCustomCode && !hasInstructionsPage
        ? ['Custom code detected but no Instructions page found — add one documenting usage.']
        : []),
      ...(policy.hasCustomCode && hasInstructionsPage
        ? ['Custom code detected and Instructions page exists.']
        : [])
    ],
    ['designer-mcp', 'published-webmcp-crawl'],
    policy.hasCustomCode ? (hasInstructionsPage ? 0.85 : 0.7) : 0.85
  );

  // Internal broken link detection: verify actual same-origin link targets seen on
  // crawled pages. If some linked targets were not crawled successfully, report a
  // partial result instead of a false clean pass.
  const crawledPagesByUrl = new Map(
    published.pages.map((page) => [
      comparableSameOriginUrl(page.url, published.origin) ?? page.url.toLowerCase().replace(/\/$/, ''),
      page
    ])
  );
  const allInternalLinks = new Set<string>();
  for (const page of published.pages) {
    for (const target of page.internalLinks || []) {
      const comparable = comparableSameOriginUrl(target, published.origin);
      if (comparable) allInternalLinks.add(comparable);
    }
  }

  const brokenInternalLinks: string[] = [];
  const uncheckedInternalLinks: string[] = [];
  let verifiedInternalLinks = 0;

  for (const target of allInternalLinks) {
    const matchingPage = crawledPagesByUrl.get(target);
    if (!matchingPage) {
      uncheckedInternalLinks.push(new URL(target).pathname);
      continue;
    }
    if (matchingPage.error || !matchingPage.summary) {
      uncheckedInternalLinks.push(new URL(target).pathname);
      continue;
    }
    if (is404PageTitle(matchingPage.title)) {
      brokenInternalLinks.push(new URL(target).pathname);
      continue;
    }
    verifiedInternalLinks += 1;
  }

  const hasIncompleteLinkEvidence =
    allInternalLinks.size === 0 &&
    (published.skippedUrls.length > 0 || published.pages.some((page) => Boolean(page.error)));
  const brokenInternalLinkStatus: UnifiedReviewStatus =
    brokenInternalLinks.length > 0
      ? 'fail'
      : uncheckedInternalLinks.length > 0 || hasIncompleteLinkEvidence
        ? 'partial'
        : 'pass';
  const brokenInternalLinkConfidence = brokenInternalLinks.length > 0
    ? 0.88
    : uncheckedInternalLinks.length > 0 || hasIncompleteLinkEvidence
      ? 0.65
      : 0.9;
  pushRow(
    'links.no_broken_internal',
    'Page Level Checks',
    'No broken internal links (all linked pages resolve correctly)',
    brokenInternalLinkStatus,
    [
      `linkedTargets=${allInternalLinks.size}`,
      `verifiedTargets=${verifiedInternalLinks}`,
      `brokenLinks=${brokenInternalLinks.length}`,
      `uncheckedTargets=${uncheckedInternalLinks.length}`,
      `insufficientEvidence=${hasIncompleteLinkEvidence}`,
      ...(brokenInternalLinks.length > 0
        ? [`paths=${brokenInternalLinks.slice(0, 10).join(', ')}`]
        : []),
      ...(brokenInternalLinkStatus === 'partial' && uncheckedInternalLinks.length > 0
        ? [`uncheckedPaths=${uncheckedInternalLinks.slice(0, 10).join(', ')}`]
        : [])
    ],
    ['published-webmcp-crawl'],
    brokenInternalLinkConfidence,
    brokenInternalLinks.length > 0
      ? `${brokenInternalLinks.length} internal link(s) resolve to 404. Fix or remove these links.`
      : brokenInternalLinkStatus === 'partial'
        ? 'Linked internal targets were not fully verified from crawl evidence, so this check is not yet complete. Increase crawl coverage or rerun the review.'
        : undefined
  );

  // Accessible link names: links without text, aria-label, or img alt
  const missingAccessibleNameCount = published.issueCounts.linksMissingAccessibleName;
  pushRow(
    'a11y.link_accessible_names',
    'Accessibility',
    'All links have accessible names (text, aria-label, or nested img alt)',
    missingAccessibleNameCount === 0 ? 'pass' : 'fail',
    [`pagesWithIssue=${missingAccessibleNameCount}/${totalAudited}`],
    ['published-webmcp-crawl'],
    0.85,
    missingAccessibleNameCount > 0
      ? 'Add text content, aria-label, or nested img with alt to all links.'
      : undefined
  );
  const landmarksStatus: UnifiedReviewStatus =
    accessibilitySignalPages.length === 0
      ? 'manual'
      : allSampledPagesHaveMainLandmark && allSampledPagesHaveNavLandmark
        ? anySampledPageHasSkipLink ? 'pass' : 'partial'
        : 'fail';
  pushRow(
    'a11y.landmarks_present',
    'Accessibility',
    'Main and navigation landmarks are present; skip link is surfaced when available',
    landmarksStatus,
    accessibilitySignalPages.length > 0
      ? [
          `pagesChecked=${accessibilitySignalPages.length}`,
          `allHaveMainLandmark=${allSampledPagesHaveMainLandmark}`,
          `allHaveNavLandmark=${allSampledPagesHaveNavLandmark}`,
          `anySkipLink=${anySampledPageHasSkipLink}`
        ]
      : ['Accessibility landmark signals were not available.'],
    ['published-webmcp-crawl'],
    accessibilitySignalPages.length > 0 ? 0.72 : 0.2,
    landmarksStatus === 'fail'
      ? 'Use semantic main/nav landmarks on published pages. Add a skip-to-content link where appropriate.'
      : landmarksStatus === 'partial'
        ? 'Landmarks are present, but a skip link was not detected in the published sample.'
        : undefined
  );
  const descriptiveLinkStatus: UnifiedReviewStatus =
    accessibilitySignalPages.length === 0
      ? 'manual'
      : totalGenericLinkLabels === 0
        ? 'pass'
        : totalGenericLinkLabels <= accessibilitySignalPages.length
          ? 'partial'
          : 'fail';
  pushRow(
    'a11y.descriptive_link_labels',
    'Accessibility',
    'Published link labels avoid generic phrasing like "learn more" without added context',
    descriptiveLinkStatus,
    accessibilitySignalPages.length > 0
      ? [
          `genericLinkLabels=${totalGenericLinkLabels}`,
          ...(sampleGenericLinkLabels.length > 0
            ? [`samples=${sampleGenericLinkLabels.join(', ')}`]
            : [])
        ]
      : ['Descriptive link label signals were not available.'],
    ['published-webmcp-crawl'],
    accessibilitySignalPages.length > 0 ? 0.58 : 0.2,
    descriptiveLinkStatus === 'fail'
      ? 'Replace generic repeated link labels with more descriptive text or augment them with contextual aria-labels.'
      : undefined
  );

  // Empty href links: these are broken navigation elements
  const emptyHrefCount = published.issueCounts.linksEmptyHref;
  pushRow(
    'links.no_empty_href',
    'Page Level Checks',
    'No links with empty href attributes',
    emptyHrefCount === 0 ? 'pass' : 'fail',
    [`pagesWithEmptyHref=${emptyHrefCount}/${totalAudited}`],
    ['published-webmcp-crawl'],
    0.85,
    emptyHrefCount > 0
      ? 'Fix or remove links with empty href="" attributes — they cause navigation issues.'
      : undefined
  );

  // External links: should have target="_blank" and rel="noopener"
  const blankTargetMissingRelCount = published.issueCounts.linksMissingRel;
  pushRow(
    'links.external_target_blank',
    'Page Level Checks',
    'Links using target="_blank" include rel="noopener"',
    blankTargetMissingRelCount === 0 ? 'pass' : 'fail',
    [`pagesWithMissingRel=${blankTargetMissingRelCount}/${totalAudited}`],
    ['published-webmcp-crawl'],
    0.8,
    blankTargetMissingRelCount > 0
      ? 'Add rel="noopener" to all external links with target="_blank".'
      : undefined
  );

  // Form validation: check forms have labels, required fields, and submission handling
  const formPages = published.pages.filter(
    (p) => p.summary && (p.summary.forms?.fields || 0) > 0
  );
  const totalFormFields = formPages.reduce(
    (sum, p) => sum + (p.summary?.forms?.fields || 0), 0
  );
  const totalMissingLabels = formPages.reduce(
    (sum, p) => sum + (p.summary?.forms?.missingLabels || 0), 0
  );
  const formLabelRatio = totalFormFields > 0
    ? (totalFormFields - totalMissingLabels) / totalFormFields
    : 1;
  pushRow(
    'forms.labels_present',
    'Page Level Checks',
    'All form fields have associated labels or aria-labels',
    totalMissingLabels === 0 ? 'pass'
      : formLabelRatio >= 0.8 ? 'partial'
      : 'fail',
    [
      `totalFields=${totalFormFields}`,
      `missingLabels=${totalMissingLabels}`,
      `pagesWithForms=${formPages.length}`,
      `labelCoverage=${Math.round(formLabelRatio * 100)}%`
    ],
    ['published-webmcp-crawl'],
    0.8,
    totalMissingLabels > 0
      ? `${totalMissingLabels} form field(s) missing labels. Add <label for="..."> or aria-label attributes.`
      : undefined
  );
  const formFieldTypeStatus: UnifiedReviewStatus =
    formSignalPages.length === 0
      ? 'pass'
      : totalWrongFieldTypes === 0
        ? 'pass'
        : totalWrongFieldTypes <= formSignalPages.length
          ? 'partial'
          : 'fail';
  pushRow(
    'forms.field_types',
    'Page Level Checks',
    'Common form fields use matching HTML input types (email, tel, url)',
    formFieldTypeStatus,
    [
      `pagesWithForms=${formSignalPages.length}`,
      `wrongFieldTypes=${totalWrongFieldTypes}`,
      ...(sampleWrongFieldTypes.length > 0
        ? [`samples=${sampleWrongFieldTypes.join(', ')}`]
        : [])
    ],
    ['published-webmcp-crawl'],
    formSignalPages.length > 0 ? 0.76 : 0.82,
    totalWrongFieldTypes > 0
      ? 'Use semantic field types like email, tel, and url where the field purpose clearly matches.'
      : undefined
  );

  // Content quality checks
  const loremPages = published.pages.filter((p) => p.contentQuality?.hasLoremIpsum);
  const placeholderPages = published.pages.filter((p) => p.contentQuality?.hasPlaceholderText);
  const loremPaths = loremPages
    .map((p) => p.url.replace(published.origin, ''))
    .slice(0, 5);
  const placeholderPaths = placeholderPages
    .map((p) => p.url.replace(published.origin, ''))
    .slice(0, 5);
  const hasContentIssues = loremPages.length > 0 || placeholderPages.length > 0;
  pushRow(
    'content.no_placeholder_text',
    'Content Quality',
    'No Lorem Ipsum or placeholder text on any page',
    hasContentIssues ? 'fail' : 'pass',
    [
      `pagesWithLoremIpsum=${loremPages.length}/${totalAudited}`,
      `pagesWithPlaceholderText=${placeholderPages.length}/${totalAudited}`,
      ...(loremPaths.length > 0 ? [`loremPages=${loremPaths.join(', ')}`] : []),
      ...(placeholderPaths.length > 0 ? [`placeholderPages=${placeholderPaths.join(', ')}`] : [])
    ],
    ['published-webmcp-crawl'],
    0.9,
    hasContentIssues
      ? 'Remove all Lorem Ipsum and placeholder text before submission. Replace with real sample content.'
      : undefined
  );

  // Site settings checks (from review checklist: favicons, fonts, connected apps)
  const settings = published.siteSettings;
  pushRow(
    'settings.custom_favicon',
    'Site Settings',
    'Custom favicon is set (not the default Webflow favicon)',
    settings.hasCustomFavicon ? 'pass' : 'fail',
    [`hasCustomFavicon=${settings.hasCustomFavicon}`],
    ['published-webmcp-crawl'],
    0.85,
    settings.hasCustomFavicon
      ? undefined
      : 'Upload a custom favicon in Site Settings to replace the default Webflow icon.'
  );
  pushRow(
    'settings.custom_webclip',
    'Site Settings',
    'Custom webclip/apple-touch icon is set',
    settings.hasCustomWebclip ? 'pass' : 'fail',
    [`hasCustomWebclip=${settings.hasCustomWebclip}`],
    ['published-webmcp-crawl'],
    0.82,
    settings.hasCustomWebclip
      ? undefined
      : 'Upload a custom webclip/apple-touch icon in Site Settings.'
  );

  // Custom fonts: if present, they need a license page or to be from a free source
  const hasLicensedFonts = settings.hasCustomFonts && (
    settings.customFontSources.some((s) => s.includes('fonts.googleapis.com')) ||
    hasLicensePage
  );
  pushRow(
    'settings.custom_fonts',
    'Site Settings',
    'No custom fonts, or custom fonts have proper licensing documented',
    !settings.hasCustomFonts ? 'pass'
      : hasLicensedFonts ? 'pass'
      : 'fail',
    [
      `hasCustomFonts=${settings.hasCustomFonts}`,
      ...(settings.customFontSources.length > 0
        ? [`sources=${settings.customFontSources.slice(0, 3).map((s) => new URL(s).hostname).join(', ')}`]
        : []),
      ...(settings.hasCustomFonts && !hasLicensedFonts
        ? ['Custom fonts detected without license documentation']
        : [])
    ],
    ['published-webmcp-crawl'],
    0.8,
    settings.hasCustomFonts && !hasLicensedFonts
      ? 'Document font licenses on the License page, or use free fonts (Google Fonts).'
      : undefined
  );

  pushRow(
    'settings.no_connected_apps',
    'Site Settings',
    'No connected third-party apps or tracking scripts',
    settings.detectedApps.length === 0 ? 'pass' : 'fail',
    [
      `detectedApps=${settings.detectedApps.length}`,
      ...(settings.detectedApps.length > 0
        ? [`apps=${settings.detectedApps.join(', ')}`]
        : [])
    ],
    ['published-webmcp-crawl'],
    0.85,
    settings.detectedApps.length > 0
      ? `Remove connected apps before submission: ${settings.detectedApps.join(', ')}`
      : undefined
  );

  // Coverage check: flag if any pages were not crawled
  const skipped = published.skippedUrls || [];
  const coveragePct = published.visitedPages > 0
    ? Math.round((published.visitedPages / (published.visitedPages + skipped.length)) * 100)
    : 0;
  pushRow(
    'coverage.all_pages_crawled',
    'Page Level Checks',
    'All template pages were crawled and evaluated against the rubric',
    skipped.length === 0 ? 'pass' : 'fail',
    [
      `crawled=${published.visitedPages}`,
      `skipped=${skipped.length}`,
      `coverage=${coveragePct}%`,
      ...(skipped.length > 0
        ? [`skippedUrls=${skipped.slice(0, 10).map((u) => new URL(u).pathname).join(', ')}`]
        : [])
    ],
    ['published-webmcp-crawl'],
    0.95,
    skipped.length > 0
      ? `${skipped.length} page(s) were not crawled. Increase crawlMaxPages or review manually.`
      : undefined
  );

  return includeManual ? rows : rows.filter((row) => row.status !== 'manual');
}

async function runTemplateReviewTool(
  input: RunTemplateReviewInput,
  options: RunTemplateReviewOptions = {}
): Promise<UnifiedTemplateReviewReport> {
  const guardError = getRunTemplateReviewSyncGuardError(input);
  if (guardError) {
    throw new Error(guardError);
  }
  return executeTemplateReview(input, options);
}

async function executeTemplateReview(
  input: RunTemplateReviewInput,
  options: RunTemplateReviewOptions = {}
): Promise<UnifiedTemplateReviewReport> {
  const startedAtMs = Date.now();
  if (!input?.publishedUrl) {
    throw new Error('`publishedUrl` is required.');
  }

  const manager = getProvider();
  const provider = manager.getProvider();
  const metricsBefore = snapshotProviderMetrics(provider);
  const includeManual = input.includeManual !== false;
  const reportProgress = options.reportProgress;
  const timeout = input.timeout ?? 90000;
  const designerMode = input.designerMode ?? 'best-effort';
  const designerTimeout = Math.max(
    5000,
    Math.min(input.designerTimeout ?? timeout, timeout)
  );
  const previewUrl = input.previewUrl;

  if (designerMode !== 'skip' && !previewUrl) {
    throw new Error('`previewUrl` is required unless `designerMode` is set to `skip`.');
  }

  if (reportProgress) await reportProgress(0, 100, 'Starting unified template review');
  const precheck = await runPublishedFetchProbe(
    input.publishedUrl,
    Math.min(timeout, 30000),
    classifyUrls
  );
  if (precheck.errors.length > 0) {
    throw new Error(`Published precheck failed: ${precheck.errors.join('; ')}`);
  }

  if (reportProgress) await reportProgress(5, 100, 'Published precheck complete');
  let designer: DesignerChecklistReport;

  if (designerMode === 'skip') {
    designer = createUnavailableDesignerChecklistReport(
      'Designer preview extraction skipped (`designerMode=skip`). Published review only.',
      { url: previewUrl, includeManual: true }
    );
    if (reportProgress) {
      await reportProgress(35, 100, 'Designer extraction skipped; continuing with published review');
    }
  } else {
    if (reportProgress) await reportProgress(5, 100, 'Running Designer checklist extraction');
    try {
      designer = await withTimeout(
        scoreDesignerChecklistTool({
          url: previewUrl,
          timeout: designerTimeout,
          includeManual: true
        }),
        designerTimeout,
        `Designer checklist extraction timed out after ${designerTimeout}ms`
      );
      if (reportProgress) await reportProgress(35, 100, 'Designer checklist extraction complete');
    } catch (error) {
      if (designerMode === 'required') {
        throw error;
      }
      designer = createUnavailableDesignerChecklistReport(
        `Designer preview extraction unavailable. ${describeError(error)}`,
        { url: previewUrl, includeManual: true }
      );
      if (reportProgress) {
        await reportProgress(
          35,
          100,
          'Designer extraction unavailable; continuing with published review'
        );
      }
    }
  }

  // Use URL classifications to build the crawl queue.
  // Critical pages (license, instructions, changelog, style-guide, homepage) go first.
  // Error pages (404, password) are excluded — they waste browser time.
  // The classifier (LLM or deterministic) handles non-standard naming.
  const classified = precheck.classifiedUrls || [];
  const priorityOrder: Record<string, number> = { critical: 0, normal: 1, low: 2 };

  // Filter out error pages and sort by priority
  const classifiedSeedUrls = classified
    .filter((c) => c.classification !== 'error-page')
    .sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1))
    .map((c) => c.url);

  // Also resolve Designer page slugs against discovered URLs to fill gaps
  const publishedOrigin = new URL(input.publishedUrl).origin;
  const discoveredLower = precheck.discoveredUrls.map((u) => u.toLowerCase());
  const designerPageSlugs = designer.metadataSummary.pages
    .map((p) => {
      const slug = p.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (slug === 'home') return publishedOrigin;
      const bareUrl = `${publishedOrigin}/${slug}`;
      if (discoveredLower.includes(bareUrl.toLowerCase())) return bareUrl;
      const match = precheck.discoveredUrls.find(
        (u) => u.toLowerCase().endsWith(`/${slug}`)
      );
      return match || null;
    })
    .filter((url): url is string => url !== null);

  const allSeedUrls = Array.from(new Set([...classifiedSeedUrls, ...designerPageSlugs]));

  const published = await crawlPublishedWebMcp(input.publishedUrl, {
    timeout: input.timeout,
    crawlMaxPages: input.crawlMaxPages,
    crawlMaxDepth: input.crawlMaxDepth,
    seedUrls: allSeedUrls,
    fetchProbe: precheck.probe,
    classifiedUrls: precheck.classifiedUrls,
    onProgress: reportProgress
      ? async (processedPages, maxPages, message) => {
          const cappedMax = Math.max(1, maxPages);
          const ratio = Math.min(1, processedPages / cappedMax);
          const progress = 35 + Math.round(ratio * 55);
          await reportProgress(progress, 100, message);
        }
      : undefined
  });

  if (reportProgress) await reportProgress(92, 100, 'Normalizing unified checklist rows');

  const rows = unifyRows(designer, published, includeManual, precheck);

  // Compute weighted score: severity determines point deduction for failures
  const severityWeights: Record<string, number> = {
    critical: 20, major: 10, minor: 5, info: 2
  };
  let totalWeight = 0;
  let earnedWeight = 0;
  const counts = { pass: 0, fail: 0, partial: 0, manual: 0 };

  for (const row of rows) {
    if (row.status === 'pass') counts.pass++;
    else if (row.status === 'fail') counts.fail++;
    else if (row.status === 'partial') counts.partial++;
    else counts.manual++;

    // Only scored checks (pass/fail/partial) contribute to the weighted score
    if (row.status === 'manual') continue;
    const weight = severityWeights[row.severity] || 5;
    totalWeight += weight;
    if (row.status === 'pass') earnedWeight += weight;
    else if (row.status === 'partial') earnedWeight += weight * 0.5;
    // fail earns 0
  }

  const overallScore = totalWeight > 0
    ? Math.round((earnedWeight / totalWeight) * 100)
    : 0;
  const grade = overallScore >= 90 ? 'A' as const
    : overallScore >= 75 ? 'B' as const
    : overallScore >= 60 ? 'C' as const
    : overallScore >= 40 ? 'D' as const
    : 'F' as const;

  // Page crawl coverage: compare known pages (from all sources) vs actually crawled
  const totalKnownPages = allSeedUrls.length;
  const crawledPages = published.visitedPages;
  const skippedPages = published.skippedUrls.length;
  const coveragePercent = totalKnownPages > 0
    ? Math.round((crawledPages / totalKnownPages) * 100)
    : 100;

  const summary: import('./types.js').UnifiedTemplateReviewSummary = {
    ...counts,
    automated: counts.pass + counts.fail,
    humanInLoop: counts.partial + counts.manual,
    overallScore,
    grade,
    coverage: {
      totalKnownPages,
      crawledPages,
      skippedPages,
      coveragePercent
    }
  };
  const providerMetrics = diffProviderMetrics(metricsBefore, provider.getSessionMetrics());

  if (reportProgress) await reportProgress(100, 100, 'Unified template review complete');

  return {
    durationMs: Date.now() - startedAtMs,
    generatedAt: new Date().toISOString(),
    provider: provider.name,
    previewUrl,
    publishedUrl: input.publishedUrl,
    precheck,
    providerMetrics,
    summary,
    designer,
    published,
    rows
  };
}

function enqueueTemplateReview(input: EnqueueTemplateReviewInput): TemplateReviewJobRecord {
  return getTemplateReviewJobManager().enqueue(input);
}

function getTemplateReviewJob(input: GetTemplateReviewJobInput): TemplateReviewJobRecord {
  const job = getTemplateReviewJobManager().get(input.jobId);
  if (!job) {
    throw new Error(`Template review job not found: ${input.jobId}`);
  }
  return job;
}

function listTemplateReviewJobs(input: ListTemplateReviewJobsInput = {}): TemplateReviewJobRecord[] {
  return getTemplateReviewJobManager().list({
    status: input.status as TemplateReviewJobStatus | undefined,
    limit: input.limit
  });
}

// =============================================================================
// Tool Handlers - Intelligence Layer
// =============================================================================

async function getProviderStatus(): Promise<{
  provider: string;
  isHealthy: boolean;
  metrics: ReturnType<ProviderManager['getHealthMetrics']>;
  sessionMetrics: ReturnType<ReturnType<ProviderManager['getProvider']>['getSessionMetrics']>;
  mode: 'passive' | 'active';
}> {
  const manager = getProvider();
  const provider = manager.getProvider();
  const isHealthy = await manager.checkHealth();

  return {
    provider: provider.name,
    isHealthy,
    mode: 'passive',
    metrics: manager.getHealthMetrics(),
    sessionMetrics: provider.getSessionMetrics()
  };
}

async function listScriptVersions(scriptName: string): Promise<{
  scriptName: string;
  activeVersion: string;
  testingVersion: string | null;
  versions: Array<{
    id: string;
    version: string;
    status: string;
    createdAt: string;
    createdBy: string;
    changelog: string;
  }>;
}> {
  const reg = await getScriptRegistry();
  const state = reg.getRegistryState();
  const versions = reg.getVersions(scriptName);

  return {
    scriptName,
    activeVersion: state.activeVersions[scriptName] || 'none',
    testingVersion: state.testingVersions[scriptName] || null,
    versions: versions.map(v => ({
      id: v.id,
      version: v.version,
      status: v.status,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      changelog: v.changelog
    }))
  };
}

async function getVersionMetrics(versionId: string): Promise<{
  versionId: string;
  metrics: ReturnType<RegistryManager['getMetrics']> | null;
}> {
  const reg = await getScriptRegistry();
  return {
    versionId,
    metrics: reg.getMetrics(versionId) || null
  };
}

async function recordFeedback(feedback: {
  versionId: string;
  url: string;
  rating: 1 | 2 | 3 | 4 | 5;
  issues?: Array<{
    type: 'missing' | 'incorrect' | 'extra' | 'timeout' | 'error';
    description: string;
    selector?: string;
  }>;
  notes?: string;
  extractedData?: unknown;
  expectedData?: unknown;
}): Promise<{ success: boolean; feedbackId: string }> {
  const reg = await getScriptRegistry();
  
  const feedbackRecord: ExtractionFeedback = {
    id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    versionId: feedback.versionId,
    url: feedback.url,
    timestamp: new Date().toISOString(),
    extractedData: feedback.extractedData,
    expectedData: feedback.expectedData,
    issues: (feedback.issues || []) as FeedbackIssue[],
    rating: feedback.rating,
    notes: feedback.notes
  };

  await reg.recordFeedback(feedbackRecord);

  return { success: true, feedbackId: feedbackRecord.id };
}

async function runAnalysisCycle(scriptName: string): Promise<ReturnType<ReturnType<typeof createIntelligenceAnalyzer>['runAnalysisCycle']>> {
  const reg = await getScriptRegistry();
  const analyzer = createIntelligenceAnalyzer(reg);
  return analyzer.runAnalysisCycle(scriptName);
}

async function promoteVersion(versionId: string, to: 'testing' | 'active'): Promise<{ success: boolean }> {
  const reg = await getScriptRegistry();
  await reg.promoteVersion(versionId, to);
  return { success: true };
}

async function createScriptVersion(input: {
  scriptName: string;
  code: string;
  changelog: string;
}): Promise<{ versionId: string }> {
  const reg = await getScriptRegistry();
  const version = await reg.createVersion(
    input.scriptName,
    input.code,
    input.changelog,
    'agent'
  );
  return { versionId: version.id };
}

async function compareVersions(baseVersionId: string, compareVersionId: string): Promise<{
  comparison: ReturnType<RegistryManager['compareVersions']>;
}> {
  const reg = await getScriptRegistry();
  return {
    comparison: reg.compareVersions(baseVersionId, compareVersionId)
  };
}

async function getWebflowReviewPolicy(refresh = false) {
  if (refresh) {
    return refreshWebflowPolicySnapshot();
  }
  return getWebflowPolicySnapshot(false);
}

type RequestHandlerExtraLike = {
  _meta?: Record<string, unknown>;
  sendNotification?: (notification: unknown) => Promise<void>;
};

function createProgressReporter(extra?: RequestHandlerExtraLike): ProgressReporter | undefined {
  if (!extra || typeof extra.sendNotification !== 'function') return undefined;
  const sendNotification = extra.sendNotification;
  const meta = asRecord(extra._meta);
  const progressToken = meta.progressToken;
  if (typeof progressToken !== 'string' && typeof progressToken !== 'number') return undefined;

  return async (progress: number, total: number, message: string) => {
    try {
      await sendNotification({
        method: 'notifications/progress',
        params: {
          progressToken,
          progress: Math.max(0, progress),
          total: Math.max(1, total),
          message
        }
      });
    } catch {
      // Best effort only; don't fail tool execution if progress notification fails.
    }
  };
}

// =============================================================================
// MCP Server Setup
// =============================================================================

export function createAnalyzerServer(): Server {
  const server = new Server(
    {
      name: 'webflow-site-analyzer-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // =========================================================================
      // Automation Layer Tools (Analysis)
      // =========================================================================
      {
        name: 'analyze_touchpoints',
        description: 'Extract all interactive elements (links, buttons, forms, Webflow interactions) from a Webflow page. Uses versioned extraction scripts.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL of the Webflow page to analyze' },
            waitForSelector: { type: 'string', description: 'Optional CSS selector to wait for before extraction' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 60000)' }
          },
          required: ['url']
        },
      },
      {
        name: 'extract_seo',
        description: 'Extract SEO data including meta tags, headings, links, images, and structured data with scoring',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to analyze for SEO' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 60000)' }
          },
          required: ['url']
        }
      },
      {
        name: 'get_page_structure',
        description: 'Extract hierarchical page structure including sections, navbar, footer, and Webflow components',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to analyze' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 60000)' }
          },
          required: ['url']
        }
      },
      {
        name: 'analyze_images',
        description: 'Analyze all images for optimization: formats, dimensions, alt text, lazy loading',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to analyze' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 60000)' }
          },
          required: ['url']
        }
      },
      {
        name: 'get_performance',
        description: 'Get performance metrics including load time, paint timings, and resource breakdown',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to analyze' },
            timeout: { type: 'number', description: 'Timeout in milliseconds (default: 60000)' }
          },
          required: ['url']
        }
      },
      {
        name: 'capture_screenshot',
        description: 'Capture a screenshot of a Webflow page',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to capture' },
            fullPage: { type: 'boolean', description: 'Capture full page or viewport only (default: true)' },
            viewport: {
              type: 'object',
              properties: { width: { type: 'number' }, height: { type: 'number' } }
            },
            format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
            quality: { type: 'number', description: 'Quality 0-100 for jpeg/webp' }
          },
          required: ['url']
        }
      },
      {
        name: 'get_provider_status',
        description: 'Get browser provider health status and session metrics without opening a new browser session',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'extract_designer_metadata',
        description: 'Extract panel-derived template metadata from a Webflow Designer Preview URL. Navigates through Designer panels to gather pages, CSS classes, components, interactions, CMS collections, visible Assets panel labels, and site settings. Asset labels may be truncated by the Webflow UI. Only works with Webflow preview URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { 
              type: 'string', 
              description: 'Webflow preview URL (must be preview.webflow.com/preview/...)' 
            },
            timeout: { 
              type: 'number', 
              description: 'Timeout in milliseconds (default: 120000 for panel navigation)' 
            }
          },
          required: ['url']
        },
      },
      {
        name: 'score_designer_checklist',
        description: 'Score Webflow Designer-focused checklist rows (strict pass/fail/manual) using panel-derived Designer metadata. Accepts either a live preview URL or a previously extracted designerMetadata payload and inherits the same preview-panel limits.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Webflow preview URL. If provided, live extraction runs before scoring.'
            },
            timeout: {
              type: 'number',
              description: 'Optional timeout (ms) for live extraction when url is provided.'
            },
            includeManual: {
              type: 'boolean',
              description: 'Include manual/not-automated rows in output (default: true).'
            },
            designerMetadata: {
              type: 'object',
              description: 'Optional Designer metadata payload from extract_designer_metadata.'
            }
          },
        }
      },
      {
        name: 'run_template_review',
        description: 'Synchronous template review execution for debugging or bounded manual smoke use. Runs a deterministic published fetch precheck first, then a published browser probe (DOM fallback plus optional __wfReview enrichment). Designer preview extraction is optional and can run in required, best-effort, or skip mode. Longer remote reviews may be rejected with guidance to use enqueue_template_review instead.',
        inputSchema: {
          type: 'object',
          properties: {
            previewUrl: {
              type: 'string',
              description: 'Optional Webflow preview URL for Designer extraction/scoring. Required unless designerMode is skip.'
            },
            publishedUrl: {
              type: 'string',
              description: 'Published site URL with WebMCP snippet installed.'
            },
            timeout: {
              type: 'number',
              description: 'Optional per-page timeout in milliseconds (default: 90000).'
            },
            designerTimeout: {
              type: 'number',
              description: 'Optional timeout in milliseconds for Designer extraction. Defaults to timeout and is capped by timeout.'
            },
            designerMode: {
              type: 'string',
              enum: ['required', 'best-effort', 'skip'],
              description: 'How preview extraction is handled. best-effort continues with published-only evidence if preview extraction fails or times out. Default: best-effort.'
            },
            allowLongSync: {
              type: 'boolean',
              description: 'Optional escape hatch for remote deployments. When true, bypasses the bounded-sync guard and attempts the long synchronous review anyway.'
            },
            includeManual: {
              type: 'boolean',
              description: 'Include manual rows in final output (default: true).'
            },
            crawlMaxPages: {
              type: 'number',
              description: 'Optional maximum published pages to crawl. By default the review attempts full discovered coverage.'
            },
            crawlMaxDepth: {
              type: 'number',
              description: 'Optional maximum crawl depth from publishedUrl. By default the review does not impose a depth cap.'
            }
          },
          required: ['publishedUrl']
        }
      },
      {
        name: 'enqueue_template_review',
        description: 'Queue an async template review job with bounded concurrency. Uses the same published fetch precheck plus browser probe pipeline as run_template_review, with optional Designer preview extraction in required, best-effort, or skip mode. This is the production entrypoint for automated review orchestration.',
        inputSchema: {
          type: 'object',
          properties: {
            previewUrl: {
              type: 'string',
              description: 'Optional Webflow preview URL for Designer extraction/scoring. Required unless designerMode is skip.'
            },
            publishedUrl: {
              type: 'string',
              description: 'Published site URL with WebMCP snippet installed.'
            },
            timeout: {
              type: 'number',
              description: 'Optional per-page timeout in milliseconds (default: 90000).'
            },
            designerTimeout: {
              type: 'number',
              description: 'Optional timeout in milliseconds for Designer extraction. Defaults to timeout and is capped by timeout.'
            },
            designerMode: {
              type: 'string',
              enum: ['required', 'best-effort', 'skip'],
              description: 'How preview extraction is handled. best-effort continues with published-only evidence if preview extraction fails or times out. Default: best-effort.'
            },
            includeManual: {
              type: 'boolean',
              description: 'Include manual rows in final output (default: true).'
            },
            crawlMaxPages: {
              type: 'number',
              description: 'Optional maximum published pages to crawl. By default the review attempts full discovered coverage.'
            },
            crawlMaxDepth: {
              type: 'number',
              description: 'Optional maximum crawl depth from publishedUrl. By default the review does not impose a depth cap.'
            }
          },
          required: ['publishedUrl']
        }
      },
      {
        name: 'get_template_review_job',
        description: 'Fetch a queued template review job by ID, including progress, duration telemetry, and the final report when complete.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              description: 'Queued template review job ID.'
            }
          },
          required: ['jobId']
        }
      },
      {
        name: 'list_template_review_jobs',
        description: 'List recent template review jobs, optionally filtered by status.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['queued', 'running', 'succeeded', 'failed', 'canceled']
            },
            limit: {
              type: 'number',
              description: 'Maximum jobs to return (default: 20).'
            }
          }
        }
      },
      {
        name: 'get_webflow_review_policy',
        description: 'Fetch and normalize Webflow Template Submission Guidelines + Grading Rubric from canonical web pages with provenance and policy version hash.',
        inputSchema: {
          type: 'object',
          properties: {
            refresh: {
              type: 'boolean',
              description: 'Force a fresh fetch from canonical source URLs instead of using cache'
            }
          },
        }
      },
      {
        name: 'refresh_webflow_review_policy',
        description: 'Force refresh policy ingestion from canonical Webflow guideline and rubric pages.',
        inputSchema: { type: 'object', properties: {} }
      },

      // =========================================================================
      // Intelligence Layer Tools (Versioning & Self-Improvement)
      // =========================================================================
      {
        name: 'list_script_versions',
        description: 'List all versions of an extraction script with their status and metrics',
        inputSchema: {
          type: 'object',
          properties: {
            scriptName: {
              type: 'string',
              enum: ['touchpoints', 'seo', 'structure', 'images', 'performance'],
              description: 'Name of the extraction script'
            }
          }
          ,
          required: ['scriptName']
        }
      },
      {
        name: 'get_version_metrics',
        description: 'Get performance metrics for a specific script version',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: 'Version ID (e.g., touchpoints-v1.2.0)' }
          },
          required: ['versionId']
        }
      },
      {
        name: 'record_feedback',
        description: 'Record feedback about an extraction result to improve future versions',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: 'Version ID that produced the extraction' },
            url: { type: 'string', description: 'URL that was analyzed' },
            rating: { type: 'number', enum: [1, 2, 3, 4, 5], description: 'Quality rating (1=poor, 5=excellent)' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['missing', 'incorrect', 'extra', 'timeout', 'error'] },
                  description: { type: 'string' },
                  selector: { type: 'string', description: 'CSS selector of problematic element' }
                },
                required: ['type', 'description']
              }
            },
            notes: { type: 'string', description: 'Additional notes' },
            extractedData: { description: 'The data that was extracted' },
            expectedData: { description: 'What should have been extracted' }
          },
          required: ['versionId', 'url', 'rating']
        }
      },
      {
        name: 'run_analysis_cycle',
        description: 'Run intelligence analysis on feedback to identify patterns and generate improvement proposals',
        inputSchema: {
          type: 'object',
          properties: {
            scriptName: {
              type: 'string',
              enum: ['touchpoints', 'seo', 'structure', 'images', 'performance']
            }
          },
          required: ['scriptName']
        }
      },
      {
        name: 'compare_versions',
        description: 'Compare metrics between two script versions to evaluate improvements',
        inputSchema: {
          type: 'object',
          properties: {
            baseVersionId: { type: 'string', description: 'Base version ID to compare from' },
            compareVersionId: { type: 'string', description: 'Version ID to compare against' }
          },
          required: ['baseVersionId', 'compareVersionId']
        }
      },
      {
        name: 'promote_version',
        description: 'Promote a script version to testing (A/B test) or active (production)',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: 'Version ID to promote' },
            to: { type: 'string', enum: ['testing', 'active'], description: 'Target status' }
          },
          required: ['versionId', 'to']
        }
      },
      {
        name: 'create_script_version',
        description: 'Create a new version of an extraction script (for agent-driven improvements)',
        inputSchema: {
          type: 'object',
          properties: {
            scriptName: {
              type: 'string',
              enum: ['touchpoints', 'seo', 'structure', 'images', 'performance']
            },
            code: { type: 'string', description: 'The new script code' },
            changelog: { type: 'string', description: 'Description of changes' }
          }
          ,
          required: ['scriptName', 'code', 'changelog']
        },
      }
    ]
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args || {}) as Record<string, unknown>;
    const traceContext = beginToolTrace(name, safeArgs, extra);

    try {
      let result: unknown;

      switch (name) {
        // Automation Layer
        case 'analyze_touchpoints':
          assertBrowserAutomationSupported(name);
          result = await analyzeTouchpoints(safeArgs as unknown as AnalyzeTouchpointsInput);
          break;
        case 'extract_seo':
          assertBrowserAutomationSupported(name);
          result = await extractSEO(safeArgs as unknown as ExtractSEOInput);
          break;
        case 'get_page_structure':
          assertBrowserAutomationSupported(name);
          result = await getPageStructure(safeArgs as unknown as GetPageStructureInput);
          break;
        case 'analyze_images':
          assertBrowserAutomationSupported(name);
          result = await analyzeImages(safeArgs as unknown as AnalyzeImagesInput);
          break;
        case 'get_performance':
          assertBrowserAutomationSupported(name);
          result = await getPerformance(safeArgs as unknown as GetPerformanceInput);
          break;
        case 'capture_screenshot':
          assertBrowserAutomationSupported(name);
          result = await captureScreenshot(safeArgs as unknown as CaptureScreenshotInput);
          break;
        case 'get_provider_status':
          result = await getProviderStatus();
          break;
        case 'extract_designer_metadata':
          assertBrowserAutomationSupported(name);
          result = await extractDesignerMetadata(safeArgs as unknown as ExtractDesignerMetadataInput);
          break;
        case 'score_designer_checklist':
          if (!safeArgs.designerMetadata) {
            assertBrowserAutomationSupported(name);
          }
          result = await scoreDesignerChecklistTool(safeArgs as unknown as ScoreDesignerChecklistInput);
          break;
        case 'run_template_review':
          assertBrowserAutomationSupported(name);
          result = await runTemplateReviewTool(safeArgs as unknown as RunTemplateReviewInput, {
            reportProgress: createProgressReporter(extra as RequestHandlerExtraLike)
          });
          break;
        case 'enqueue_template_review':
          assertBrowserAutomationSupported(name);
          result = enqueueTemplateReview(safeArgs as unknown as EnqueueTemplateReviewInput);
          break;
        case 'get_template_review_job':
          result = getTemplateReviewJob(safeArgs as unknown as GetTemplateReviewJobInput);
          break;
        case 'list_template_review_jobs':
          result = listTemplateReviewJobs(safeArgs as unknown as ListTemplateReviewJobsInput);
          break;
        case 'get_webflow_review_policy':
          result = await getWebflowReviewPolicy(Boolean(safeArgs.refresh));
          break;
        case 'refresh_webflow_review_policy':
          result = await getWebflowReviewPolicy(true);
          break;

        // Intelligence Layer
        case 'list_script_versions':
          result = await listScriptVersions(safeArgs.scriptName as string);
          break;
        case 'get_version_metrics':
          result = await getVersionMetrics(safeArgs.versionId as string);
          break;
        case 'record_feedback':
          result = await recordFeedback(safeArgs as Parameters<typeof recordFeedback>[0]);
          break;
        case 'run_analysis_cycle':
          result = await runAnalysisCycle(safeArgs.scriptName as string);
          break;
        case 'compare_versions':
          result = await compareVersions(
            safeArgs.baseVersionId as string,
            safeArgs.compareVersionId as string
          );
          break;
        case 'promote_version':
          result = await promoteVersion(
            safeArgs.versionId as string,
            safeArgs.to as 'testing' | 'active'
          );
          break;
        case 'create_script_version':
          result = await createScriptVersion(safeArgs as Parameters<typeof createScriptVersion>[0]);
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      await endToolTraceSuccess(traceContext, result);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error: unknown) {
      await endToolTraceError(traceContext, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: errorMessage, tool: name, arguments: safeArgs }, null, 2)
        }],
        isError: true
      };
    }
  });

  return server;
}

// =============================================================================
// Server Lifecycle
// =============================================================================

export async function shutdownAnalyzerServer(): Promise<void> {
  if (providerManager) providerManager.shutdown();
  if (registry) await registry.save();
  await shutdownMcpTracing();
}

export function getAnalyzerHealth(): Record<string, unknown> {
  const providerName = providerManager?.getProviderName() ?? null;
  return {
    name: 'webflow-site-analyzer-mcp',
    version: '1.0.0',
    transport: 'stdio',
    provider: providerName,
    registryPath: getRegistryPath() ?? '.webflow-analyzer/registry.json',
    auth: {
      configured: Boolean(getApiKey()),
      header: 'Authorization: Bearer <WEBFLOW_SITE_ANALYZER_MCP_API_KEY>'
    },
    templateReview: {
      browserAutomationSupported: isBrowserAutomationSupported(),
      maxConcurrentJobs: parsePositiveInt(process.env.WEBFLOW_TEMPLATE_REVIEW_MAX_CONCURRENT_JOBS, 2),
      maxQueueSize: parsePositiveInt(process.env.WEBFLOW_TEMPLATE_REVIEW_MAX_QUEUE_SIZE, 100)
    }
  };
}

export async function runStdioServer(): Promise<void> {
  const server = createAnalyzerServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Webflow Site Analyzer MCP server running on stdio');
  console.error('Layers: Database (URL) -> Automation (versioned scripts) -> Intelligence (observability)');
}

function installSignalHandlers(): void {
  process.on('SIGINT', async () => {
    await shutdownAnalyzerServer();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdownAnalyzerServer();
    process.exit(0);
  });
}

const isMainModule = process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  installSignalHandlers();
  runStdioServer().catch(async (error) => {
    console.error('[webflow-site-analyzer-mcp] fatal error:', error);
    await shutdownAnalyzerServer();
    process.exit(1);
  });
}
