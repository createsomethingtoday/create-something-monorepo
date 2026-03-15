/**
 * Tests for YouTube URL parsing and playlist utilities
 */

import { describe, it, expect } from 'vitest';
import {
  extractPlaylistId,
  extractVideoId,
  isPlaylistUrl,
  isVideoUrl,
  buildVideoUrl,
  buildPlaylistUrl
} from '../youtube/playlist.js';

describe('extractPlaylistId', () => {
  it('extracts playlist ID from standard URL', () => {
    expect(extractPlaylistId('https://youtube.com/playlist?list=PL02AA8F4D1484BBC8'))
      .toBe('PL02AA8F4D1484BBC8');
  });

  it('extracts playlist ID from URL with extra params', () => {
    expect(extractPlaylistId('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&feature=shared'))
      .toBe('PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
  });

  it('returns null for non-playlist URLs', () => {
    expect(extractPlaylistId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractPlaylistId('')).toBeNull();
  });

  it('handles mixed-case playlist IDs', () => {
    expect(extractPlaylistId('https://youtube.com/playlist?list=PL_abc-123_XYZ'))
      .toBe('PL_abc-123_XYZ');
  });
});

describe('extractVideoId', () => {
  it('extracts from standard watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts from short URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts from embed URL', () => {
    expect(extractVideoId('https://youtube.com/embed/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts from /v/ URL', () => {
    expect(extractVideoId('https://youtube.com/v/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
  });

  it('extracts from URL with additional parameters', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123'))
      .toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-video URLs', () => {
    expect(extractVideoId('https://youtube.com/channel/UC123')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractVideoId('')).toBeNull();
  });

  it('handles IDs with hyphens and underscores', () => {
    expect(extractVideoId('https://youtube.com/watch?v=abc-_123XYZ'))
      .toBe('abc-_123XYZ');
  });
});

describe('isPlaylistUrl', () => {
  it('returns true for valid playlist URL', () => {
    expect(isPlaylistUrl('https://youtube.com/playlist?list=PL123')).toBe(true);
  });

  it('returns false for video URL', () => {
    expect(isPlaylistUrl('https://youtube.com/watch?v=abc123')).toBe(false);
  });

  it('returns false for non-YouTube URL', () => {
    expect(isPlaylistUrl('https://example.com')).toBe(false);
  });
});

describe('isVideoUrl', () => {
  it('returns true for standard watch URL', () => {
    expect(isVideoUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('returns true for short URL', () => {
    expect(isVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('returns false for playlist URL', () => {
    expect(isVideoUrl('https://youtube.com/playlist?list=PL123')).toBe(false);
  });

  it('returns false for non-YouTube URL', () => {
    expect(isVideoUrl('https://example.com')).toBe(false);
  });
});

describe('buildVideoUrl', () => {
  it('builds correct URL from video ID', () => {
    expect(buildVideoUrl('dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});

describe('buildPlaylistUrl', () => {
  it('builds correct URL from playlist ID', () => {
    expect(buildPlaylistUrl('PL02AA8F4D1484BBC8'))
      .toBe('https://www.youtube.com/playlist?list=PL02AA8F4D1484BBC8');
  });
});
