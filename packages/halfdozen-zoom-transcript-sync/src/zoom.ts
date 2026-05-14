import type { Env, ParsedTranscript, TranscriptCandidate, TranscriptSegment, ZoomDiscoveryResult } from './types';

const ZOOM_OAUTH_URL = 'https://zoom.us/oauth/token';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';
const DEFAULT_LOOKBACK_DAYS = 3;
const DEFAULT_PAGE_SIZE = 100;

interface ZoomRecordingListResponse {
  meetings?: ZoomMeeting[];
  next_page_token?: string;
}

interface ZoomMeeting {
  id?: string | number;
  uuid?: string;
  topic?: string;
  start_time?: string;
  host_id?: string;
  recording_files?: ZoomRecordingFile[];
}

interface ZoomRecordingFile {
  id?: string;
  recording_id?: string;
  download_url?: string;
  file_type?: string;
  file_extension?: string;
  recording_type?: string;
  file_name?: string;
}

export async function listTranscriptCandidates(env: Env): Promise<ZoomDiscoveryResult> {
  const pageSize = parsePositiveInt(env.ZOOM_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  const lookbackDays = parsePositiveInt(env.ZOOM_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS);
  const to = formatDate(new Date());
  const from = formatDate(new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000));

  const candidates = new Map<string, TranscriptCandidate>();
  let meetingsScanned = 0;
  let transcriptFilesScanned = 0;
  let nextPageToken = '';

  do {
    const payload = await zoomApiFetch<ZoomRecordingListResponse>(
      env,
      buildRecordingsPath(env, {
        from,
        to,
        pageSize,
        nextPageToken,
      }),
    );

    const meetings = Array.isArray(payload.meetings) ? payload.meetings : [];
    meetingsScanned += meetings.length;

    for (const meeting of meetings) {
      const transcriptFiles = dedupeRecordingFiles(meeting.recording_files ?? []).filter(isTranscriptFile);
      transcriptFilesScanned += transcriptFiles.length;

      for (const file of transcriptFiles) {
        const downloadUrl = file.download_url?.trim();
        if (!downloadUrl) continue;

        const candidate = await buildTranscriptCandidate(meeting, file, downloadUrl);
        candidates.set(candidate.dedupKey, candidate);
      }
    }

    nextPageToken = payload.next_page_token?.trim() || '';
  } while (nextPageToken);

  return {
    candidates: Array.from(candidates.values()),
    meetingsScanned,
    transcriptFilesScanned,
    from,
    to,
  };
}

export async function downloadTranscript(env: Env, candidate: TranscriptCandidate): Promise<string> {
  const token = await getZoomAccessToken(env);
  const response = await fetch(candidate.transcriptDownloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Zoom transcript download failed (${response.status}) for ${candidate.transcriptDownloadUrl}`);
  }

  return response.text();
}

export function parseTranscript(rawText: string, extension: string | null): ParsedTranscript {
  const normalizedExtension = (extension ?? '').toLowerCase();
  const isVtt = normalizedExtension === 'vtt' || rawText.trimStart().startsWith('WEBVTT');

  if (isVtt) {
    return parseVtt(rawText);
  }

  const cleaned = rawText.replace(/\r/g, '').trim();
  return {
    rawText,
    plainText: cleaned,
    segments: chunkPlainTranscript(cleaned),
    speakers: extractSpeakers(cleaned.split('\n')),
  };
}

export function buildCanonicalMeetingSourceUrl(
  meetingId: string | null,
  originalUrl: string | null,
  occurrenceId?: string | null,
): string | null {
  if (!meetingId) return null;

  const host = deriveZoomHost(originalUrl) ?? 'us06web.zoom.us';
  const baseUrl = `https://${host}/recording/management/detail?meeting_id=${encodeURIComponent(meetingId)}`;
  const occurrence = occurrenceId?.trim();
  if (!occurrence) return baseUrl;

  return `${baseUrl}#occurrence=${encodeURIComponent(occurrence)}`;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildRecordingsPath(
  env: Env,
  input: {
    from: string;
    to: string;
    pageSize: number;
    nextPageToken: string;
  },
): string {
  const params = new URLSearchParams({
    from: input.from,
    to: input.to,
    page_size: String(input.pageSize),
  });

  if (input.nextPageToken) {
    params.set('next_page_token', input.nextPageToken);
  }

  const configuredUserId = env.ZOOM_USER_ID?.trim();
  if (env.ZOOM_ACCOUNT_ID?.trim() && (!configuredUserId || configuredUserId.toLowerCase() === 'all')) {
    return `/accounts/me/recordings?${params.toString()}`;
  }

  return `/users/${encodeURIComponent(configuredUserId || 'me')}/recordings?${params.toString()}`;
}

async function buildTranscriptCandidate(
  meeting: ZoomMeeting,
  file: ZoomRecordingFile,
  downloadUrl: string,
): Promise<TranscriptCandidate> {
  const meetingId = stringify(meeting.id);
  const meetingUuid = meeting.uuid?.trim() || null;
  const startTime = meeting.start_time?.trim() || null;
  const meetingTitle = cleanMeetingTitle(meeting.topic?.trim() || 'Zoom Meeting Transcript');
  const meetingDate = extractMeetingDate(startTime);
  const transcriptFileId = file.id?.trim() || file.recording_id?.trim() || null;
  const sourceUrl = buildCanonicalMeetingSourceUrl(meetingId, downloadUrl, meetingUuid ?? startTime);
  const canonicalMeetingKey = buildCanonicalMeetingKey({
    meetingId,
    meetingUuid,
    meetingTitle,
    meetingDate,
    startTime,
  });
  const fileKey = transcriptFileId || `${file.file_type ?? 'file'}:${file.file_extension ?? 'txt'}`;

  return {
    dedupKey: `${canonicalMeetingKey}::${fileKey}`,
    canonicalMeetingKey,
    meetingId,
    meetingUuid,
    meetingTitle,
    meetingDate,
    startTime,
    sourceUrl,
    originalSourceUrl: downloadUrl,
    transcriptDownloadUrl: downloadUrl,
    transcriptFileId,
    transcriptFileType: file.file_type?.trim() || null,
    transcriptFileExtension: file.file_extension?.trim().toLowerCase() || null,
    hostId: meeting.host_id?.trim() || null,
  };
}

function buildCanonicalMeetingKey(input: {
  meetingId: string | null;
  meetingUuid: string | null;
  meetingTitle: string;
  meetingDate: string;
  startTime: string | null;
}): string {
  if (input.meetingUuid) {
    return `zoom-meeting-uuid:${encodeKeyComponent(input.meetingUuid)}`;
  }

  if (input.meetingId) {
    const occurrenceKey = input.startTime ? encodeKeyComponent(input.startTime) : input.meetingDate;
    return `zoom-meeting:${input.meetingId}:${occurrenceKey}`;
  }

  return `zoom-topic:${sanitizeKey(input.meetingTitle)}:${input.meetingDate}`;
}

export const zoomTestExports = {
  buildCanonicalMeetingKey,
  buildCanonicalMeetingSourceUrl,
};

function cleanMeetingTitle(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 2000) || 'Zoom Meeting Transcript';
}

function extractMeetingDate(startTime: string | null): string {
  if (!startTime) {
    return formatDate(new Date());
  }

  const parsed = new Date(startTime);
  if (Number.isNaN(parsed.getTime())) {
    return formatDate(new Date());
  }

  return parsed.toISOString().slice(0, 10);
}

function dedupeRecordingFiles(files: ZoomRecordingFile[]): ZoomRecordingFile[] {
  const unique = new Map<string, ZoomRecordingFile>();
  for (const file of files) {
    const key = file.id || file.recording_id || file.download_url || JSON.stringify(file);
    unique.set(key, file);
  }
  return Array.from(unique.values());
}

function isTranscriptFile(file: ZoomRecordingFile): boolean {
  const fileType = (file.file_type ?? '').toUpperCase();
  const extension = (file.file_extension ?? '').toLowerCase();
  const recordingType = (file.recording_type ?? '').toLowerCase();
  const fileName = (file.file_name ?? '').toLowerCase();

  return (
    fileType === 'TRANSCRIPT' ||
    fileType === 'CC' ||
    extension === 'vtt' ||
    recordingType.includes('transcript') ||
    fileName.includes('transcript') ||
    fileName.endsWith('.vtt')
  );
}

function deriveZoomHost(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.hostname.endsWith('.zoom.us')) {
      return url.hostname;
    }
  } catch {
    return null;
  }
  return null;
}

function parseVtt(rawText: string): ParsedTranscript {
  const lines = rawText.replace(/\r/g, '').split('\n');
  const segments: TranscriptSegment[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    let line = lines[cursor]?.trim() ?? '';

    if (!line || line === 'WEBVTT' || line.startsWith('NOTE') || line.startsWith('STYLE') || line.startsWith('REGION')) {
      cursor += 1;
      continue;
    }

    if (/^\d+$/.test(line) && (lines[cursor + 1] ?? '').includes('-->')) {
      cursor += 1;
      line = lines[cursor]?.trim() ?? '';
    }

    if (!line.includes('-->')) {
      cursor += 1;
      continue;
    }

    const timestamp = formatCueTimestamp(line.split('-->')[0]?.trim() ?? '');
    cursor += 1;

    const textLines: string[] = [];
    while (cursor < lines.length && lines[cursor]?.trim()) {
      textLines.push(lines[cursor] ?? '');
      cursor += 1;
    }

    const text = normalizeCueText(textLines.join(' '));
    if (text) {
      segments.push({ timestamp, text });
    }
  }

  const speakers = extractSpeakers(segments.map((segment) => segment.text));
  return {
    rawText,
    plainText: segments.map((segment) => `${segment.timestamp}\n${segment.text}`).join('\n'),
    segments,
    speakers,
  };
}

function chunkPlainTranscript(text: string): TranscriptSegment[] {
  if (!text) return [];

  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => ({
      timestamp: `PART ${index + 1}`,
      text: part,
    }));
}

function normalizeCueText(text: string): string {
  return text
    .replace(/<v\s+([^>]+)>/gi, '$1: ')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSpeakers(lines: string[]): string[] {
  const speakers = new Set<string>();

  for (const line of lines) {
    const match = line.match(/^([^:]{1,80}):\s+/);
    if (match?.[1]) {
      speakers.add(match[1].trim());
    }
  }

  return Array.from(speakers);
}

function formatCueTimestamp(raw: string): string {
  const cleaned = raw.replace(',', '.').trim();
  const parts = cleaned.split(':');

  if (parts.length === 3) {
    const hours = Number.parseInt(parts[0] ?? '0', 10);
    const minutes = parts[1] ?? '00';
    const seconds = (parts[2] ?? '00').split('.')[0] ?? '00';
    return hours > 0 ? `${String(hours).padStart(2, '0')}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
  }

  if (parts.length === 2) {
    const minutes = parts[0] ?? '00';
    const seconds = (parts[1] ?? '00').split('.')[0] ?? '00';
    return `${minutes}:${seconds}`;
  }

  return cleaned.split('.')[0] || '00:00';
}

async function zoomApiFetch<T>(env: Env, path: string): Promise<T> {
  const token = await getZoomAccessToken(env);
  const response = await fetch(`${ZOOM_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoom API error (${response.status}) on ${path}: ${body}`);
  }

  return response.json<T>();
}

async function getZoomAccessToken(env: Env): Promise<string> {
  if (env.ZOOM_ACCESS_TOKEN?.trim()) {
    return env.ZOOM_ACCESS_TOKEN.trim();
  }

  const clientId = env.ZOOM_CLIENT_ID?.trim();
  const clientSecret = env.ZOOM_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('Zoom credentials are missing. Set ZOOM_ACCESS_TOKEN or client credentials.');
  }

  const params = new URLSearchParams();
  if (env.ZOOM_ACCOUNT_ID?.trim()) {
    params.set('grant_type', 'account_credentials');
    params.set('account_id', env.ZOOM_ACCOUNT_ID.trim());
  } else if (env.ZOOM_REFRESH_TOKEN?.trim()) {
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', env.ZOOM_REFRESH_TOKEN.trim());
    if (env.ZOOM_REDIRECT_URI?.trim()) {
      params.set('redirect_uri', env.ZOOM_REDIRECT_URI.trim());
    }
  } else {
    throw new Error('Zoom runtime needs ZOOM_ACCOUNT_ID for server-to-server OAuth or ZOOM_REFRESH_TOKEN for refresh flow.');
  }

  const response = await fetch(`${ZOOM_OAUTH_URL}?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoom OAuth failed (${response.status}): ${body}`);
  }

  const payload = await response.json<{ access_token?: string }>();
  const accessToken = payload.access_token?.trim();
  if (!accessToken) {
    throw new Error('Zoom OAuth response did not include an access_token.');
  }

  return accessToken;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function stringify(value: string | number | undefined): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function sanitizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function encodeKeyComponent(value: string): string {
  return encodeURIComponent(value.trim());
}
