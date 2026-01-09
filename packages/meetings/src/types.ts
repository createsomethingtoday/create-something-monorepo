/**
 * Meeting Transcription Types
 * "Understanding persists beyond the moment"
 */

export interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
  AI: Ai;
  PROCESSING_QUEUE: Queue<ProcessingMessage>;
  ANTHROPIC_API_KEY: string;
  ASSEMBLYAI_API_KEY: string;
  ENVIRONMENT: string;
}

export interface Meeting {
  id: string;
  recorded_at: string;
  duration_seconds: number | null;
  processed_at: string | null;
  title: string | null;
  transcript: string | null;
  summary: string | null;
  action_items: string | null; // JSON array
  topics: string | null; // JSON array
  participants: string | null; // JSON array
  project_id: string | null;
  property: 'agency' | 'io' | 'space' | 'ltd' | null;
  tags: string | null; // JSON array
  audio_key: string | null;
  audio_size_bytes: number | null;
  audio_format: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingMessage {
  meetingId: string;
  audioKey: string;
}

export interface UploadRequest {
  recordedAt?: string; // ISO timestamp, defaults to now
  title?: string;
  projectId?: string;
  property?: 'agency' | 'io' | 'space' | 'ltd';
  tags?: string[];
  participants?: string[];
}

export interface UploadResponse {
  success: boolean;
  meetingId?: string;
  message: string;
}

export interface MeetingResponse {
  success: boolean;
  meeting?: Meeting;
  message?: string;
}

export interface TranscriptionResult {
  text: string;
  vtt?: string;
  word_count?: number;
}

export interface SummaryResult {
  title: string;
  summary: string;
  actionItems: string[];
  topics: string[];
}
