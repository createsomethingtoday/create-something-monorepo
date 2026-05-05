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
import { classifyUrls, type ClassifyOptions } from './url-classifier.js';
import { is404PageTitle } from './review-utils.js';
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
  // Use textContent (not innerText) to avoid font-rendering corruption where
  // web fonts with missing glyphs cause innerText to return garbled text.
  const bodyText = (document.body?.textContent || '').replace(/\\s+/g, ' ').slice(0, 8000);
  const hasRequiredLicenseText = pathname.includes('license')
    ? bodyText.includes(REQUIRED_LICENSE_TEXT)
    : null;

  // Policy checks: deterministic, run regardless of __wfReview availability
  const poweredByBadge = document.querySelector('.w-webflow-badge') ||
    document.querySelector('a[href*="webflow.com"][class*="badge"]') ||
    document.querySelector('a[href*="webflow.com"]');
  const hasPoweredByWebflow = Boolean(
    poweredByBadge &&
    (poweredByBadge.textContent || '').toLowerCase().includes('webflow')
  );

  const allHrefs = Array.from(document.querySelectorAll('a[href]'))
    .map(a => (a.getAttribute('href') || '').toLowerCase());
  const affiliatePatterns = [
    'ref=', 'affiliate', 'aff=', 'partner=', 'referral',
    'utm_source=affiliate', 'tap_a=', 'idev_id=', 'click_id='
  ];
  const affiliateLinks = allHrefs.filter(href =>
    affiliatePatterns.some(p => href.includes(p))
  );

  const scriptEls = Array.from(document.querySelectorAll('script'));
  const scriptSrcs = scriptEls.map(s => s.src || '').filter(Boolean);
  const inlineCode = scriptEls.map(s => (s.textContent || '').slice(0, 2000)).join(' ');
  const hasGsap = scriptSrcs.some(src => src.toLowerCase().includes('gsap')) ||
    inlineCode.includes('gsap') || inlineCode.includes('ScrollTrigger') ||
    inlineCode.includes('ScrollSmoother');
  const hasCustomCode = scriptEls.some(s =>
    !s.src && (s.textContent || '').trim().length > 50 &&
    !s.getAttribute('data-wf-domain')
  );

  // Site settings checks (run regardless of __wfReview availability)
  const faviconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  const hasCustomFavicon = Boolean(faviconLink && !((faviconLink.getAttribute('href') || '').includes('webflow')));

  const fontLinks = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"], link[href*="use.typekit.net"]'));
  const customFontStyles = Array.from(document.querySelectorAll('style')).filter(s =>
    (s.textContent || '').includes('@font-face')
  );
  const hasCustomFonts = fontLinks.length > 0 || customFontStyles.length > 0;
  const customFontSources = fontLinks.map(l => l.getAttribute('href') || '').filter(Boolean);

  // Connected apps detection (third-party integrations that should be removed)
  const connectedAppPatterns = [
    { name: 'Google Analytics', pattern: /google-analytics\.com|googletagmanager\.com|gtag/ },
    { name: 'Facebook Pixel', pattern: /connect\.facebook\.net|fbevents\.js/ },
    { name: 'Hotjar', pattern: /hotjar\.com|static\.hotjar/ },
    { name: 'Intercom', pattern: /intercom\.io|widget\.intercom/ },
    { name: 'Drift', pattern: /drift\.com|js\.driftt/ },
    { name: 'Crisp', pattern: /crisp\.chat/ },
    { name: 'HubSpot', pattern: /hubspot\.com|hs-scripts/ },
    { name: 'Mailchimp', pattern: /mailchimp\.com|chimpstatic/ },
  ];
  const allScriptSrcsAndInline = [
    ...scriptSrcs,
    ...scriptEls.map(s => (s.textContent || '').slice(0, 500))
  ].join(' ');
  const detectedApps = connectedAppPatterns
    .filter(app => app.pattern.test(allScriptSrcsAndInline))
    .map(app => app.name);

  // Placeholder content detection
  const bodyTextForPlaceholder = (document.body?.textContent || '').toLowerCase();
  const loremIpsumPatterns = ['lorem ipsum', 'dolor sit amet', 'consectetur adipiscing', 'sed do eiusmod'];
  const hasLoremIpsum = loremIpsumPatterns.some(p => bodyTextForPlaceholder.includes(p));
  const placeholderPatterns = ['your text here', 'placeholder text', 'insert text', 'add your', 'example text', 'sample text'];
  const hasPlaceholderText = placeholderPatterns.some(p => bodyTextForPlaceholder.includes(p));

  const api = window.__wfReview;
  if (!api) {
    // DOM fallback: extract page-level signals directly when __wfReview is missing
    const headingEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingLevels = Array.from(headingEls).map(el => parseInt(el.tagName[1], 10));
    const h1Count = headingLevels.filter(l => l === 1).length;
    let skippedLevels = 0;
    const seenLevels = new Set();
    for (const level of headingLevels) {
      if (level > 1 && !seenLevels.has(level - 1) && level - 1 !== 0) {
        // Check if any heading of the preceding level exists
        if (!headingLevels.includes(level - 1)) skippedLevels++;
      }
      seenLevels.add(level);
    }
    const emptyHeadings = Array.from(headingEls).filter(el => !(el.textContent || '').trim()).length;

    const imgEls = Array.from(document.querySelectorAll('img'));
    const missingAlt = imgEls.filter(img => !img.hasAttribute('alt')).length;
    const decorativeAlt = imgEls.filter(img =>
      img.hasAttribute('alt') && img.getAttribute('alt') === ''
    ).length;
    const missingDimensions = imgEls.filter(img =>
      !img.hasAttribute('width') && !img.hasAttribute('height') &&
      !img.style.aspectRatio && !(img.getAttribute('style') || '').includes('aspect-ratio')
    ).length;
    const aboveFoldLazy = imgEls.filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.top < window.innerHeight && img.loading === 'lazy';
    }).length;
    const imgFormats = {};
    for (const img of imgEls) {
      const src = img.currentSrc || img.src || '';
      const ext = src.split('?')[0].split('.').pop()?.toLowerCase() || 'unknown';
      imgFormats[ext] = (imgFormats[ext] || 0) + 1;
    }

    const linkEls = Array.from(document.querySelectorAll('a'));
    const emptyHref = linkEls.filter(a => {
      const href = a.getAttribute('href');
      return href === '' || href === null;
    }).length;
    const placeholderHref = linkEls.filter(a => {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#')) return false;
      // Exclude Webflow tab/accordion panel anchors (e.g. #w-tabs-0-data-w-pane-0)
      if (/^#w-tabs-/.test(href) || /^#w-dropdown-/.test(href) || /^#w--/.test(href)) return false;
      // Exclude Webflow lightbox links (href="#" on elements with w-lightbox class or data attr)
      if (href === '#' && (
        a.classList.contains('w-lightbox') ||
        a.closest('.w-lightbox') ||
        a.hasAttribute('data-lightbox')
      )) return false;
      return true;
    }).length;
    const blankTargetMissingRel = linkEls.filter(a =>
      a.target === '_blank' && !(a.getAttribute('rel') || '').includes('noopener')
    ).length;
    const missingAccessibleName = linkEls.filter(a =>
      !(a.textContent || '').trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]')
    ).length;

    const metaTitle = document.querySelector('meta[property="og:title"]');
    const metaDesc = document.querySelector('meta[name="description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const metaMissing = [];
    if (!metaTitle) metaMissing.push('og:title');
    if (!metaDesc) metaMissing.push('description');
    if (!ogImage) metaMissing.push('og:image');

    // Canonical URL
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const hasCanonical = Boolean(canonicalLink && canonicalLink.getAttribute('href'));

    // Structured data (JSON-LD)
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    const hasStructuredData = jsonLdScripts.length > 0;

    // ARIA landmarks
    const mainLandmark = document.querySelector('main, [role="main"]');
    const navLandmark = document.querySelector('nav, [role="navigation"]');
    const hasAriaLandmarks = Boolean(mainLandmark) && Boolean(navLandmark);

    const formFields = document.querySelectorAll('input, textarea, select');
    const missingLabels = Array.from(formFields).filter(field => {
      if (field.type === 'hidden' || field.type === 'submit') return false;
      const id = field.id;
      const hasLabel = id && document.querySelector('label[for="' + id + '"]');
      const parentLabel = field.closest('label');
      const ariaLabel = field.getAttribute('aria-label') || field.getAttribute('aria-labelledby');
      return !hasLabel && !parentLabel && !ariaLabel;
    }).length;

    const videoEls = Array.from(document.querySelectorAll('video'));
    const autoplayNoControls = videoEls.filter(v => v.autoplay && !v.controls).length;
    const bgVideoMissing = videoEls.filter(v =>
      v.muted && v.autoplay && v.loop && !v.controls
    ).length;

    // Below-fold images that should be lazy but aren't
    const belowFoldNotLazy = imgEls.filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.top >= window.innerHeight && img.loading !== 'lazy';
    }).length;

    // IX2/IX3 interaction signals from DOM
    const ix2Scripts = Array.from(document.querySelectorAll('script'))
      .filter(s => (s.textContent || '').includes('Webflow.require(\\'ix2\\')'));
    const ix2Data = ix2Scripts.length > 0;
    let ix2Events = 0;
    let ix2ActionLists = 0;
    if (ix2Data) {
      try {
        const wfData = window.Webflow?.require?.('ix2')?.store?.getState?.();
        if (wfData?.ixData) {
          ix2Events = Object.keys(wfData.ixData.events || {}).length;
          ix2ActionLists = Object.keys(wfData.ixData.actionLists || {}).length;
        }
      } catch {}
    }

    const domAudit = {
      meta: { missing: metaMissing, hasCanonical, hasStructuredData, hasAriaLandmarks },
      headings: {
        summary: {
          headings: headingEls.length,
          h1: h1Count,
          missingH1: h1Count === 0,
          multipleH1: h1Count > 1,
          skippedHeadingLevels: skippedLevels,
          emptyHeadings
        }
      },
      links: {
        summary: {
          links: linkEls.length,
          emptyHref,
          placeholderHref,
          blankTargetMissingRel,
          missingAccessibleName
        }
      },
      images: {
        summary: {
          images: imgEls.length,
          missingAlt,
          decorativeAlt,
          missingDimensions,
          aboveFoldLazy,
          belowFoldNotLazy
        },
        formats: imgFormats
      },
      forms: {
        summary: {
          fields: formFields.length,
          missingLabels
        }
      },
      media: {
        summary: {
          videos: videoEls.length,
          autoplayWithoutControls: autoplayNoControls,
          backgroundVideosMissingControl: bgVideoMissing
        }
      },
      interactions: {
        ix2: { summary: { events: ix2Events, actionLists: ix2ActionLists } },
        ix3: { summary: {} }
      },
      transitions: (() => {
        // Check interactive elements for CSS transition/hover state declarations
        const interactiveEls = document.querySelectorAll('a, button, [role="button"], .w-button, input[type="submit"]');
        let withTransition = 0;
        let withoutTransition = 0;
        for (const el of Array.from(interactiveEls)) {
          const style = window.getComputedStyle(el);
          const transition = style.transition || style.getPropertyValue('transition');
          if (transition && transition !== 'all 0s ease 0s' && transition !== 'none') {
            withTransition++;
          } else {
            withoutTransition++;
          }
        }
        return {
          totalInteractive: interactiveEls.length,
          withTransition,
          withoutTransition,
          ratio: interactiveEls.length > 0 ? withTransition / interactiveEls.length : 0
        };
      })(),
      comboClassDepth: (() => {
        // Check max class count on any single element (combo class stacking)
        const allEls = document.querySelectorAll('[class]');
        let maxDepth = 0;
        let maxDepthSelector = '';
        for (const el of Array.from(allEls).slice(0, 500)) {
          const classCount = el.classList.length;
          if (classCount > maxDepth) {
            maxDepth = classCount;
            maxDepthSelector = el.tagName.toLowerCase() + '.' + Array.from(el.classList).slice(0, 3).join('.');
          }
        }
        return { maxDepth, maxDepthSelector, sampled: Math.min(allEls.length, 500) };
      })(),
      contrast: (() => {
        // WCAG AA contrast check with ancestor background walk-up,
        // bold text threshold, and visibility filtering.
        const textEls = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, span, li, td, th, label, button');
        let checked = 0;
        let passCount = 0;
        let failCount = 0;
        const failures = [];

        function luminance(r, g, b) {
          const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        }

        function parseColor(color) {
          const m = (color || '').match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          if (!m) return null;
          return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
        }

        function isTransparent(color) {
          return !color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent';
        }

        // Walk up the DOM tree to find the first ancestor with a
        // non-transparent background color (the effective background).
        function findEffectiveBg(el) {
          let current = el;
          let depth = 0;
          while (current && current !== document.documentElement && depth < 20) {
            const style = window.getComputedStyle(current);
            if (!isTransparent(style.backgroundColor)) {
              return parseColor(style.backgroundColor);
            }
            current = current.parentElement;
            depth++;
          }
          // Default to white if no background found (common for light themes)
          // or black for dark themes — check the body/html
          const bodyBg = window.getComputedStyle(document.body).backgroundColor;
          const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
          const resolved = parseColor(bodyBg) || parseColor(htmlBg);
          return resolved || { r: 255, g: 255, b: 255 };
        }

        function contrastRatio(fg, bg) {
          const l1 = luminance(fg.r, fg.g, fg.b);
          const l2 = luminance(bg.r, bg.g, bg.b);
          const lighter = Math.max(l1, l2);
          const darker = Math.min(l1, l2);
          return (lighter + 0.05) / (darker + 0.05);
        }

        function isVisible(el) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none') return false;
          if (style.visibility === 'hidden') return false;
          if (style.opacity === '0') return false;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return false;
          return true;
        }

        // WCAG AA thresholds:
        // Normal text: 4.5:1
        // Large text (>=24px normal, or >=18.66px bold): 3:1
        function getThreshold(style) {
          const fontSize = parseFloat(style.fontSize) || 16;
          const fontWeight = parseInt(style.fontWeight) || 400;
          const isBold = fontWeight >= 700;
          if (fontSize >= 24) return 3;
          if (fontSize >= 18.66 && isBold) return 3;
          return 4.5;
        }

        // Sample up to 80 visible elements
        let sampled = 0;
        for (const el of Array.from(textEls)) {
          if (sampled >= 80) break;
          if (!isVisible(el)) continue;

          // Skip elements with no meaningful text
          const text = (el.textContent || '').trim();
          if (!text || text.length === 0) continue;

          sampled++;
          const style = window.getComputedStyle(el);
          const fg = parseColor(style.color);
          if (!fg) continue;

          // Walk up to find effective background
          const bg = findEffectiveBg(el);
          if (!bg) continue;

          checked++;
          const ratio = contrastRatio(fg, bg);
          const threshold = getThreshold(style);

          if (ratio >= threshold) {
            passCount++;
          } else {
            failCount++;
            if (failures.length < 5) {
              const tag = el.tagName.toLowerCase();
              const snippet = text.slice(0, 30);
              failures.push({
                text: snippet,
                tag,
                ratio: Math.round(ratio * 100) / 100,
                required: threshold,
                fg: 'rgb(' + fg.r + ',' + fg.g + ',' + fg.b + ')',
                bg: 'rgb(' + bg.r + ',' + bg.g + ',' + bg.b + ')'
              });
            }
          }
        }

        return {
          checked,
          pass: passCount,
          fail: failCount,
          passRate: checked > 0 ? passCount / checked : 1,
          failures
        };
      })()
    };

    return {
      url: window.location.href,
      title,
      hasSnippet: false,
      snippetVersion: null,
      tools: [],
      links: dedupedLinks,
      hasRequiredLicenseText,
      audit: domAudit,
      auditError: null,
      sitemap: null,
      audit404: null,
      policyChecks: {
        hasPoweredByWebflow,
        affiliateLinks,
        hasGsap,
        hasCustomCode
      },
      siteSettings: {
        hasCustomFavicon,
        hasCustomFonts,
        customFontSources,
        detectedApps
      },
      contentQuality: {
        hasLoremIpsum,
        hasPlaceholderText
      }
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
    audit404,
    siteSettings: {
      hasCustomFavicon,
      hasCustomFonts,
      customFontSources,
      detectedApps
    },
    policyChecks: {
      hasPoweredByWebflow,
      affiliateLinks,
      hasGsap,
      hasCustomCode
    }
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
  policyChecks?: {
    hasPoweredByWebflow?: boolean;
    affiliateLinks?: string[];
    hasGsap?: boolean;
    hasCustomCode?: boolean;
  };
  siteSettings?: {
    hasCustomFavicon?: boolean;
    hasCustomFonts?: boolean;
    customFontSources?: string[];
    detectedApps?: string[];
  };
  contentQuality?: {
    hasLoremIpsum?: boolean;
    hasPlaceholderText?: boolean;
  };
};

type PageAuditSummary = NonNullable<PublishedSnippetPageResult['summary']>;

type ProgressReporter = (progress: number, total: number, message: string) => Promise<void>;

type RunTemplateReviewOptions = {
  reportProgress?: ProgressReporter;
};

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
      decorativeAlt: asFiniteNumber(images.decorativeAlt),
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
    },
    comboClassDepth: (() => {
      const cc = asRecord(root.comboClassDepth);
      return cc.maxDepth != null ? {
        maxDepth: asFiniteNumber(cc.maxDepth),
        maxDepthSelector: typeof cc.maxDepthSelector === 'string' ? cc.maxDepthSelector : '',
        sampled: asFiniteNumber(cc.sampled)
      } : null;
    })(),
    transitions: (() => {
      const t = asRecord(root.transitions);
      return t.totalInteractive != null ? {
        totalInteractive: asFiniteNumber(t.totalInteractive),
        withTransition: asFiniteNumber(t.withTransition),
        withoutTransition: asFiniteNumber(t.withoutTransition),
        ratio: asFiniteNumber(t.ratio)
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
    })()
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

  // Phase 1: Fetch homepage (must complete before we know which URLs to classify)
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

  // Phase 2: Sitemap fetch + URL classification run CONCURRENTLY.
  // The LLM call (~300ms for Haiku) hides behind the sitemap fetch (~500ms).
  const sitemapCandidates = [`${origin}/sitemap.xml`, `${origin}/sitemap-index.xml`];

  const sitemapPromise = (async () => {
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
        sitemap = { ok: true, count: urls.length, source: candidate };
        break;
      } catch {
        // Try next candidate.
      }
    }
    return sitemap;
  })();

  // Start classification on what we have so far (homepage links).
  // Sitemap URLs get classified in a second pass if new ones appear.
  const homepageUrls = Array.from(discovered).slice(0, 200);
  const classifyPromise = classifyUrls(homepageUrls, startUrl);

  // Wait for both to complete concurrently
  const [sitemap, initialClassified] = await Promise.all([sitemapPromise, classifyPromise]);

  // Merge any new sitemap-discovered URLs that weren't in the initial batch
  const discoveredUrls = Array.from(discovered).slice(0, 200);
  const newFromSitemap = discoveredUrls.filter((u) => !homepageUrls.includes(u));
  let classifiedUrls = initialClassified;

  if (newFromSitemap.length > 0) {
    // Classify the new sitemap URLs (deterministic is instant; LLM adds ~200ms)
    const extraClassified = await classifyUrls(newFromSitemap, startUrl);
    classifiedUrls = [...initialClassified, ...extraClassified];
  }

  // Derive requiredPages from classifications (more robust than pattern matching)
  const hasClassification = (type: string) =>
    classifiedUrls.some((c) => c.classification === type);

  return {
    startUrl,
    origin,
    discoveredUrls,
    classifiedUrls,
    requiredPages: {
      licenses: hasClassification('utility:license'),
      instructions: hasClassification('utility:instructions'),
      changelog: hasClassification('utility:changelog')
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
  let anyPageHasCustomFonts = false;
  const allCustomFontSources: string[] = [];
  const allDetectedApps: string[] = [];
  for (const page of pages) {
    if (page.siteSettings) {
      if (page.siteSettings.hasCustomFavicon) anyPageHasCustomFavicon = true;
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
      hasCustomFonts: anyPageHasCustomFonts,
      customFontSources: uniqueFontSources,
      detectedApps: uniqueDetectedApps
    },
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
    'pages.meta_tags_static': 'major',
    'pages.cms_used_relational': 'major',
    'styles.base_tag_styles': 'major',
    // Minor: nice to have, lower impact
    'components.title_case_names': 'minor',
    'pages.image_loading_strategy': 'minor',
    'pages.image_dimensions': 'minor',
    'pages.videos_controls': 'minor',
    'variables.breakpoint_modes': 'minor',
    'assets.modern_formats': 'minor',
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

  // Aggregate which specific meta tags are most commonly missing
  const metaTagCounts: Record<string, number> = {};
  for (const page of published.pages) {
    if (!page.summary) continue;
    for (const tag of page.summary.metaMissing) {
      metaTagCounts[tag] = (metaTagCounts[tag] || 0) + 1;
    }
  }
  const topMissingTags = Object.entries(metaTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => `${tag}(${count}/${totalAudited})`);

  pushRow(
    'pages.meta_tags_static',
    'Page Level Checks',
    'Each static page has meta title, meta description and Open Graph tags',
    published.issueCounts.metaMissing > 0 ? 'fail' : 'pass',
    [
      `pagesWithMissingMeta=${published.issueCounts.metaMissing}/${totalAudited}`,
      ...(topMissingTags.length > 0 ? [`mostCommonMissing=${topMissingTags.join(', ')}`] : [])
    ],
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

  // Aggregate transition data across crawled pages
  const transitionPages = published.pages.filter((p) => p.summary?.transitions);
  const totalTransitionEls = transitionPages.reduce(
    (sum, p) => sum + (p.summary?.transitions?.totalInteractive || 0), 0
  );
  const totalWithTransition = transitionPages.reduce(
    (sum, p) => sum + (p.summary?.transitions?.withTransition || 0), 0
  );
  const transitionRatio = totalTransitionEls > 0 ? totalWithTransition / totalTransitionEls : 0;
  const hasTransitionData = transitionPages.length > 0;
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
          `interactiveElements=${totalTransitionEls}`,
          `withTransitions=${totalWithTransition}`,
          `ratio=${Math.round(transitionRatio * 100)}%`
        ]
      : ['Transition data not available.'],
    ['published-webmcp-crawl'],
    hasTransitionData ? 0.65 : 0.2,
    transitionRatio < 0.5
      ? 'Add CSS transitions (e.g. transition: opacity 0.2s ease) to buttons, links, and interactive elements for hover/press states.'
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

  // Combine Designer breakpoint data with page count for a partial responsive signal.
  // Full visual validation requires multi-viewport screenshots (not yet automated).
  const hasAllBreakpoints = dVarBreakpoints.status === 'pass';
  const multiplePagesCrawled = totalAudited > 1;
  const responsiveStatus: UnifiedReviewStatus = hasAllBreakpoints
    ? 'partial'
    : 'fail';
  pushRow(
    'responsive.multi_breakpoint_check',
    'Page Level Checks',
    'Responsive checks have been run on homepage and at least one additional page',
    responsiveStatus,
    [
      `designerBreakpoints=${hasAllBreakpoints ? 'all present' : 'incomplete'}`,
      `pagesCrawled=${totalAudited}`,
      'Visual multi-viewport screenshot assertions not yet automated — verify manually.'
    ],
    ['designer-mcp', 'published-webmcp-crawl'],
    hasAllBreakpoints ? 0.4 : 0.3
  );

  // Policy checks (deterministic)
  const policy = published.policyChecks;
  // Check if an instructions page was found (from Designer metadata or crawl)
  const hasInstructionsPage =
    designer.metadataSummary.pages.some(
      (p) => p.name.toLowerCase().includes('instruction')
    ) ||
    published.pages.some(
      (p) => p.url.toLowerCase().includes('/instruction')
    ) ||
    (precheck?.discoveredUrls ?? []).some(
      (url) => url.toLowerCase().includes('/instruction')
    );
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
    ['published-webmcp-crawl'],
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
    ['published-webmcp-crawl'],
    policy.hasCustomCode ? (hasInstructionsPage ? 0.85 : 0.7) : 0.85
  );

  // Internal broken link detection: cross-reference all discovered internal links
  // against the set of pages that were actually crawled successfully.
  const crawledUrls = new Set(
    published.pages
      .filter((p) => !is404PageTitle(p.title))
      .map((p) => p.url.toLowerCase().replace(/\/$/, ''))
  );
  // Collect all internal links from all crawled pages (from the per-page link extraction)
  const allInternalLinks = new Set<string>();
  for (const page of published.pages) {
    if (!page.summary) continue;
    // The links count is in the summary but individual URLs aren't stored.
    // Use the page's discovered links from the crawl queue instead.
  }
  // Use precheck discovered URLs + seed URLs as the "should exist" set
  const allKnownUrls = new Set(
    (precheck?.discoveredUrls || []).map((u) => u.toLowerCase().replace(/\/$/, ''))
  );
  const brokenInternalLinks: string[] = [];
  for (const knownUrl of allKnownUrls) {
    // Check if any crawled page with this URL returned a 404 title
    const matchingPage = published.pages.find(
      (p) => p.url.toLowerCase().replace(/\/$/, '') === knownUrl
    );
    if (matchingPage && is404PageTitle(matchingPage.title)) {
      brokenInternalLinks.push(new URL(knownUrl).pathname);
    }
  }
  pushRow(
    'links.no_broken_internal',
    'Page Level Checks',
    'No broken internal links (all linked pages resolve correctly)',
    brokenInternalLinks.length === 0 ? 'pass' : 'fail',
    [
      `brokenLinks=${brokenInternalLinks.length}`,
      ...(brokenInternalLinks.length > 0
        ? [`paths=${brokenInternalLinks.slice(0, 10).join(', ')}`]
        : [])
    ],
    ['published-webmcp-crawl'],
    0.85,
    brokenInternalLinks.length > 0
      ? `${brokenInternalLinks.length} internal link(s) resolve to 404. Fix or remove these links.`
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
    'External links open in new tab with rel="noopener"',
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
    'Upload a custom favicon in Site Settings to replace the default Webflow icon.'
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
