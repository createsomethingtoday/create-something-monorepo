/**
 * YouTube Sync Observability
 * 
 * Extends the base observability package with YouTube-specific metrics,
 * playlist tracking, and transcript extraction audit trail.
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
import { mcpToolMetadata, type AtlasMetadata } from '@create-something/observability/atlas';

import {
  SERVER_NAME,
  SERVER_VERSION,
  STEEL_COST_PER_HOUR
} from './config.js';

// =============================================================================
// Initialization
// =============================================================================

export function initYouTubeSyncObservability(): void {
  initObservability();
}

export async function shutdownObservability(): Promise<void> {
  await baseShutdown();
}

// =============================================================================
// Session Tracing
// =============================================================================

export interface SessionTraceOptions {
  tool: string;
  sessionId?: string;
  playlistUrl?: string;
  videoUrl?: string;
  databaseId?: string;
  videoCount?: number;
}

/**
 * Create a trace for a session operation
 */
export function createSessionTrace(options: SessionTraceOptions): TraceHandle & { end: (output?: Record<string, unknown>) => void } {
  const trace = createTrace({
    name: `${SERVER_NAME}:${options.tool}`,
    input: {
      sessionId: options.sessionId,
      playlistUrl: options.playlistUrl,
      videoUrl: options.videoUrl,
      databaseId: options.databaseId,
      videoCount: options.videoCount
    },
    metadata: {
      ...mcpToolMetadata(SERVER_NAME, options.tool, 'extract'),
      'youtube.playlist_url': options.playlistUrl,
      'youtube.video_url': options.videoUrl,
      'mcp.server_version': SERVER_VERSION
    },
    tags: ['mcp', 'youtube-sync', 'half-dozen', options.tool]
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
 * Create a span for playlist extraction operation
 */
export function createPlaylistExtractionSpan(trace: TraceHandle, playlistUrl: string): SpanHandle {
  return createSpan(trace, {
    name: 'extract-playlist',
    input: { playlistUrl },
    metadata: {
      'ai_task.type': 'extract',
      'ai_task.skill': 'youtube-playlist-extraction',
      'youtube.playlist_url': playlistUrl
    }
  });
}

/**
 * Create a span for video transcript extraction
 */
export function createTranscriptExtractionSpan(trace: TraceHandle, videoId: string): SpanHandle {
  return createSpan(trace, {
    name: 'extract-transcript',
    input: { videoId },
    metadata: {
      'ai_task.type': 'extract',
      'ai_task.skill': 'youtube-transcript-extraction',
      'youtube.video_id': videoId
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
  videoCount: number;
  playlistId?: string;
}

/**
 * Record session recording URL for audit trail.
 */
export function recordSessionRecording(
  trace: TraceHandle,
  recording: SessionRecordingData
): void {
  // Log the recording event
  logEvent(trace, {
    name: 'youtube_session_recording',
    metadata: {
      'session_id': recording.sessionId,
      'recording_url': recording.recordingUrl,
      'duration_ms': recording.durationMs,
      'video_count': recording.videoCount,
      'youtube.playlist_id': recording.playlistId
    },
    level: 'DEFAULT'
  });

  // Record session duration as a score
  recordScore(trace, {
    name: 'session_duration_ms',
    value: recording.durationMs,
    dataType: 'NUMERIC',
    comment: `Session lasted ${Math.round(recording.durationMs / 1000)}s`
  });

  // Record videos extracted
  recordScore(trace, {
    name: 'videos_extracted',
    value: recording.videoCount,
    dataType: 'NUMERIC'
  });

  // Record estimated cost (Steel pricing)
  const hours = recording.durationMs / 3600000;
  const estimatedCost = hours * STEEL_COST_PER_HOUR;
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

export interface PlaylistExtractionMetrics {
  playlistId: string;
  playlistUrl: string;
  videoCount: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Record playlist extraction metrics
 */
export function recordPlaylistMetrics(
  trace: TraceHandle,
  metrics: PlaylistExtractionMetrics
): void {
  logEvent(trace, {
    name: metrics.success ? 'playlist_extracted' : 'playlist_extraction_failed',
    metadata: {
      'youtube.playlist_id': metrics.playlistId,
      'youtube.playlist_url': metrics.playlistUrl,
      'extraction.video_count': metrics.videoCount,
      'extraction.duration_ms': metrics.durationMs,
      ...(metrics.errorMessage && { error_message: metrics.errorMessage })
    },
    level: metrics.success ? 'DEFAULT' : 'ERROR'
  });

  recordScore(trace, {
    name: 'playlist_video_count',
    value: metrics.videoCount,
    dataType: 'NUMERIC',
    comment: `Playlist has ${metrics.videoCount} videos`
  });
}

export interface TranscriptExtractionMetrics {
  videoId: string;
  url: string;
  success: boolean;
  hasTranscript: boolean;
  transcriptLength?: number;
  extractionMethod: 'api' | 'captions' | 'browser';
  durationMs: number;
  errorMessage?: string;
}

/**
 * Record transcript extraction metrics
 */
export function recordTranscriptMetrics(
  trace: TraceHandle,
  metrics: TranscriptExtractionMetrics
): void {
  logEvent(trace, {
    name: metrics.success ? 'transcript_extracted' : 'transcript_extraction_failed',
    metadata: {
      'youtube.video_id': metrics.videoId,
      'youtube.url': metrics.url,
      'extraction.has_transcript': metrics.hasTranscript,
      'extraction.transcript_length': metrics.transcriptLength,
      'extraction.method': metrics.extractionMethod,
      'extraction.duration_ms': metrics.durationMs,
      ...(metrics.errorMessage && { error_message: metrics.errorMessage })
    },
    level: metrics.success ? 'DEFAULT' : 'ERROR'
  });

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
  skipped: number;
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
      'notion.skipped': metrics.skipped,
      'notion.duration_ms': metrics.durationMs
    },
    level: success ? 'DEFAULT' : 'WARNING'
  });

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
    name: 'youtube_sync_error',
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
 * Create YouTube Sync-specific Atlas metadata
 */
export function youtubeMetadata(
  tool: string,
  playlistUrl?: string,
  videoUrl?: string
): AtlasMetadata {
  return {
    'touchpoint.type': 'mcp_server',
    'touchpoint.mcp_server': SERVER_NAME,
    'ai_task.type': 'extract',
    'ai_task.skill': tool,
    'system_task.type': 'transformation',
    'data_artifact.category': 'result',
    'youtube.playlist_url': playlistUrl,
    'youtube.video_url': videoUrl
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
  type AtlasMetadata
} from '@create-something/observability/atlas';
