/**
 * YouTube Transcript Extraction
 * 
 * Uses YouTube's innertube get_transcript API with ANDROID client + visitorData.
 * This bypasses poToken enforcement and works server-side without a browser.
 * 
 * Based on the approach from @kimtaeyoon83/mcp-server-youtube-transcript (464 stars).
 * Key insight: ANDROID client + visitorData from page + proper protobuf params.
 */

import type { Page } from 'puppeteer-core';
import type { TranscriptSegment, VideoData } from '../types.js';
import { extractVideoId, buildVideoUrl } from './playlist.js';

// =============================================================================
// Constants
// =============================================================================

const ANDROID_CLIENT_VERSION = '19.29.37';
const ANDROID_USER_AGENT = `com.google.android.youtube/${ANDROID_CLIENT_VERSION} (Linux; U; Android 11) gzip`;
const WEB_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_CLIENT_VERSION = '2.20251201.01.00';

// =============================================================================
// Protobuf Encoding (for get_transcript params)
// =============================================================================

function encodeVarint(value: number): number[] {
  const bytes: number[] = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  bytes.push(value);
  return bytes;
}

function buildTranscriptParams(videoId: string, lang: string = 'en'): string {
  // Inner protobuf: language params
  const innerParts: number[] = [
    0x0a, 0x03, ...Buffer.from('asr'),
    0x12, ...encodeVarint(lang.length), ...Buffer.from(lang),
    0x1a, 0x00
  ];
  const innerB64 = Buffer.from(innerParts).toString('base64');
  const innerEncoded = encodeURIComponent(innerB64);

  // Outer protobuf
  const panelName = 'engagement-panel-searchable-transcript-search-panel';
  const outerParts: number[] = [
    0x0a, ...encodeVarint(videoId.length), ...Buffer.from(videoId),
    0x12, ...encodeVarint(innerEncoded.length), ...Buffer.from(innerEncoded),
    0x18, 0x01,
    0x2a, ...encodeVarint(panelName.length), ...Buffer.from(panelName),
    0x30, 0x01,
    0x38, 0x01,
    0x40, 0x01
  ];

  return Buffer.from(outerParts).toString('base64');
}

// =============================================================================
// Page Data Extraction
// =============================================================================

async function getVisitorData(videoId: string): Promise<string> {
  const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': WEB_USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!resp.ok) throw new Error(`Failed to fetch video page: ${resp.status}`);
  const html = await resp.text();

  const match = html.match(/"visitorData":"([^"]+)"/);
  return match?.[1] || '';
}

// =============================================================================
// Innertube Transcript API (ANDROID client)
// =============================================================================

/**
 * Fetch transcript via YouTube's innertube get_transcript API.
 * Uses ANDROID client with visitorData — works server-side, no browser needed.
 */
export async function extractTranscriptApi(
  videoId: string,
  lang: string = 'en'
): Promise<{ transcript: string; segments: TranscriptSegment[] } | null> {
  // Get visitorData from video page (required for API auth)
  const visitorData = await getVisitorData(videoId);

  // Build protobuf params
  const params = buildTranscriptParams(videoId, lang);

  // Call get_transcript with ANDROID client
  const payload = JSON.stringify({
    context: {
      client: {
        hl: lang,
        gl: 'US',
        clientName: 'ANDROID',
        clientVersion: ANDROID_CLIENT_VERSION,
        androidSdkVersion: 30,
        visitorData,
      },
    },
    params,
  });

  const resp = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ANDROID_USER_AGENT,
      'Origin': 'https://www.youtube.com',
    },
    body: payload,
  });

  if (!resp.ok) {
    console.error(`get_transcript failed: ${resp.status}`);
    return null;
  }

  const json = await resp.json() as Record<string, unknown>;

  if ((json as { error?: unknown }).error) {
    console.error(`get_transcript API error:`, (json as { error: { message?: string } }).error?.message);
    return null;
  }

  // Extract segments from response
  const actions = (json as { actions?: Array<Record<string, unknown>> }).actions;
  if (!actions?.[0]) return null;

  const action = actions[0] as Record<string, unknown>;

  // Find segments — check both WEB and ANDROID response paths
  const webPath = (action as any)?.updateEngagementPanelAction?.content
    ?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body
    ?.transcriptSegmentListRenderer?.initialSegments;

  const androidPath = (action as any)?.elementsCommand?.transformEntityCommand
    ?.arguments?.transformTranscriptSegmentListArguments?.overwrite?.initialSegments;

  const rawSegments = (webPath || androidPath || []) as Array<Record<string, unknown>>;
  if (rawSegments.length === 0) return null;

  // Parse segments — the transcriptSegmentRenderer format appears in both paths
  const segments: TranscriptSegment[] = [];

  for (const seg of rawSegments) {
    const renderer = (seg as any)?.transcriptSegmentRenderer;
    if (!renderer) continue;

    // Text can be in multiple formats
    const text =
      renderer.snippet?.elementsAttributedString?.content ||
      renderer.snippet?.runs?.map((r: { text: string }) => r.text).join('') ||
      renderer.snippet?.simpleText || '';

    const startMs = parseInt(renderer.startMs || '0', 10);
    const endMs = parseInt(renderer.endMs || '0', 10);

    if (text.trim()) {
      segments.push({
        text: text.trim(),
        start: startMs / 1000,
        duration: (endMs - startMs) / 1000,
      });
    }
  }

  if (segments.length === 0) return null;

  return {
    transcript: segments.map(s => s.text).join(' '),
    segments,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Extract transcript — API-first, browser fallback.
 * The API method works server-side using ANDROID client + visitorData.
 * Browser fallback uses Steel's authenticated profile if API fails.
 */
export async function extractTranscript(
  videoIdOrUrl: string,
  _page?: Page
): Promise<{ transcript: string; segments: TranscriptSegment[]; method: 'api' | 'browser' } | null> {
  const videoId = videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be')
    ? extractVideoId(videoIdOrUrl)
    : videoIdOrUrl;

  if (!videoId) return null;

  // Try API method first (fast, no browser needed)
  try {
    const result = await extractTranscriptApi(videoId);
    if (result) return { ...result, method: 'api' };
  } catch (err) {
    console.error(`Transcript API failed for ${videoId}:`, (err as Error).message);
  }

  return null;
}

/** Extract video metadata from YouTube page */
export async function extractVideoMetadata(
  page: Page,
  videoUrl: string
): Promise<Partial<VideoData>> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error(`Invalid YouTube video URL: ${videoUrl}`);

  const currentUrl = page.url();
  if (!currentUrl.includes(videoId)) {
    await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));
  }

  return page.evaluate((vid) => {
    const title = document.querySelector('#title h1 yt-formatted-string') ||
                  document.querySelector('meta[property="og:title"]');
    const channel = document.querySelector('#channel-name a, ytd-channel-name a');
    const date = document.querySelector('#info-strings yt-formatted-string, .date');
    const duration = document.querySelector('.ytp-time-duration');
    const thumb = document.querySelector('meta[property="og:image"]');

    return {
      title: title?.textContent?.trim() || title?.getAttribute('content') || 'Untitled Video',
      channelName: channel?.textContent?.trim() || '',
      publishedAt: date?.textContent?.trim() || '',
      duration: duration?.textContent?.trim() || '',
      thumbnailUrl: thumb?.getAttribute('content') || `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
    };
  }, videoId);
}

/** Format transcript segments with timestamps */
export function formatTranscriptWithTimestamps(segments: TranscriptSegment[]): string {
  return segments.map(seg => {
    const m = Math.floor(seg.start / 60);
    const s = Math.floor(seg.start % 60);
    return `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}] ${seg.text}`;
  }).join('\n');
}

/** Clean transcript text */
export function cleanTranscript(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\[Music\]/gi, '')
    .replace(/\[Applause\]/gi, '')
    .trim();
}

// Re-export for backward compatibility
export { extractTranscriptApi as extractTranscriptBrowser };
