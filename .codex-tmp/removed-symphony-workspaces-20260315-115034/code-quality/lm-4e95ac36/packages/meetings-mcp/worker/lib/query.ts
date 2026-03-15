export const VALID_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export const VALID_PROPERTIES = ['agency', 'io', 'space', 'ltd'] as const;

export type MeetingStatus = typeof VALID_STATUSES[number];
export type MeetingProperty = typeof VALID_PROPERTIES[number];

export interface MeetingRow {
  id: string;
  recorded_at: string;
  duration_seconds: number | null;
  processed_at: string | null;
  title: string | null;
  transcript: string | null;
  summary: string | null;
  action_items: string | null;
  topics: string | null;
  participants: string | null;
  project_id: string | null;
  property: MeetingProperty | null;
  tags: string | null;
  audio_key: string | null;
  audio_size_bytes: number | null;
  audio_format: string | null;
  status: MeetingStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function clampInt(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const candidate = value ?? fallback;
  if (!Number.isFinite(candidate)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(candidate)));
}

export function normalizeFtsQuery(rawQuery: string): string {
  const tokens = tokenizeQueryTerms(rawQuery);

  if (!tokens || tokens.length === 0) {
    throw new Error('Query must contain at least one searchable term.');
  }

  return tokens.map((token) => `"${token}"`).join(' ');
}

export function tokenizeQueryTerms(rawQuery: string): string[] {
  return (
    rawQuery
      .trim()
      .match(/[\p{L}\p{N}_'-]+/gu)
      ?.map((token) => token.replaceAll('"', '').trim())
      .filter(Boolean)
      .slice(0, 16) ?? []
  );
}

export function normalizeStartDate(value: string | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid from date: ${value}`);
  }

  return parsed.toISOString();
}

export function normalizeEndDate(value: string | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T23:59:59.999Z`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid to date: ${value}`);
  }

  return parsed.toISOString();
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    // Keep response stable even when historical rows contain bad JSON.
  }

  return [];
}

export function makeSnippet(text: string, query: string, snippetChars: number): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';

  const queryTokens = query
    .toLowerCase()
    .match(/[\p{L}\p{N}_'-]+/gu)
    ?.filter(Boolean) ?? [];

  const lower = compact.toLowerCase();
  let index = -1;

  for (const token of queryTokens) {
    const found = lower.indexOf(token);
    if (found !== -1) {
      index = found;
      break;
    }
  }

  if (index === -1) {
    index = 0;
  }

  const half = Math.floor(snippetChars / 2);
  const start = Math.max(0, index - half);
  const end = Math.min(compact.length, start + snippetChars);
  const excerpt = compact.slice(start, end);

  const prefix = start > 0 ? '...' : '';
  const suffix = end < compact.length ? '...' : '';

  return `${prefix}${excerpt}${suffix}`;
}

export function shapeMeetingRow(
  row: MeetingRow,
  options?: {
    includeTranscript?: boolean;
    maxTranscriptChars?: number;
  },
): Record<string, unknown> {
  const includeTranscript = options?.includeTranscript ?? false;
  const maxChars = options?.maxTranscriptChars ?? 8000;

  const transcript = includeTranscript
    ? row.transcript?.slice(0, maxChars) ?? null
    : null;

  return {
    id: row.id,
    recorded_at: row.recorded_at,
    duration_seconds: row.duration_seconds,
    processed_at: row.processed_at,
    title: row.title,
    transcript,
    transcript_truncated:
      includeTranscript && !!row.transcript
        ? row.transcript.length > maxChars
        : false,
    summary: row.summary,
    action_items: parseJsonArray(row.action_items),
    topics: parseJsonArray(row.topics),
    participants: parseJsonArray(row.participants),
    project_id: row.project_id,
    property: row.property,
    tags: parseJsonArray(row.tags),
    audio_key: row.audio_key,
    audio_size_bytes: row.audio_size_bytes,
    audio_format: row.audio_format,
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
