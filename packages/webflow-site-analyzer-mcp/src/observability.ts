/**
 * Webflow Site Analyzer Observability
 * 
 * Extends the base observability package with Webflow-specific metrics
 * and browser automation tracking.
 */

import {
  initObservability,
  createTrace,
  createSpan,
  logEvent,
  recordScore,
  type TraceHandle,
  type SpanHandle
} from '@create-something/observability';
import { mcpToolMetadata, type AITaskType, type AtlasMetadata } from '@create-something/observability/atlas';
import type { AnalysisMetrics, ProviderHealthMetrics, BrowserSessionMetrics } from './types.js';

// =============================================================================
// Constants
// =============================================================================

const SERVER_NAME = 'webflow-site-analyzer-mcp';
const SERVER_VERSION = '1.0.0';

// Cost per browser minute (Browserless pricing)
const COST_PER_BROWSER_MINUTE = 0.0015; // Approximately $0.09/hour

// =============================================================================
// Initialization
// =============================================================================

export function initAnalyzerObservability(): void {
  initObservability();
}

// =============================================================================
// Analysis Tracing
// =============================================================================

export interface AnalysisTraceOptions {
  tool: string;
  url: string;
  provider: string;
  aiTaskType?: AITaskType;
}

/**
 * Create a trace for a site analysis operation
 */
export function createAnalysisTrace(options: AnalysisTraceOptions): TraceHandle {
  return createTrace({
    name: `${SERVER_NAME}:${options.tool}`,
    input: { url: options.url },
    metadata: {
      ...mcpToolMetadata(SERVER_NAME, options.tool, options.aiTaskType || 'extract'),
      'webflow.url': options.url,
      'browser.provider': options.provider,
      'mcp.server_version': SERVER_VERSION
    },
    tags: ['mcp', 'webflow', 'site-analysis', options.tool, options.provider]
  });
}

/**
 * Create a span for browser session
 */
export function createBrowserSpan(trace: TraceHandle, url: string): SpanHandle {
  return createSpan(trace, {
    name: 'browser-session',
    input: { url },
    metadata: {
      'browser.url': url,
      'system_task.type': 'routing'
    }
  });
}

/**
 * Create a span for extraction operation
 */
export function createExtractionSpan(trace: TraceHandle, extractionType: string): SpanHandle {
  return createSpan(trace, {
    name: `extract:${extractionType}`,
    metadata: {
      'ai_task.type': 'extract',
      'ai_task.skill': extractionType
    }
  });
}

// =============================================================================
// Metrics Recording
// =============================================================================

/**
 * Record analysis completion metrics
 */
export function recordAnalysisMetrics(
  trace: TraceHandle,
  metrics: AnalysisMetrics
): void {
  // Log success/failure event
  logEvent(trace, {
    name: metrics.success ? 'analysis_completed' : 'analysis_failed',
    metadata: {
      'webflow.url': metrics.url,
      'browser.provider': metrics.provider,
      'browser.duration_ms': metrics.durationMs,
      'browser.minutes': metrics.browserMinutes,
      'extraction.items_count': metrics.itemsExtracted || 0,
      ...(metrics.errorMessage && { error_message: metrics.errorMessage })
    },
    level: metrics.success ? 'DEFAULT' : 'ERROR'
  });

  // Record duration score
  recordScore(trace, {
    name: 'analysis_duration_ms',
    value: metrics.durationMs,
    dataType: 'NUMERIC',
    comment: `Analysis took ${metrics.durationMs}ms`
  });

  // Record cost estimate
  const estimatedCost = metrics.browserMinutes * COST_PER_BROWSER_MINUTE;
  recordScore(trace, {
    name: 'estimated_cost_usd',
    value: estimatedCost,
    dataType: 'NUMERIC',
    comment: `Estimated cost: $${estimatedCost.toFixed(4)}`
  });

  // Record items extracted if applicable
  if (metrics.itemsExtracted !== undefined) {
    recordScore(trace, {
      name: 'items_extracted',
      value: metrics.itemsExtracted,
      dataType: 'NUMERIC'
    });
  }
}

/**
 * Record SEO score
 */
export function recordSEOScore(trace: TraceHandle, score: number): void {
  recordScore(trace, {
    name: 'seo_score',
    value: score,
    dataType: 'NUMERIC',
    comment: `SEO score: ${score}/100`
  });
}

/**
 * Record image optimization score
 */
export function recordImageOptimizationScore(trace: TraceHandle, score: number): void {
  recordScore(trace, {
    name: 'image_optimization_score',
    value: score,
    dataType: 'NUMERIC',
    comment: `Image optimization: ${score}%`
  });
}

/**
 * Record touchpoint count
 */
export function recordTouchpointCount(trace: TraceHandle, count: number): void {
  recordScore(trace, {
    name: 'touchpoint_count',
    value: count,
    dataType: 'NUMERIC'
  });
}

// =============================================================================
// Provider Health Recording
// =============================================================================

/**
 * Record provider health check result
 */
export function recordProviderHealth(
  trace: TraceHandle,
  health: ProviderHealthMetrics
): void {
  logEvent(trace, {
    name: 'provider_health_check',
    metadata: {
      'browser.provider': health.provider,
      'browser.is_healthy': health.isHealthy,
      'browser.success_rate': health.successRate,
      'browser.avg_latency_ms': health.averageLatencyMs,
      'browser.failure_count': health.failureCount
    },
    level: health.isHealthy ? 'DEFAULT' : 'WARNING'
  });
}

/**
 * Record browser session metrics
 */
export function recordSessionMetrics(
  trace: TraceHandle,
  provider: string,
  metrics: BrowserSessionMetrics
): void {
  logEvent(trace, {
    name: 'session_metrics',
    metadata: {
      'browser.provider': provider,
      'browser.sessions_created': metrics.sessionsCreated,
      'browser.sessions_closed': metrics.sessionsClosed,
      'browser.session_errors': metrics.sessionErrors,
      'browser.total_duration_ms': metrics.totalDurationMs,
      'browser.avg_duration_ms': metrics.averageDurationMs,
      'browser.page_loads_completed': metrics.pageLoadsCompleted,
      'browser.page_load_errors': metrics.pageLoadErrors
    }
  });
}

// =============================================================================
// Error Recording
// =============================================================================

/**
 * Record an analysis error
 */
export function recordAnalysisError(
  trace: TraceHandle,
  tool: string,
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  logEvent(trace, {
    name: 'analysis_error',
    metadata: {
      'ai_task.skill': tool,
      'error.message': errorMessage,
      'error.stack': errorStack,
      ...context
    },
    level: 'ERROR',
    statusMessage: errorMessage
  });
}

/**
 * Record a timeout event
 */
export function recordTimeout(
  trace: TraceHandle,
  tool: string,
  url: string,
  timeoutMs: number
): void {
  logEvent(trace, {
    name: 'analysis_timeout',
    metadata: {
      'ai_task.skill': tool,
      'webflow.url': url,
      'browser.timeout_ms': timeoutMs
    },
    level: 'WARNING',
    statusMessage: `Analysis timed out after ${timeoutMs}ms`
  });
}

// =============================================================================
// Cost Tracking
// =============================================================================

export interface CostSummary {
  totalBrowserMinutes: number;
  estimatedCostUSD: number;
  analysisCount: number;
  averageDurationMs: number;
}

/**
 * Calculate cost summary from metrics
 */
export function calculateCostSummary(analyses: AnalysisMetrics[]): CostSummary {
  const totalBrowserMinutes = analyses.reduce((sum, a) => sum + a.browserMinutes, 0);
  const totalDuration = analyses.reduce((sum, a) => sum + a.durationMs, 0);

  return {
    totalBrowserMinutes,
    estimatedCostUSD: totalBrowserMinutes * COST_PER_BROWSER_MINUTE,
    analysisCount: analyses.length,
    averageDurationMs: analyses.length > 0 ? totalDuration / analyses.length : 0
  };
}

// =============================================================================
// Atlas Metadata Helpers
// =============================================================================

/**
 * Create Webflow-specific Atlas metadata
 */
export function webflowAnalysisMetadata(
  tool: string,
  url: string,
  provider: string
): AtlasMetadata {
  return {
    'touchpoint.type': 'mcp_server',
    'touchpoint.mcp_server': SERVER_NAME,
    'ai_task.type': 'extract',
    'ai_task.skill': tool,
    'system_task.type': 'transformation',
    'data_artifact.category': 'result',
    'webflow.url': url,
    'browser.provider': provider
  };
}

// =============================================================================
// Re-exports
// =============================================================================

export {
  createTrace,
  createSpan,
  logEvent,
  recordScore
} from '@create-something/observability';

export {
  mcpToolMetadata,
  type AtlasMetadata,
  type AITaskType
} from '@create-something/observability/atlas';
