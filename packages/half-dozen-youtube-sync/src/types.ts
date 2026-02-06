/**
 * Type definitions for Half Dozen YouTube Sync
 */

// =============================================================================
// YouTube Types
// =============================================================================

export interface YouTubeVideo {
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  duration?: string;
  channelName?: string;
  publishedAt?: string;
  viewCount?: string;
}

export interface YouTubePlaylist {
  playlistId: string;
  title: string;
  url: string;
  channelName?: string;
  videoCount: number;
  videos: YouTubeVideo[];
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface VideoData {
  videoId: string;
  url: string;
  title: string;
  channelName?: string;
  publishedAt?: string;
  duration?: string;
  transcript?: string;
  transcriptSegments?: TranscriptSegment[];
  thumbnailUrl?: string;
  scrapedAt: string;
  extractionMethod: 'youtube-transcript-api' | 'steel';
  playlistId?: string;
  playlistTitle?: string;
}

// =============================================================================
// Steel Session Types
// =============================================================================

export interface SteelSession {
  id: string;
  liveViewUrl: string;
  debuggerUrl?: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'ready' | 'extracting' | 'error' | 'closed';
  currentUrl?: string;
  recordingEnabled: boolean;
}

export interface SessionStatus {
  sessionId: string;
  status: SteelSession['status'];
  currentUrl?: string;
  isReady: boolean;
  elapsedMs: number;
  remainingMs: number;
}

export interface SessionRecording {
  sessionId: string;
  recordingUrl?: string;
  durationMs: number;
  videoCount: number;
}

export interface BrowserSessionMetrics {
  sessionsCreated: number;
  sessionsClosed: number;
  sessionErrors: number;
  totalDurationMs: number;
  averageDurationMs: number;
  videosExtracted: number;
  extractionErrors: number;
}

// =============================================================================
// Notion Types
// =============================================================================

export interface NotionPropertyMapping {
  title: string;           // Video title
  url: string;             // YouTube URL (used for dedup)
  description?: string;    // Video description
  transcript?: string;     // Transcript (stored in page body as toggle)
  duration?: string;       // Video duration
  channelName?: string;    // Channel name
  thumbnailUrl?: string;   // Thumbnail URL
  publishedAt?: string;    // Video publish date
  scrapedAt?: string;      // When we scraped it
  date?: string;           // Date property in Notion
  status?: string;         // Select: Active
  source?: string;         // Select: Internal
  type?: string;           // Select: Video
}

export interface NotionSelectDefaults {
  status?: string;         // "Active"
  source?: string;         // "Internal"
  type?: string;           // "Video"
}

export interface NotionSyncResult {
  success: boolean;
  pageId?: string;
  pageUrl?: string;
  error?: string;
}

export interface BatchSyncResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: NotionSyncResult[];
}

// =============================================================================
// MCP Tool Input Types
// =============================================================================

export interface CreateSessionInput {
  url?: string;
  timeout?: number;
}

export interface SessionStatusInput {
  sessionId: string;
}

export interface CloseSessionInput {
  sessionId: string;
}

export interface ScrapePlaylistInput {
  sessionId?: string;
  playlistUrl: string;
  limit?: number;
}

export interface ScrapeVideoInput {
  sessionId: string;
  videoUrl?: string;
}

export interface NavigateInput {
  sessionId: string;
  url: string;
}

export interface SyncToNotionInput {
  videos: VideoData[];
  databaseId: string;
  propertyMapping?: Partial<NotionPropertyMapping>;
}

export interface SyncPlaylistInput {
  playlistUrl: string;
  databaseId: string;
  limit?: number;
  propertyMapping?: Partial<NotionPropertyMapping>;
}

// =============================================================================
// Notion API Response Types (strict, replaces `as unknown as` assertions)
// =============================================================================

/** Notion page object from API responses */
export interface NotionPage {
  id: string;
  url?: string;
  properties: Record<string, NotionPropertyValue>;
}

/** Union of Notion property value types we work with */
export type NotionPropertyValue =
  | { type: 'title'; title: Array<{ plain_text: string }> }
  | { type: 'url'; url: string | null }
  | { type: 'date'; date: { start: string; end?: string | null } | null }
  | { type: 'select'; select: { name: string } | null }
  | { type: 'rich_text'; rich_text: Array<{ plain_text: string }> }
  | { type: 'email'; email: string | null }
  | { type: 'number'; number: number | null }
  | { type: 'checkbox'; checkbox: boolean }
  | { type: 'relation'; relation: Array<{ id: string }> }
  | { type: string; [key: string]: unknown };

/** Notion database query response */
export interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

/** Notion database retrieve response */
export interface NotionDatabaseResponse {
  id: string;
  title: Array<{ plain_text: string }>;
  properties: Record<string, { type: string; name: string }>;
}

/** Notion blocks append response */
export interface NotionBlocksAppendResponse {
  results: Array<{ id: string; type: string }>;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface YouTubeSyncConfig {
  playlistUrl: string;
  databaseId: string;
  limit?: number;
  propertyMapping?: Partial<NotionPropertyMapping>;
  selectDefaults?: NotionSelectDefaults;
  skipDuplicates?: boolean;
}
