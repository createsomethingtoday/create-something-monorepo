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
import { scoreDesignerChecklist } from './checklist/designer-checklist.js';
import { TemplateReviewJobManager } from './template-review-jobs.js';
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

function isWorkerRuntime(): boolean {
  return process.env.WEBFLOW_SITE_ANALYZER_RUNTIME === 'worker';
}

function isBrowserAutomationSupported(): boolean {
  return !isWorkerRuntime();
}

function assertBrowserAutomationSupported(toolName: string): void {
  if (isBrowserAutomationSupported()) return;
  throw new Error(
    `${toolName} is not supported on the Cloudflare Worker deployment. Use the local analyzer or a non-Worker host for browser-backed review execution.`,
  );
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
  let source: 'live-extraction' | 'provided-metadata';

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

const PUBLISHED_WEBMCP_PAGE_SCRIPT = `
(async () => {
  const REQUIRED_LICENSE_TEXT =
    "All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license below.";

  const toInternalAbsolute = (href) => {
    try {
      if (!href) return null;
      const u = new URL(href, window.location.origin);
      if (u.origin !== window.location.origin) return null;
      if (u.protocol === 'mailto:' || u.protocol === 'tel:' || u.protocol === 'javascript:') return null;
      u.hash = '';
      return u.toString();
    } catch {
      return null;
    }
  };

  const title = document.title || null;
  const links = Array.from(document.querySelectorAll('a[href]'))
    .map((a) => a.getAttribute('href') || a.href || '')
    .map((href) => toInternalAbsolute(href))
    .filter(Boolean);

  const dedupedLinks = Array.from(new Set(links)).slice(0, 250);
  const pathname = window.location.pathname.toLowerCase();
  const bodyText = (document.body?.innerText || '').slice(0, 4000);
  const hasRequiredLicenseText = pathname.includes('license')
    ? bodyText.includes(REQUIRED_LICENSE_TEXT)
    : null;

  const api = window.__wfReview;
  if (!api) {
    return {
      url: window.location.href,
      title,
      hasSnippet: false,
      snippetVersion: null,
      tools: [],
      links: dedupedLinks,
      hasRequiredLicenseText
    };
  }

  const tools = typeof api.listTools === 'function' ? api.listTools().map((t) => t.name) : [];

  let audit = null;
  let auditError = null;
  try {
    audit = await api.callTool('audit_webflow_way', { maxExamples: 20, includeSitemap: false });
  } catch (err) {
    auditError = err instanceof Error ? err.message : String(err);
  }

  let sitemap = null;
  try {
    sitemap = await api.callTool('get_sitemap_urls', { sitemapPath: '/sitemap.xml', maxUrls: 200 });
  } catch (err) {
    sitemap = { error: err instanceof Error ? err.message : String(err) };
  }

  let audit404 = null;
  try {
    audit404 = await api.callTool('audit_404', {});
  } catch (err) {
    audit404 = { error: err instanceof Error ? err.message : String(err) };
  }

  return {
    url: window.location.href,
    title,
    hasSnippet: true,
    snippetVersion: api.version ?? null,
    tools,
    links: dedupedLinks,
    hasRequiredLicenseText,
    audit,
    auditError,
    sitemap,
    audit404
  };
})()
`;

type PublishedPageEval = {
  url?: string;
  title?: string | null;
  hasSnippet?: boolean;
  snippetVersion?: string | null;
  tools?: string[];
  links?: string[];
  hasRequiredLicenseText?: boolean | null;
  audit?: unknown;
  auditError?: string | null;
  sitemap?: unknown;
  audit404?: unknown;
};

type PageAuditSummary = NonNullable<PublishedSnippetPageResult['summary']>;

type ProgressReporter = (progress: number, total: number, message: string) => Promise<void>;

type RunTemplateReviewOptions = {
  reportProgress?: ProgressReporter;
};

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
  const mediaRoot = asRecord(root.media);
  const media = asRecord(mediaRoot.summary);
  const interactions = asRecord(root.interactions);
  const ix2 = asRecord(interactions.ix2);
  const ix3 = asRecord(interactions.ix3);
  const ix2Summary = asRecord(ix2.summary);
  const ix3Summary = asRecord(ix3.summary);
  const imageFormats = asRecord(imagesRoot.formats);

  const metaMissing = asStringArray(meta.missing);
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
      missingLabels: asFiniteNumber(forms.missingLabels)
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
    }
  };
}

function emptyIssueCounts(): PublishedSnippetIssueCounts {
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
    backgroundVideosMissingControl: 0
  };
}

function normalizeSameOriginUrl(candidate: string, origin: string): string | null {
  try {
    const url = new URL(candidate, origin);
    if (url.origin !== origin) return null;
    if (['mailto:', 'tel:', 'javascript:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function extractDiscoveredUrlsFromHtml(html: string, origin: string, limit = 50): string[] {
  const hrefPattern = /href\s*=\s*["']([^"'#]+)["']/gi;
  const discovered: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null = null;

  while ((match = hrefPattern.exec(html)) && discovered.length < limit) {
    const normalized = normalizeSameOriginUrl(match[1] || '', origin);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    discovered.push(normalized);
  }

  return discovered;
}

function extractUrlsFromSitemap(xml: string, origin: string, limit = 200): string[] {
  const locPattern = /<loc>([^<]+)<\/loc>/gi;
  const urls: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null = null;

  while ((match = locPattern.exec(xml)) && urls.length < limit) {
    const normalized = normalizeSameOriginUrl(match[1] || '', origin);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  return urls;
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'create-something-template-review/1.0'
      }
    });
    return {
      status: response.status,
      text: await response.text()
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runPublishedPrecheck(
  publishedUrl: string,
  timeoutMs: number
): Promise<PublishedSitePrecheckResult> {
  const origin = new URL(publishedUrl).origin;
  const startUrl = normalizeCrawlUrl(publishedUrl, origin) || `${origin}/`;
  const errors: string[] = [];
  const discovered = new Set<string>([startUrl]);

  try {
    const homepage = await fetchTextWithTimeout(startUrl, timeoutMs);
    if (homepage.status >= 400) {
      errors.push(`Homepage returned status ${homepage.status}`);
    }
    for (const url of extractDiscoveredUrlsFromHtml(homepage.text, origin, 50)) {
      discovered.add(url);
    }
  } catch (error) {
    errors.push(`Homepage fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const sitemapCandidates = [`${origin}/sitemap.xml`, `${origin}/sitemap-index.xml`];
  let sitemap: PublishedSitePrecheckResult['sitemap'] = {
    ok: false,
    error: 'Sitemap not found'
  };

  for (const candidate of sitemapCandidates) {
    try {
      const response = await fetchTextWithTimeout(candidate, timeoutMs);
      if (response.status >= 400) continue;
      const urls = extractUrlsFromSitemap(response.text, origin);
      if (urls.length === 0) continue;
      for (const url of urls) discovered.add(url);
      sitemap = {
        ok: true,
        count: urls.length,
        source: candidate
      };
      break;
    } catch {
      // Try next candidate.
    }
  }

  const discoveredUrls = Array.from(discovered).slice(0, 200);
  const lowercaseUrls = discoveredUrls.map((url) => url.toLowerCase());

  return {
    startUrl,
    origin,
    discoveredUrls,
    requiredPages: {
      licenses: lowercaseUrls.some((url) => url.includes('/license')),
      instructions: lowercaseUrls.some((url) => url.includes('/instruction') || url.includes('/guide')),
      changelog: lowercaseUrls.some((url) => url.includes('/changelog'))
    },
    sitemap,
    errors
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
    onProgress?: (processedPages: number, maxPages: number, message: string) => Promise<void>;
  } = {}
): Promise<PublishedSnippetCrawlResult> {
  const manager = getProvider();
  const provider = manager.getProvider();
  const timeout = options.timeout ?? 90000;
  const maxPages = Math.min(Math.max(options.crawlMaxPages ?? 20, 1), 50);
  const maxDepth = Math.min(Math.max(options.crawlMaxDepth ?? 2, 0), 4);
  const origin = new URL(publishedUrl).origin;
  const startUrl = normalizeCrawlUrl(publishedUrl, origin) || `${origin}/`;
  const seedUrls = (options.seedUrls || [])
    .map((url) => normalizeCrawlUrl(url, origin))
    .filter((url): url is string => Boolean(url));
  const initialUrls = [startUrl, ...seedUrls.filter((url) => url !== startUrl)];
  const queue: Array<{ url: string; depth: number }> = initialUrls.map((url, index) => ({
    url,
    depth: index === 0 ? 0 : 1
  }));
  const seen = new Set<string>(initialUrls);
  const pages: PublishedSnippetPageResult[] = [];

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
        hasSnippet: false,
        snippetVersion: null,
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
          raw = await session.evaluate<PublishedPageEval>(PUBLISHED_WEBMCP_PAGE_SCRIPT, {
            target: 'main',
            timeout
          });
        } else {
          raw = await provider.analyze<PublishedPageEval>(current.url, PUBLISHED_WEBMCP_PAGE_SCRIPT, {
            timeout,
            waitForNavigation: false
          });
        }

        pageResult.title = raw?.title ?? null;
        pageResult.hasSnippet = Boolean(raw?.hasSnippet);
        pageResult.snippetVersion = raw?.snippetVersion ?? null;
        pageResult.hasRequiredLicenseText =
          typeof raw?.hasRequiredLicenseText === 'boolean' ? raw.hasRequiredLicenseText : null;

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
            pageResult.summary = summarizePublishedPageAudit(raw?.audit);
          }
        } else {
          pageResult.error = 'window.__wfReview is not available on this page';
        }

        const rawLinks = Array.isArray(raw?.links) ? raw.links : [];
        if (current.depth < maxDepth) {
          for (const candidate of rawLinks) {
            const normalized = normalizeCrawlUrl(String(candidate), origin);
            if (!normalized || seen.has(normalized)) continue;
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
    if ((summary.forms?.missingLabels || 0) > 0) issueCounts.formsMissingLabels += 1;
    if ((summary.media?.autoplayWithoutControls || 0) > 0) issueCounts.autoplayWithoutControls += 1;
    if ((summary.media?.backgroundVideosMissingControl || 0) > 0) {
      issueCounts.backgroundVideosMissingControl += 1;
    }
  }

  const auditedPages = pages.filter((page) => Boolean(page.summary)).length;
  const pagesWithSnippet = pages.filter((page) => page.hasSnippet).length;
  const failingPages = pages.filter((page) => (page.summary?.failCount || 0) > 0).length;

  return {
    startUrl,
    origin,
    maxPages,
    maxDepth,
    visitedPages: pages.length,
    auditedPages,
    pagesWithSnippet,
    failingPages,
    snippetVersion,
    snippetTools,
    sitemapStatus,
    audit404,
    issueCounts,
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
      confidence: 0.2
    };
  }
  if (check.result === 'pass') return { status: 'pass', evidence: check.evidence, confidence: 0.93 };
  if (check.result === 'fail') return { status: 'fail', evidence: check.evidence, confidence: 0.93 };
  return { status: 'manual', evidence: check.evidence, confidence: 0.2 };
}

function unifyRows(
  designer: DesignerChecklistReport,
  published: PublishedSnippetCrawlResult,
  includeManual: boolean
): UnifiedReviewRow[] {
  const home = published.pages.find((page) => page.url === published.startUrl) || published.pages[0] || null;
  const homeTitle = home?.title || '';
  const formatKeys = Array.from(
    new Set(
      published.pages.flatMap((page) =>
        Object.keys(page.summary?.imageFormats || {}).map((key) => key.toLowerCase())
      )
    )
  ).sort();

  const hasLicensePage = published.pages.some((page) => page.url.toLowerCase().includes('/license'));
  const licensePages = published.pages.filter((page) => page.url.toLowerCase().includes('/license'));
  const hasKnownLicenseTextResult = licensePages.some(
    (page) => typeof page.hasRequiredLicenseText === 'boolean'
  );
  const hasRequiredLicenseText = licensePages.some((page) => page.hasRequiredLicenseText === true);

  const rows: UnifiedReviewRow[] = [];
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
    rows.push({ id, section, requirement, status, evidence, source, confidence, fixHint });
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
      `missingH1Pages=${published.issueCounts.missingH1}`,
      `multipleH1Pages=${published.issueCounts.multipleH1}`,
      `skippedHeadingLevelsPages=${published.issueCounts.skippedHeadingLevels}`
    ],
    ['published-webmcp-crawl'],
    0.9,
    'Fix heading hierarchy per page and keep a single primary H1.'
  );

  pushRow(
    'webflow_audit.alt_text',
    'Webflow Audit Panel',
    'No missing alt texts',
    published.issueCounts.imagesMissingAlt > 0 ? 'fail' : 'pass',
    [`pagesWithMissingAlt=${published.issueCounts.imagesMissingAlt}`],
    ['published-webmcp-crawl'],
    0.9,
    'Add descriptive alt text for informative images and mark decorative images appropriately.'
  );

  pushRow(
    'components.nav_footer_cta',
    'Components Panel',
    'Nav, Footer and CTAs are Components',
    dNavFooter.status,
    dNavFooter.evidence,
    ['designer-mcp'],
    dNavFooter.confidence
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
    dVarReusable.status,
    dVarReusable.evidence,
    ['designer-mcp'],
    dVarReusable.confidence
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
    dVarBreakpoints.status,
    dVarBreakpoints.evidence,
    ['designer-mcp'],
    dVarBreakpoints.confidence
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
    'manual',
    ['Variable linkage is not currently extracted by this MCP pipeline.'],
    ['designer-mcp'],
    0.2
  );
  pushRow(
    'styles.combo_depth',
    'Styles Selector',
    'No more than 3-4 combo classes stacked per element',
    dComboDepth.status,
    dComboDepth.evidence,
    ['designer-mcp'],
    dComboDepth.confidence
  );

  const homeTitleCompliant =
    homeTitle.includes(' - Webflow HTML website template') ||
    homeTitle.includes(' - Webflow Ecommerce website template');
  pushRow(
    'pages.home_seo_title_formula',
    'Page Level Checks',
    'Home SEO title matches required naming formula',
    homeTitleCompliant ? 'pass' : 'fail',
    [`homeTitle=${homeTitle || 'n/a'}`],
    ['published-webmcp-crawl'],
    0.85,
    'Set homepage title to "{Template Name} - Webflow HTML website template" (or Ecommerce variant).'
  );

  pushRow(
    'pages.license_text_exact',
    'Page Level Checks',
    'License page includes the exact required opening text',
    !hasLicensePage
      ? 'fail'
      : hasKnownLicenseTextResult
        ? hasRequiredLicenseText
          ? 'pass'
          : 'fail'
        : 'partial',
    [
      `licensePageFound=${hasLicensePage}`,
      `hasKnownLicenseTextResult=${hasKnownLicenseTextResult}`,
      `hasRequiredLicenseText=${hasRequiredLicenseText}`
    ],
    ['published-webmcp-crawl', 'designer-mcp'],
    hasKnownLicenseTextResult ? 0.85 : 0.5,
    'Ensure /licenses page exists and starts with the required exact text.'
  );

  pushRow(
    'pages.image_loading_strategy',
    'Page Level Checks',
    'Below-the-fold images are lazy-loaded and above-the-fold essentials are eager',
    published.issueCounts.imagesAboveFoldLazy > 0 ? 'fail' : 'pass',
    [`pagesWithAboveFoldLazy=${published.issueCounts.imagesAboveFoldLazy}`],
    ['published-webmcp-crawl'],
    0.87,
    'Set hero/critical images to eager and keep below-fold images lazy.'
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

  pushRow(
    'pages.meta_tags_static',
    'Page Level Checks',
    'Each static page has meta title, meta description and Open Graph tags',
    published.issueCounts.metaMissing > 0 ? 'fail' : 'pass',
    [`pagesWithMissingMeta=${published.issueCounts.metaMissing}`],
    ['published-webmcp-crawl'],
    0.9,
    'Add missing Open Graph/meta tags per page, including og:image.'
  );

  pushRow(
    'pages.meta_tags_cms_dynamic',
    'Page Level Checks',
    'CMS pages use dynamic SEO tags',
    'partial',
    [
      `cmsCollectionsDetected=${designer.metadataSummary.totalCMSCollections}`,
      'Dynamic field binding cannot be confirmed from current payloads.'
    ],
    ['designer-mcp', 'published-webmcp-crawl'],
    0.55
  );

  const a404 = published.audit404;
  const a404Status = asFiniteNumber((a404 as Record<string, unknown>).status);
  const a404NavCount = asFiniteNumber((a404 as Record<string, unknown>).navCount);
  const a404LinkCount = asFiniteNumber((a404 as Record<string, unknown>).linkCount);
  const hasHealthy404 =
    a404.ok === true &&
    a404Status === 404 &&
    a404NavCount > 0 &&
    a404LinkCount > 0;
  pushRow(
    'pages.custom_404',
    'Page Level Checks',
    'Custom branded 404 page exists with nav and CTAs',
    hasHealthy404 ? 'pass' : 'fail',
    [
      `status=${a404Status || 'n/a'}`,
      `navCount=${a404NavCount || 'n/a'}`,
      `linkCount=${a404LinkCount || 'n/a'}`
    ],
    ['published-webmcp-crawl'],
    0.92
  );

  pushRow(
    'pages.image_dimensions',
    'Page Level Checks',
    'Images have explicit width/height or aspect-ratio hints',
    published.issueCounts.imagesMissingDimensions > 0 ? 'fail' : 'pass',
    [`pagesWithMissingImageDimensions=${published.issueCounts.imagesMissingDimensions}`],
    ['published-webmcp-crawl'],
    0.9,
    'Add width/height attributes or explicit aspect-ratio to image elements.'
  );

  pushRow(
    'pages.transition_simple',
    'Page Level Checks',
    'Simple CSS transitions are used for hover/press states',
    'manual',
    ['Transition-property linting is not included in this tool yet.'],
    ['published-webmcp-crawl'],
    0.2
  );

  pushRow(
    'pages.wcag_contrast',
    'Page Level Checks',
    'WCAG contrast is met for default/hover/focus/active states',
    'manual',
    ['Color contrast computation is not included in this tool yet.'],
    ['published-webmcp-crawl'],
    0.2
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

  pushRow(
    'responsive.multi_breakpoint_check',
    'Page Level Checks',
    'Responsive checks have been run on homepage and at least one additional page',
    'manual',
    ['This run does not include multi-viewport screenshot assertions.'],
    ['published-webmcp-crawl'],
    0.2
  );

  return includeManual ? rows : rows.filter((row) => row.status !== 'manual');
}

async function runTemplateReviewTool(
  input: RunTemplateReviewInput,
  options: RunTemplateReviewOptions = {}
): Promise<UnifiedTemplateReviewReport> {
  return executeTemplateReview(input, options);
}

async function executeTemplateReview(
  input: RunTemplateReviewInput,
  options: RunTemplateReviewOptions = {}
): Promise<UnifiedTemplateReviewReport> {
  if (!input?.previewUrl || !input?.publishedUrl) {
    throw new Error('`previewUrl` and `publishedUrl` are required.');
  }

  const manager = getProvider();
  const provider = manager.getProvider();
  const metricsBefore = snapshotProviderMetrics(provider);
  const includeManual = input.includeManual !== false;
  const reportProgress = options.reportProgress;
  const timeout = input.timeout ?? 90000;

  if (reportProgress) await reportProgress(0, 100, 'Starting unified template review');
  const precheck = await runPublishedPrecheck(input.publishedUrl, Math.min(timeout, 30000));
  if (precheck.errors.length > 0) {
    throw new Error(`Published precheck failed: ${precheck.errors.join('; ')}`);
  }

  if (reportProgress) await reportProgress(5, 100, 'Published precheck complete');
  if (reportProgress) await reportProgress(5, 100, 'Running Designer checklist extraction');

  const designer = await scoreDesignerChecklistTool({
    url: input.previewUrl,
    timeout: input.timeout,
    includeManual: true
  });

  if (reportProgress) await reportProgress(35, 100, 'Designer checklist extraction complete');

  const published = await crawlPublishedWebMcp(input.publishedUrl, {
    timeout: input.timeout,
    crawlMaxPages: input.crawlMaxPages,
    crawlMaxDepth: input.crawlMaxDepth,
    seedUrls: precheck.discoveredUrls,
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

  const rows = unifyRows(designer, published, includeManual);
  const summary = rows.reduce(
    (acc, row) => {
      if (row.status === 'pass') acc.pass += 1;
      else if (row.status === 'fail') acc.fail += 1;
      else if (row.status === 'partial') acc.partial += 1;
      else acc.manual += 1;
      return acc;
    },
    { pass: 0, fail: 0, partial: 0, manual: 0, automated: 0, humanInLoop: 0 }
  );
  summary.automated = summary.pass + summary.fail;
  summary.humanInLoop = summary.partial + summary.manual;
  const providerMetrics = diffProviderMetrics(metricsBefore, provider.getSessionMetrics());

  if (reportProgress) await reportProgress(100, 100, 'Unified template review complete');

  return {
    generatedAt: new Date().toISOString(),
    provider: provider.name,
    previewUrl: input.previewUrl,
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
        description: 'Extract template metadata from Webflow Designer Preview URL. Navigates through Designer panels to gather: pages list, CSS classes (style selectors), components with usage counts, interactions/animations, CMS collections, assets, and site settings. Only works with Webflow preview URLs.',
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
        description: 'Score Webflow Designer-focused checklist rows (strict pass/fail/manual) using extracted Designer metadata. Accepts either a live preview URL or a previously extracted designerMetadata payload.',
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
        description: 'Synchronous template review execution for debugging or manual use. Production automation should prefer enqueue_template_review.',
        inputSchema: {
          type: 'object',
          properties: {
            previewUrl: {
              type: 'string',
              description: 'Webflow preview URL for Designer extraction/scoring.'
            },
            publishedUrl: {
              type: 'string',
              description: 'Published site URL with WebMCP snippet installed.'
            },
            timeout: {
              type: 'number',
              description: 'Optional per-page timeout in milliseconds (default: 90000).'
            },
            includeManual: {
              type: 'boolean',
              description: 'Include manual rows in final output (default: true).'
            },
            crawlMaxPages: {
              type: 'number',
              description: 'Maximum published pages to crawl (default: 20, max: 50).'
            },
            crawlMaxDepth: {
              type: 'number',
              description: 'Maximum crawl depth from publishedUrl (default: 2, max: 4).'
            }
          },
          required: ['previewUrl', 'publishedUrl']
        }
      },
      {
        name: 'enqueue_template_review',
        description: 'Queue an async template review job with bounded concurrency. This is the production entrypoint for automated review orchestration.',
        inputSchema: {
          type: 'object',
          properties: {
            previewUrl: {
              type: 'string',
              description: 'Webflow preview URL for Designer extraction/scoring.'
            },
            publishedUrl: {
              type: 'string',
              description: 'Published site URL with WebMCP snippet installed.'
            },
            timeout: {
              type: 'number',
              description: 'Optional per-page timeout in milliseconds (default: 90000).'
            },
            includeManual: {
              type: 'boolean',
              description: 'Include manual rows in final output (default: true).'
            },
            crawlMaxPages: {
              type: 'number',
              description: 'Maximum published pages to crawl (default: 20, max: 50).'
            },
            crawlMaxDepth: {
              type: 'number',
              description: 'Maximum crawl depth from publishedUrl (default: 2, max: 4).'
            }
          },
          required: ['previewUrl', 'publishedUrl']
        }
      },
      {
        name: 'get_template_review_job',
        description: 'Fetch a queued template review job by ID, including progress and final report when complete.',
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
