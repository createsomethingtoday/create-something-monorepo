/**
 * Zoom Clips MCP Observability
 * 
 * Extends the base observability package with Zoom Clips-specific metrics,
 * session tracking, and human-in-the-loop audit trail.
 */

import {
  initObservability,
  shutdownObservability as baseShutdown,
  createTrace,
  createSpan,
  logEvent,
  recordScore,
  type TraceHandle,
  type SpanHandle
} from '@create-something/observability';
import { mcpToolMetadata, type AITaskType, type AtlasMetadata } from '@create-something/observability/atlas';

// =============================================================================
// Constants
// =============================================================================

const SERVER_NAME = 'zoom-clips-mcp';
const SERVER_VERSION = '1.0.0';

// Cost per Steel browser hour (Steel pricing: $0.10/browser-hour)
const COST_PER_BROWSER_HOUR = 0.10;

// =============================================================================
// Initialization
// =============================================================================

export function initZoomClipsObservability(): void {
  initObservability();
}

export async function shutdownObservability(): Promise<void> {
  await baseShutdown();
}

// =============================================================================
// Session Tracing (Human-in-the-Loop)
// =============================================================================

export interface SessionTraceOptions {
  tool: string;
  sessionId?: string;
  url?: string;
  databaseId?: string;
  urlCount?: number;
}

/**
 * Create a trace for a session operation
 */
export function createSessionTrace(options: SessionTraceOptions): TraceHandle & { end: (output?: Record<string, unknown>) => void } {
  const trace = createTrace({
    name: `${SERVER_NAME}:${options.tool}`,
    input: {
      sessionId: options.sessionId,
      url: options.url,
      databaseId: options.databaseId,
      urlCount: options.urlCount
    },
    metadata: {
      ...mcpToolMetadata(SERVER_NAME, options.tool, 'extract'),
      'zoom.url': options.url,
      'hitl.session_id': options.sessionId,
      'mcp.server_version': SERVER_VERSION
    },
    tags: ['mcp', 'zoom-clips', 'hitl', options.tool]
  });

  return {
    ...trace,
    end: (output?: Record<string, unknown>) => {
      if (trace.trace) {
        trace.trace.update({ output });
      }
    }
  };
}

/**
 * Create a span for extraction operation
 */
export function createExtractionSpan(trace: TraceHandle, sessionId: string): SpanHandle {
  return createSpan(trace, {
    name: 'extract-clip',
    input: { sessionId },
    metadata: {
      'ai_task.type': 'extract',
      'ai_task.skill': 'zoom-clip-extraction',
      'hitl.session_id': sessionId
    }
  });
}

/**
 * Create a span for Notion sync operation
 */
export function createNotionSyncSpan(trace: TraceHandle, databaseId: string): SpanHandle {
  return createSpan(trace, {
    name: 'sync-to-notion',
    input: { databaseId },
    metadata: {
      'ai_task.type': 'transform',
      'ai_task.skill': 'notion-sync',
      'notion.database_id': databaseId
    }
  });
}

// =============================================================================
// Session Recording (Audit Trail)
// =============================================================================

export interface SessionRecordingData {
  sessionId: string;
  recordingUrl?: string;
  durationMs: number;
  clipCount: number;
}

/**
 * Record session recording URL for audit trail.
 * This is the key human-in-the-loop observability feature.
 */
export function recordSessionRecording(
  trace: TraceHandle,
  recording: SessionRecordingData
): void {
  // Log the recording event
  logEvent(trace, {
    name: 'hitl_session_recording',
    metadata: {
      'hitl.session_id': recording.sessionId,
      'hitl.recording_url': recording.recordingUrl,
      'hitl.duration_ms': recording.durationMs,
      'hitl.clip_count': recording.clipCount,
      'human_task.type': 'provide_input' // Human provides input by accessing transcript
    },
    level: 'DEFAULT'
  });

  // Record session duration as a score
  recordScore(trace, {
    name: 'session_duration_ms',
    value: recording.durationMs,
    dataType: 'NUMERIC',
    comment: `HITL session lasted ${Math.round(recording.durationMs / 1000)}s`
  });

  // Record clips extracted
  recordScore(trace, {
    name: 'clips_extracted',
    value: recording.clipCount,
    dataType: 'NUMERIC'
  });

  // Record estimated cost (Steel pricing)
  const hours = recording.durationMs / 3600000;
  const estimatedCost = hours * COST_PER_BROWSER_HOUR;
  recordScore(trace, {
    name: 'estimated_cost_usd',
    value: estimatedCost,
    dataType: 'NUMERIC',
    comment: `Steel cost: $${estimatedCost.toFixed(4)}`
  });
}

// =============================================================================
// Metrics Recording
// =============================================================================

export interface ExtractionMetrics {
  sessionId: string;
  url: string;
  success: boolean;
  hasTranscript: boolean;
  transcriptLength?: number;
  durationMs: number;
  errorMessage?: string;
}

/**
 * Record extraction completion metrics
 */
export function recordExtractionMetrics(
  trace: TraceHandle,
  metrics: ExtractionMetrics
): void {
  logEvent(trace, {
    name: metrics.success ? 'extraction_completed' : 'extraction_failed',
    metadata: {
      'hitl.session_id': metrics.sessionId,
      'zoom.url': metrics.url,
      'extraction.has_transcript': metrics.hasTranscript,
      'extraction.transcript_length': metrics.transcriptLength,
      'extraction.duration_ms': metrics.durationMs,
      ...(metrics.errorMessage && { error_message: metrics.errorMessage })
    },
    level: metrics.success ? 'DEFAULT' : 'ERROR'
  });

  // Record transcript length if present
  if (metrics.hasTranscript && metrics.transcriptLength) {
    recordScore(trace, {
      name: 'transcript_length',
      value: metrics.transcriptLength,
      dataType: 'NUMERIC',
      comment: `Transcript: ${metrics.transcriptLength} characters`
    });
  }
}

export interface NotionSyncMetrics {
  databaseId: string;
  total: number;
  successful: number;
  failed: number;
  durationMs: number;
}

/**
 * Record Notion sync metrics
 */
export function recordNotionSyncMetrics(
  trace: TraceHandle,
  metrics: NotionSyncMetrics
): void {
  const success = metrics.failed === 0;

  logEvent(trace, {
    name: success ? 'notion_sync_completed' : 'notion_sync_partial',
    metadata: {
      'notion.database_id': metrics.databaseId,
      'notion.total': metrics.total,
      'notion.successful': metrics.successful,
      'notion.failed': metrics.failed,
      'notion.duration_ms': metrics.durationMs
    },
    level: success ? 'DEFAULT' : 'WARNING'
  });

  // Record success rate
  const successRate = metrics.total > 0 ? metrics.successful / metrics.total : 0;
  recordScore(trace, {
    name: 'notion_sync_success_rate',
    value: successRate,
    dataType: 'NUMERIC',
    comment: `${Math.round(successRate * 100)}% success rate`
  });
}

// =============================================================================
// Error Recording
// =============================================================================

/**
 * Record an error
 */
export function recordError(
  trace: TraceHandle,
  tool: string,
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  logEvent(trace, {
    name: 'zoom_clips_error',
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

// =============================================================================
// Atlas Metadata Helpers
// =============================================================================

/**
 * Create Zoom Clips-specific Atlas metadata
 */
export function zoomClipsMetadata(
  tool: string,
  sessionId?: string,
  url?: string
): AtlasMetadata {
  return {
    'touchpoint.type': 'mcp_server',
    'touchpoint.mcp_server': SERVER_NAME,
    'ai_task.type': 'extract',
    'ai_task.skill': tool,
    'system_task.type': 'transformation',
    'data_artifact.category': 'result',
    'hitl.enabled': true,
    'hitl.session_id': sessionId,
    'zoom.url': url
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
