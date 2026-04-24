export type TranscriptProviderName = 'supadata' | 'direct' | 'browser';
export type TranscriptExtractionMethod = TranscriptProviderName | 'unavailable';

export interface TranscriptSegment {
  text: string;
  startSeconds: number;
  endSeconds?: number;
}

export interface SourceAttemptDiagnostic {
  provider: TranscriptProviderName;
  ok: boolean;
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface TranscriptDiagnostics {
  attempts: SourceAttemptDiagnostic[];
  [key: string]: unknown;
}

export interface TranscriptRecord {
  videoId: string;
  url: string;
  title: string;
  channelName?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  transcript: string;
  segments: TranscriptSegment[];
  extractionMethod: TranscriptExtractionMethod;
  language?: string;
  warnings: string[];
  sourceDiagnostics: TranscriptDiagnostics;
  playlistId?: string;
  playlistTitle?: string;
  dateAddedToPlaylist?: string;
  captionsSource?: string;
}

export interface TranscriptExtractionInput {
  videoUrl: string;
  language?: string;
  includeTimestamps?: boolean;
}

export interface TranscriptProviderError {
  code: string;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export type TranscriptProviderResult =
  | {
      ok: true;
      record: TranscriptRecord;
    }
  | {
      ok: false;
      error: TranscriptProviderError;
    };

export interface TranscriptProviderStatus {
  name: TranscriptProviderName;
  configured: boolean;
  available: boolean;
  details?: Record<string, unknown>;
}

export interface TranscriptProvider {
  readonly name: TranscriptProviderName;
  extract(input: TranscriptExtractionInput): Promise<TranscriptProviderResult>;
  getStatus(): TranscriptProviderStatus;
}

export interface NotionPropertyMapping {
  title?: string;
  url?: string;
  videoId?: string;
  channelName?: string;
  publishedAt?: string;
  dateAddedToPlaylist?: string;
  thumbnailUrl?: string;
  language?: string;
  type?: string;
  source?: string;
  pageStatus?: string;
  notes?: string;
  playlistId?: string;
  playlistTitle?: string;
  extractionMethod?: string;
  transcriptStatus?: string;
  syncedAt?: string;
}

export interface ResolvedNotionPropertyMapping {
  title: string;
  url?: string;
  videoId?: string;
  channelName?: string;
  publishedAt?: string;
  dateAddedToPlaylist?: string;
  thumbnailUrl?: string;
  language?: string;
  type?: string;
  source?: string;
  pageStatus?: string;
  notes?: string;
  playlistId?: string;
  playlistTitle?: string;
  extractionMethod?: string;
  transcriptStatus?: string;
  syncedAt?: string;
}

export interface NotionDatabaseProperty {
  id?: string;
  name: string;
  type: string;
}

export interface NotionDatabaseSchema {
  databaseId: string;
  dataSourceId: string;
  title?: unknown;
  properties: Record<string, NotionDatabaseProperty>;
}

export interface SyncVideoToNotionInput {
  videoUrl: string;
  databaseId?: string;
  propertyMapping?: Partial<NotionPropertyMapping>;
  includeTimestamps?: boolean;
}

export interface SyncTranscriptToNotionOptions {
  databaseId?: string;
  propertyMapping?: Partial<NotionPropertyMapping>;
  includeTimestamps?: boolean;
  replaceExistingTranscript?: boolean;
  transcriptHeaderLines?: string[];
  transcriptBodyText?: string;
}

export interface ResolveNotionPageVideoSourceOptions {
  propertyMapping?: Partial<NotionPropertyMapping>;
  videoUrl?: string;
}

export interface NotionPageVideoSource {
  pageId: string;
  pageUrl?: string;
  title?: string;
  videoUrl: string;
  videoId: string;
  source: 'override' | 'property' | 'block';
  sourceProperty?: string;
  warnings: string[];
  propertyMapping: ResolvedNotionPropertyMapping;
}

export interface SyncTranscriptToPageOptions {
  propertyMapping?: Partial<NotionPropertyMapping>;
  includeTimestamps?: boolean;
  replaceExistingTranscript?: boolean;
  transcriptHeaderLines?: string[];
  transcriptBodyText?: string;
}

export interface NotionSyncResult {
  databaseId: string;
  dataSourceId: string;
  pageId: string;
  pageUrl?: string;
  action: 'created' | 'updated';
  transcriptAction: 'appended' | 'skipped_existing' | 'none';
  matchedOn?: 'url' | 'videoId';
  warnings: string[];
  propertyMapping: ResolvedNotionPropertyMapping;
}

export interface NotionPageSyncResult {
  pageId: string;
  pageUrl?: string;
  action: 'updated';
  transcriptAction: 'appended' | 'skipped_existing' | 'none';
  warnings: string[];
  propertyMapping: ResolvedNotionPropertyMapping;
}

export interface PlaylistListItem {
  playlistId: string;
  playlistUrl: string;
  playlistTitle?: string;
  videoId: string;
  videoUrl: string;
  title: string;
  channelName?: string;
  publishedAt?: string;
  dateAddedToPlaylist?: string;
  thumbnailUrl?: string;
  position?: number;
}

export interface ListPlaylistItemsInput {
  playlistId: string;
  limit?: number;
  pageToken?: string;
}

export interface ListPlaylistItemsResult {
  playlistId: string;
  playlistUrl: string;
  playlistTitle?: string;
  items: PlaylistListItem[];
  nextPageToken?: string;
  limit: number;
}

export interface PlaylistSyncStateSummary {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  cutoffApplied: boolean;
}

export interface PlaylistSyncStateSnapshot {
  playlistId: string;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastAttemptAt?: string;
  lastProcessedAt?: string;
  recentItemKeys: string[];
  recentVideoIds: string[];
  lastSummary?: PlaylistSyncStateSummary;
  lastError?: {
    code: string;
    message: string;
    at: string;
  };
  activeRun?: {
    runId: string;
    source: string;
    startedAt: string;
    leaseExpiresAt: string;
  };
}

export interface PlaylistSyncLease {
  acquired: boolean;
  state: PlaylistSyncStateSnapshot;
  activeRun?: PlaylistSyncStateSnapshot['activeRun'];
}

export interface PlaylistStateStore {
  getState(playlistId: string): Promise<PlaylistSyncStateSnapshot>;
  acquireLease(
    playlistId: string,
    input: {
      runId: string;
      source: string;
      leaseMs: number;
      now?: string;
    },
  ): Promise<PlaylistSyncLease>;
  completeRun(
    playlistId: string,
    input: {
      runId: string;
      recentItemKeys: string[];
      recentVideoIds: string[];
      processedAt?: string;
      summary: PlaylistSyncStateSummary;
      now?: string;
    },
  ): Promise<PlaylistSyncStateSnapshot>;
  failRun(
    playlistId: string,
    input: {
      runId: string;
      error: {
        code: string;
        message: string;
      };
      now?: string;
    },
  ): Promise<PlaylistSyncStateSnapshot>;
}

export interface PlaylistSyncItemResult {
  videoId: string;
  url: string;
  title: string;
  dateAddedToPlaylist?: string;
  transcriptStatus: 'available' | 'unavailable';
  extractionMethod: TranscriptExtractionMethod;
  action?: NotionSyncResult['action'];
  transcriptAction?: NotionSyncResult['transcriptAction'];
  matchedOn?: NotionSyncResult['matchedOn'];
  pageId?: string;
  pageUrl?: string;
  warnings: string[];
  skippedReason?: 'already_seen' | 'manual_cutoff' | 'dry_run';
  error?: {
    code: string;
    message: string;
  };
}

export interface SyncPlaylistToNotionInput {
  playlistId?: string;
  databaseId?: string;
  propertyMapping?: Partial<NotionPropertyMapping>;
  includeTimestamps?: boolean;
  maxItems?: number;
  maxScanItems?: number;
  dryRun?: boolean;
  sinceCursor?: string;
  automation?: boolean;
}

export interface PlaylistSyncResult {
  playlistId: string;
  playlistUrl: string;
  playlistTitle?: string;
  databaseId?: string;
  dryRun: boolean;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  cutoffApplied: boolean;
  processedCount: number;
  state: PlaylistSyncStateSnapshot;
  items: PlaylistSyncItemResult[];
}

export interface SearchResultItem {
  id: string;
  title: string;
  text?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface FetchDocumentResult {
  id: string;
  title: string;
  text: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface TranscriptService {
  extract(input: TranscriptExtractionInput): Promise<TranscriptRecord>;
  getStatus(): Record<string, unknown>;
}

export interface NotionService {
  isConfigured(): boolean;
  getStatus(): Record<string, unknown>;
  getDatabaseSchema(databaseId?: string): Promise<NotionDatabaseSchema>;
  resolvePageVideoSource(
    pageId: string,
    options?: ResolveNotionPageVideoSourceOptions,
  ): Promise<NotionPageVideoSource>;
  syncTranscript(
    record: TranscriptRecord,
    options: SyncTranscriptToNotionOptions,
  ): Promise<NotionSyncResult>;
  syncTranscriptToPage(
    pageId: string,
    record: TranscriptRecord,
    options: SyncTranscriptToPageOptions,
  ): Promise<NotionPageSyncResult>;
  searchDocuments(query: string): Promise<SearchResultItem[]>;
  fetchDocument(id: string): Promise<FetchDocumentResult>;
}

export interface PlaylistService {
  listItems(input: ListPlaylistItemsInput): Promise<ListPlaylistItemsResult>;
  syncPlaylist(input: SyncPlaylistToNotionInput): Promise<PlaylistSyncResult>;
  getStatus(playlistId?: string): Promise<Record<string, unknown>>;
}

export interface RuntimeDependencies {
  transcriptService: TranscriptService;
  notionService: NotionService;
  playlistService: PlaylistService;
  serverInfo: {
    name: string;
    version: string;
    displayName: string;
    description: string;
    defaultLanguage: string;
    directProviderMode?: 'auto' | 'browser-first';
    security: {
      bearerProtectionEnabled: boolean;
      unauthenticatedBillableTranscriptAccess: boolean;
      unauthenticatedNotionAccess: boolean;
      recommendations: string[];
    };
    configWarnings: string[];
  };
}
