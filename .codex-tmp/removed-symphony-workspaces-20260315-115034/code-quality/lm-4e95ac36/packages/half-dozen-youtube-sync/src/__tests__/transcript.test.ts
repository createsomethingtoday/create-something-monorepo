/**
 * Tests for transcript extraction utilities
 */

import { describe, it, expect } from 'vitest';
import { formatTranscriptWithTimestamps, cleanTranscript } from '../youtube/transcript.js';
import type { TranscriptSegment } from '../types.js';

describe('formatTranscriptWithTimestamps', () => {
  it('formats segments with timestamps', () => {
    const segments: TranscriptSegment[] = [
      { text: 'Hello everyone', start: 0, duration: 3 },
      { text: 'Welcome to the channel', start: 3, duration: 4 },
      { text: 'Today we discuss', start: 7, duration: 3 },
    ];

    const formatted = formatTranscriptWithTimestamps(segments);
    expect(formatted).toBe(
      '[00:00] Hello everyone\n[00:03] Welcome to the channel\n[00:07] Today we discuss'
    );
  });

  it('handles timestamps over an hour', () => {
    const segments: TranscriptSegment[] = [
      { text: 'Late in the video', start: 3661, duration: 5 },
    ];

    const formatted = formatTranscriptWithTimestamps(segments);
    expect(formatted).toBe('[61:01] Late in the video');
  });

  it('handles empty segments array', () => {
    expect(formatTranscriptWithTimestamps([])).toBe('');
  });

  it('pads single-digit seconds', () => {
    const segments: TranscriptSegment[] = [
      { text: 'First', start: 5, duration: 3 },
      { text: 'Second', start: 65, duration: 3 },
    ];

    const formatted = formatTranscriptWithTimestamps(segments);
    expect(formatted).toBe('[00:05] First\n[01:05] Second');
  });
});

describe('cleanTranscript', () => {
  it('normalizes whitespace', () => {
    expect(cleanTranscript('hello   world  foo')).toBe('hello world foo');
  });

  it('removes [Music] markers', () => {
    // cleanTranscript removes markers then normalizes whitespace
    const result = cleanTranscript('intro [Music] main content');
    expect(result).not.toContain('[Music]');
    expect(result).toContain('intro');
    expect(result).toContain('main content');
  });

  it('removes [Applause] markers', () => {
    const result = cleanTranscript('joke [Applause] next joke');
    expect(result).not.toContain('[Applause]');
    expect(result).toContain('joke');
    expect(result).toContain('next joke');
  });

  it('removes markers case-insensitively', () => {
    expect(cleanTranscript('[MUSIC] hello [music]')).toBe('hello');
  });

  it('trims leading/trailing whitespace', () => {
    expect(cleanTranscript('  hello world  ')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(cleanTranscript('')).toBe('');
  });

  it('handles string with only markers', () => {
    expect(cleanTranscript('[Music] [Applause]')).toBe('');
  });

  it('normalizes newlines to spaces', () => {
    expect(cleanTranscript('line one\nline two\n\nline three')).toBe('line one line two line three');
  });
});
