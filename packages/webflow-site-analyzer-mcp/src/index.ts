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

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { createProviderManager, type ProviderManager } from './providers/index.js';
import {
  initRegistry,
  getRegistry,
  createIntelligenceAnalyzer,
  type RegistryManager,
  type ExtractionFeedback,
  type ScriptModification,
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
import { getWebflowPolicySnapshot, refreshWebflowPolicySnapshot } from './policy/index.js';
import type {
  TouchpointAnalysis,
  SEOAnalysis,
  PageStructure,
  ImageAnalysis,
  PerformanceMetrics,
  DesignerMetadata,
  AnalyzeTouchpointsInput,
  ExtractSEOInput,
  GetPageStructureInput,
  AnalyzeImagesInput,
  CaptureScreenshotInput,
  GetPerformanceInput,
  ExtractDesignerMetadataInput
} from './types.js';

// =============================================================================
// Initialization
// =============================================================================

// Initialize observability
initAnalyzerObservability();

// Create provider manager
let providerManager: ProviderManager | null = null;
let registry: RegistryManager | null = null;

function getProvider(): ProviderManager {
  if (!providerManager) {
    providerManager = createProviderManager();
  }
  return providerManager;
}

async function getScriptRegistry(): Promise<RegistryManager> {
  if (!registry) {
    registry = await initRegistry();
  }
  return registry;
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

// =============================================================================
// Tool Handlers - Intelligence Layer
// =============================================================================

async function getProviderStatus(): Promise<{
  provider: string;
  isHealthy: boolean;
  metrics: ReturnType<ProviderManager['getHealthMetrics']>;
  sessionMetrics: ReturnType<ReturnType<ProviderManager['getProvider']>['getSessionMetrics']>;
}> {
  const manager = getProvider();
  const provider = manager.getProvider();
  const isHealthy = await manager.checkHealth();

  return {
    provider: provider.name,
    isHealthy,
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

// =============================================================================
// MCP Server Setup
// =============================================================================

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
      }
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
      description: 'Get browser provider health status and session metrics',
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
        }
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
        },
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
        },
        required: ['scriptName', 'code', 'changelog']
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const safeArgs = (args || {}) as Record<string, unknown>;

  try {
    let result: unknown;

    switch (name) {
      // Automation Layer
      case 'analyze_touchpoints':
        result = await analyzeTouchpoints(safeArgs as unknown as AnalyzeTouchpointsInput);
        break;
      case 'extract_seo':
        result = await extractSEO(safeArgs as unknown as ExtractSEOInput);
        break;
      case 'get_page_structure':
        result = await getPageStructure(safeArgs as unknown as GetPageStructureInput);
        break;
      case 'analyze_images':
        result = await analyzeImages(safeArgs as unknown as AnalyzeImagesInput);
        break;
      case 'get_performance':
        result = await getPerformance(safeArgs as unknown as GetPerformanceInput);
        break;
      case 'capture_screenshot':
        result = await captureScreenshot(safeArgs as unknown as CaptureScreenshotInput);
        break;
      case 'get_provider_status':
        result = await getProviderStatus();
        break;
      case 'extract_designer_metadata':
        result = await extractDesignerMetadata(safeArgs as unknown as ExtractDesignerMetadataInput);
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

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };

  } catch (error: unknown) {
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

// =============================================================================
// Server Lifecycle
// =============================================================================

process.on('SIGINT', async () => {
  if (providerManager) providerManager.shutdown();
  if (registry) await registry.save();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (providerManager) providerManager.shutdown();
  if (registry) await registry.save();
  process.exit(0);
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);

console.error('Webflow Site Analyzer MCP server running on stdio');
console.error('Layers: Database (URL) -> Automation (versioned scripts) -> Intelligence (observability)');
