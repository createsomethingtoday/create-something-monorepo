import { describe, expect, it } from 'vitest';

import {
  buildSegmentSummary,
  chunkTranscript,
  cleanTranscriptText,
  extractTranscriptSegmentsFromVtt,
  extractTranscriptSegmentsFromXml,
  formatTimestamp,
  normalizeTranscriptSegments,
  parseTimestampLabel,
  segmentsToPlainTranscript,
  segmentsToTimestampedTranscript,
} from './transcript.js';

describe('transcript utilities', () => {
  it('cleans common bracketed non-speech markers', () => {
    expect(cleanTranscriptText('[Music] Hello   [applause] world')).toBe('Hello world');
  });

  it('normalizes segments, removes empty rows, and infers end times', () => {
    const normalized = normalizeTranscriptSegments([
      { text: '[Music] Hello', startSeconds: 0, durationSeconds: 2 },
      { text: 'world', startSeconds: 2, endSeconds: 5 },
      { text: '[Applause]', startSeconds: 5 },
      { text: 'again', startSeconds: 6 },
    ]);

    expect(normalized).toEqual([
      { text: 'Hello', startSeconds: 0, endSeconds: 2 },
      { text: 'world', startSeconds: 2, endSeconds: 5 },
      { text: 'again', startSeconds: 6, endSeconds: undefined },
    ]);
    expect(segmentsToPlainTranscript(normalized)).toBe('Hello world again');
  });

  it('formats timestamps in minute and hour forms', () => {
    expect(formatTimestamp(61)).toBe('01:01');
    expect(formatTimestamp(3_723)).toBe('01:02:03');
  });

  it('renders a timestamped transcript and summary', () => {
    const segments = [
      { text: 'Intro', startSeconds: 0, endSeconds: 30 },
      { text: 'Deep dive', startSeconds: 30, endSeconds: 90 },
    ];

    expect(segmentsToTimestampedTranscript(segments)).toBe(
      '[00:00] Intro\n[00:30] Deep dive',
    );
    expect(buildSegmentSummary(segments)).toEqual({
      count: 2,
      firstTimestamp: '00:00',
      lastTimestamp: '00:30',
      durationSeconds: 90,
    });
  });

  it('chunks long transcript text without losing content', () => {
    const transcript =
      'First sentence explains the direct provider. ' +
      'Second sentence explains the browser fallback. ' +
      'Third sentence explains Notion sync. ' +
      'Fourth sentence explains OpenAI-compatible search and fetch wrappers.';

    const chunks = chunkTranscript(transcript, 70);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 70)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim()).toBe(
      transcript.replace(/\s+/g, ' ').trim(),
    );
  });

  it('parses timestamp labels in minute and hour forms', () => {
    expect(parseTimestampLabel('02:05')).toBe(125);
    expect(parseTimestampLabel('01:02:03')).toBe(3_723);
    expect(parseTimestampLabel('bad')).toBeNull();
  });

  it('parses WebVTT transcript payloads into raw segments', () => {
    const segments = extractTranscriptSegmentsFromVtt(`WEBVTT

00:00.000 --> 00:01.500
Hello &amp; welcome

1
00:01.500 --> 00:03.000 align:start position:0%
Back again
`);

    expect(segments).toEqual([
      { text: 'Hello & welcome', startSeconds: 0, endSeconds: 1.5 },
      { text: 'Back again', startSeconds: 1.5, endSeconds: 3 },
    ]);
  });

  it('parses XML timedtext payloads into raw segments', () => {
    const segments = extractTranscriptSegmentsFromXml(`<transcript>
  <text start="0.0" dur="1.25">Hello &amp; welcome</text>
  <p t="1250" d="1750"><s>Back</s><s>again</s></p>
</transcript>`);

    expect(segments).toEqual([
      { text: 'Hello & welcome', startSeconds: 0, durationSeconds: 1.25 },
      { text: 'Back again', startSeconds: 1.25, durationSeconds: 1.75 },
    ]);
  });
});
