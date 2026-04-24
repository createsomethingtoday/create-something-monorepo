export type TranscriptProviderName = 'supadata' | 'direct' | 'browser';

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
  extractionMethod: TranscriptProviderName;
  language?: string;
  warnings: string[];
  sourceDiagnostics: TranscriptDiagnostics;
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
  thumbnailUrl?: string;
  language?: string;
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
  thumbnailUrl?: string;
  language?: string;
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
  syncTranscript(
    record: TranscriptRecord,
    options: Omit<SyncVideoToNotionInput, 'videoUrl'>,
  ): Promise<NotionSyncResult>;
  searchDocuments(query: string): Promise<SearchResultItem[]>;
  fetchDocument(id: string): Promise<FetchDocumentResult>;
}

export interface RuntimeDependencies {
  transcriptService: TranscriptService;
  notionService: NotionService;
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
