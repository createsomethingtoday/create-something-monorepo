/**
 * Centralized configuration for Half Dozen YouTube Sync
 * 
 * All configurable values in one place. Reads from environment variables
 * with sensible defaults. No hardcoded magic numbers scattered across files.
 */

// =============================================================================
// Steel Browser Configuration
// =============================================================================

/** Default Steel session timeout (1 hour) */
export const STEEL_SESSION_TIMEOUT = parseInt(
  process.env.YOUTUBE_SYNC_SESSION_TIMEOUT || '3600000',
  10
);

/** Cost per Steel browser hour (for observability tracking) */
export const STEEL_COST_PER_HOUR = parseFloat(
  process.env.YOUTUBE_SYNC_STEEL_COST_PER_HOUR || '0.10'
);

// =============================================================================
// Retry Configuration
// =============================================================================

/** Maximum retry attempts for API calls */
export const MAX_RETRIES = parseInt(
  process.env.YOUTUBE_SYNC_MAX_RETRIES || '3',
  10
);

/** Base delay for exponential backoff (ms) */
export const RETRY_BASE_DELAY = parseInt(
  process.env.YOUTUBE_SYNC_RETRY_BASE_DELAY || '1000',
  10
);

/** Maximum delay between retries (ms) */
export const RETRY_MAX_DELAY = parseInt(
  process.env.YOUTUBE_SYNC_RETRY_MAX_DELAY || '30000',
  10
);

// =============================================================================
// Notion Configuration
// =============================================================================

/** Notion rate limit delay between requests (ms) */
export const NOTION_RATE_LIMIT_DELAY = parseInt(
  process.env.YOUTUBE_SYNC_NOTION_RATE_LIMIT_DELAY || '350',
  10
);

/** Maximum characters per Notion rich text object (API limit is 2000) */
export const NOTION_MAX_RICH_TEXT_LENGTH = 2000;

/** Buffer for safe chunking (leave room for sentence completion) */
export const NOTION_CHUNK_SIZE = parseInt(
  process.env.YOUTUBE_SYNC_NOTION_CHUNK_SIZE || '1900',
  10
);

/** Maximum blocks per Notion append request (API limit) */
export const NOTION_MAX_BLOCKS_PER_REQUEST = 100;

/** Default Notion database ID */
export const NOTION_DEFAULT_DATABASE_ID = process.env.NOTION_DATABASE_ID;

// =============================================================================
// YouTube Configuration
// =============================================================================

/** Transcript extraction timeout (ms) */
export const TRANSCRIPT_TIMEOUT = parseInt(
  process.env.YOUTUBE_SYNC_TRANSCRIPT_TIMEOUT || '30000',
  10
);

/** Max scrolls when loading playlist videos */
export const PLAYLIST_MAX_SCROLLS = parseInt(
  process.env.YOUTUBE_SYNC_PLAYLIST_MAX_SCROLLS || '50',
  10
);

/** Delay between video extractions (ms) */
export const VIDEO_EXTRACTION_DELAY = parseInt(
  process.env.YOUTUBE_SYNC_VIDEO_EXTRACTION_DELAY || '500',
  10
);

// =============================================================================
// Server Configuration
// =============================================================================

export const SERVER_NAME = 'half-dozen-youtube-sync';
export const SERVER_VERSION = '1.1.0';
