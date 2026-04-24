import type { TranscriptSegment } from './types.js';
import { TRANSCRIPT_CHUNK_SIZE } from './config.js';

export interface RawTranscriptSegment {
  text: string;
  startSeconds: number;
  endSeconds?: number;
  durationSeconds?: number;
}

function decodeTranscriptEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, value) => {
      const codePoint = Number.parseInt(String(value), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => {
      const codePoint = Number.parseInt(String(value), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    });
}

function parseVttTimestamp(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const seconds = Number.parseFloat(parts[parts.length - 1]);
  const minutes = Number.parseInt(parts[parts.length - 2], 10);
  const hours = parts.length === 3 ? Number.parseInt(parts[0], 10) : 0;

  if (
    Number.isNaN(seconds) ||
    Number.isNaN(minutes) ||
    (parts.length === 3 && Number.isNaN(hours))
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function extractXmlAttribute(attributes: string, name: string): string | undefined {
  const doubleQuoted = attributes.match(new RegExp(`${name}="([^"]+)"`, 'i'))?.[1];
  if (doubleQuoted) {
    return doubleQuoted;
  }

  return attributes.match(new RegExp(`${name}='([^']+)'`, 'i'))?.[1];
}

function xmlInnerText(value: string): string {
  return decodeTranscriptEntities(
    value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/s>\s*<s\b[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTranscriptText(text: string): string {
  return text
    .replace(/\[(music|applause|laughter|cheering)\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTranscriptSegments(
  rawSegments: RawTranscriptSegment[],
): TranscriptSegment[] {
  const cleaned = rawSegments
    .map((segment) => ({
      text: cleanTranscriptText(segment.text),
      startSeconds: segment.startSeconds,
      endSeconds:
        segment.endSeconds ??
        (segment.durationSeconds !== undefined
          ? segment.startSeconds + segment.durationSeconds
          : undefined),
    }))
    .filter(
      (segment) =>
        segment.text.length > 0 &&
        Number.isFinite(segment.startSeconds) &&
        segment.startSeconds >= 0,
    );

  return cleaned.map((segment, index) => ({
    text: segment.text,
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds ?? cleaned[index + 1]?.startSeconds,
  }));
}

export function extractTranscriptSegmentsFromVtt(vtt: string): RawTranscriptSegment[] {
  const normalized = vtt.replace(/\r\n/g, '\n');
  const cues = normalized.split(/\n{2,}/);
  const results: RawTranscriptSegment[] = [];

  for (const cue of cues) {
    const lines = cue
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0 || lines[0] === 'WEBVTT' || lines[0].startsWith('NOTE')) {
      continue;
    }

    const timingLine = lines.find((line) => line.includes('-->'));
    if (!timingLine) {
      continue;
    }

    const timingMatch = timingLine.match(
      /^\s*([0-9:.,]+)\s*-->\s*([0-9:.,]+)(?:\s+.*)?$/,
    );
    if (!timingMatch) {
      continue;
    }

    const startSeconds = parseVttTimestamp(timingMatch[1]);
    const endSeconds = parseVttTimestamp(timingMatch[2]);
    if (startSeconds === null || endSeconds === null) {
      continue;
    }

    const timingIndex = lines.indexOf(timingLine);
    const text = lines
      .slice(timingIndex + 1)
      .map((line) => decodeTranscriptEntities(line))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      continue;
    }

    results.push({
      text,
      startSeconds,
      endSeconds,
    });
  }

  return results;
}

export function extractTranscriptSegmentsFromXml(xml: string): RawTranscriptSegment[] {
  const results: RawTranscriptSegment[] = [];
  const nodePattern = /<(text|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

  for (const match of xml.matchAll(nodePattern)) {
    const attributes = match[2] ?? '';
    const startSecondsText = extractXmlAttribute(attributes, 'start');
    const startMillisecondsText = extractXmlAttribute(attributes, 't');
    const durationSecondsText = extractXmlAttribute(attributes, 'dur');
    const durationMillisecondsText = extractXmlAttribute(attributes, 'd');

    const startSeconds =
      startSecondsText !== undefined
        ? Number.parseFloat(startSecondsText)
        : startMillisecondsText !== undefined
          ? Number.parseFloat(startMillisecondsText) / 1000
          : Number.NaN;

    const durationSeconds =
      durationSecondsText !== undefined
        ? Number.parseFloat(durationSecondsText)
        : durationMillisecondsText !== undefined
          ? Number.parseFloat(durationMillisecondsText) / 1000
          : undefined;

    if (!Number.isFinite(startSeconds)) {
      continue;
    }

    const text = xmlInnerText(match[3] ?? '');
    if (!text) {
      continue;
    }

    results.push({
      text,
      startSeconds,
      durationSeconds,
    });
  }

  return results;
}

export function segmentsToPlainTranscript(segments: TranscriptSegment[]): string {
  return segments.map((segment) => segment.text).join(' ').trim();
}

export function formatTimestamp(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((part) => String(part).padStart(2, '0'))
      .join(':');
  }

  return [minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

export function segmentsToTimestampedTranscript(
  segments: TranscriptSegment[],
): string {
  return segments
    .map((segment) => `[${formatTimestamp(segment.startSeconds)}] ${segment.text}`)
    .join('\n');
}

export function buildSegmentSummary(segments: TranscriptSegment[]): {
  count: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
  durationSeconds?: number;
} {
  if (segments.length === 0) {
    return { count: 0 };
  }

  const first = segments[0];
  const last = segments[segments.length - 1];
  const lastEnd = last.endSeconds ?? last.startSeconds;

  return {
    count: segments.length,
    firstTimestamp: formatTimestamp(first.startSeconds),
    lastTimestamp: formatTimestamp(last.startSeconds),
    durationSeconds: Math.max(0, Math.round(lastEnd - first.startSeconds)),
  };
}

function findChunkBoundary(text: string, maxLength: number): number {
  const sentenceEndings = ['. ', '? ', '! ', '.\n', '?\n', '!\n'];

  for (const ending of sentenceEndings) {
    const index = text.lastIndexOf(ending, maxLength);
    if (index > maxLength * 0.5) {
      return index + ending.length;
    }
  }

  const newlineIndex = text.lastIndexOf('\n', maxLength);
  if (newlineIndex > maxLength * 0.4) {
    return newlineIndex + 1;
  }

  const spaceIndex = text.lastIndexOf(' ', maxLength);
  if (spaceIndex > maxLength * 0.3) {
    return spaceIndex + 1;
  }

  return maxLength;
}

export function chunkTranscript(
  transcript: string,
  maxLength = TRANSCRIPT_CHUNK_SIZE,
): string[] {
  const normalized = transcript.trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    const splitAt = findChunkBoundary(remaining, maxLength);
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks;
}

export function parseTimestampLabel(label: string): number | null {
  const parts = label
    .trim()
    .split(':')
    .map((part) => Number.parseInt(part, 10));

  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}
