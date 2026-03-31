export interface Env {
  DB: D1Database;
  SYNC_QUEUE: Queue<TranscriptQueueMessage>;
  SYNC_API_KEY?: string;

  ZOOM_ACCESS_TOKEN?: string;
  ZOOM_CLIENT_ID?: string;
  ZOOM_CLIENT_SECRET?: string;
  ZOOM_ACCOUNT_ID?: string;
  ZOOM_REFRESH_TOKEN?: string;
  ZOOM_REDIRECT_URI?: string;
  ZOOM_USER_ID?: string;
  ZOOM_LOOKBACK_DAYS?: string;
  ZOOM_PAGE_SIZE?: string;

  NOTION_DATABASE_ID: string;
  NOTION_API_KEY?: string;
  NOTION_WRITE_MODE?: 'api' | 'hub';
  NOTION_HUB_URL?: string;
  NOTION_HUB_API_TOKEN?: string;
  NOTION_HUB_PROXY_TOOL?: string;
  NOTION_HUB_EXPERIMENT_ID?: string;
  NOTION_HUB_CANDIDATE_ID?: string;
  NOTION_HUB_BASELINE_ID?: string;
  NOTION_HUB_COHORT?: string;
  NOTION_HUB_PHASE?: string;
  NOTION_RUNTIME_CONNECTION_REF?: string;
  NOTION_DEFAULT_STATUS?: string;
  NOTION_DEFAULT_SOURCE?: string;
  NOTION_DEFAULT_TYPE?: string;
  NOTION_ATTENDEES_PROPERTY?: string;
}

export interface TranscriptCandidate {
  dedupKey: string;
  canonicalMeetingKey: string;
  meetingId: string | null;
  meetingUuid: string | null;
  meetingTitle: string;
  meetingDate: string;
  startTime: string | null;
  sourceUrl: string | null;
  originalSourceUrl: string | null;
  transcriptDownloadUrl: string;
  transcriptFileId: string | null;
  transcriptFileType: string | null;
  transcriptFileExtension: string | null;
  hostId: string | null;
}

export interface TranscriptQueueMessage extends TranscriptCandidate {
  runId: number | null;
  replay: boolean;
}

export interface TranscriptSegment {
  timestamp: string;
  text: string;
}

export interface ParsedTranscript {
  rawText: string;
  plainText: string;
  segments: TranscriptSegment[];
  speakers: string[];
}

export interface ZoomDiscoveryResult {
  candidates: TranscriptCandidate[];
  meetingsScanned: number;
  transcriptFilesScanned: number;
  from: string;
  to: string;
}

export interface NotionPageSummary {
  id: string;
  url: string;
  title: string;
  sourceUrl: string | null;
  date: string | null;
}

export interface NotionWriteResult {
  pageId: string;
  pageUrl: string;
  action: 'created' | 'updated' | 'skipped';
  reason?: string;
}

export interface SyncRunSummary {
  runId: number;
  trigger: string;
  discovered: number;
  queued: number;
  skipped: number;
  meetingsScanned: number;
  transcriptFilesScanned: number;
  from: string;
  to: string;
}

export interface LedgerRow {
  id: number;
  dedup_key: string;
  canonical_meeting_key: string;
  zoom_meeting_id: string | null;
  zoom_meeting_uuid: string | null;
  meeting_title: string;
  meeting_date: string;
  recording_start_time: string | null;
  source_url: string | null;
  original_source_url: string | null;
  transcript_file_id: string | null;
  transcript_download_url: string;
  transcript_file_type: string | null;
  transcript_file_extension: string | null;
  transcript_sha256: string | null;
  notion_page_id: string | null;
  notion_page_url: string | null;
  status: string;
  last_error: string | null;
  first_seen_at: string;
  last_seen_at: string;
  enqueued_at: string | null;
  last_synced_at: string | null;
  updated_at: string;
}

export interface SyncRunRow {
  id: number;
  trigger: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  discovered_count: number;
  queued_count: number;
  skipped_count: number;
  synced_count: number;
  failed_count: number;
  error: string | null;
}
