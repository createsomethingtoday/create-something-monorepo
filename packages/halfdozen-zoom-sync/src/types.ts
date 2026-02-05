/**
 * Zoom Clips MCP Types
 * 
 * Types for Zoom Clips extraction, session management, and Notion sync.
 */

// =============================================================================
// Clip Data Types
// =============================================================================

export interface ClipData {
  // Basic metadata
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  
  // Full extraction (requires human-in-the-loop for transcript)
  transcript?: string;
  duration?: string;        // e.g., "2:34"
  durationSeconds?: number;
  speaker?: string;
  createdAt?: string;
  
  // Extraction metadata
  scrapedAt: string;
  extractionMethod: 'steel' | 'api';
  sessionId?: string;
}

export interface ClipExtractionResult {
  success: boolean;
  clip?: ClipData;
  error?: string;
  warnings?: string[];
}

// =============================================================================
// Session Management Types (Human-in-the-Loop)
// =============================================================================

export interface SteelSession {
  id: string;
  liveViewUrl: string;      // URL for human to view/interact with browser
  debuggerUrl: string;      // WebSocket URL for Puppeteer
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'ready' | 'extracting' | 'closed' | 'error';
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
  clipCount: number;
}

// =============================================================================
// Notion Sync Types
// =============================================================================

export interface NotionPropertyMapping {
  // Maps ClipData fields to Notion property names
  title: string;           // Title property (required)
  url?: string;            // URL property
  description?: string;    // Rich text property
  transcript?: string;     // Rich text property (long form)
  duration?: string;       // Rich text or number property
  speaker?: string;        // Rich text property
  thumbnailUrl?: string;   // URL property
  videoUrl?: string;       // URL property
  scrapedAt?: string;      // Date property
  
  // Select properties (optional - set static values)
  status?: string;         // Select property name
  source?: string;         // Select property name
  type?: string;           // Select property name
  date?: string;           // Date property name (for clip created date)
}

/**
 * Default values for select properties
 */
export interface NotionSelectDefaults {
  status?: string;         // e.g., "Active"
  source?: string;         // e.g., "Zoom"
  type?: string;           // e.g., "Clip"
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
  skipped?: number;  // Clips skipped due to dedup
  results: NotionSyncResult[];
}

// =============================================================================
// Tool Input Types
// =============================================================================

export interface CreateSessionInput {
  url?: string;            // Initial URL to navigate to
  timeout?: number;        // Session timeout in ms (default: 24 hours)
}

export interface SessionStatusInput {
  sessionId: string;
}

export interface CloseSessionInput {
  sessionId: string;
}

export interface ScrapeClipInput {
  sessionId: string;
}

export interface BatchScrapeInput {
  urls: string[];
  concurrency?: number;    // Default: 1 (sequential for HITL)
  notifyUrl?: string;      // Webhook to notify when ready for next
}

export interface SyncToNotionInput {
  clips: ClipData[];
  databaseId: string;
  propertyMapping?: Partial<NotionPropertyMapping>;
}

export interface ScrapeAndSyncInput {
  urls: string[];
  databaseId: string;
  propertyMapping?: Partial<NotionPropertyMapping>;
}

export interface NavigateInput {
  sessionId: string;
  url: string;
}

// =============================================================================
// Browser Provider Types
// =============================================================================

export interface BrowserSessionMetrics {
  sessionsCreated: number;
  sessionsClosed: number;
  sessionErrors: number;
  totalDurationMs: number;
  averageDurationMs: number;
  clipsExtracted: number;
  extractionErrors: number;
}
