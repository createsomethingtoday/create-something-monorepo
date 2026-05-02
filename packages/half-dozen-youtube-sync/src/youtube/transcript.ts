/**
 * YouTube Transcript Extraction
 * 
 * Uses YouTube's innertube transcript API first, then falls back to the
 * player caption tracks exposed by the watch page. Both paths run server-side.
 */

import type { Page } from 'puppeteer-core';
import type { TranscriptSegment, VideoData } from '../types.js';
import { extractVideoId } from './playlist.js';

// =============================================================================
// Constants
// =============================================================================

const ANDROID_CLIENT_VERSION = '19.29.37';
const ANDROID_VR_CLIENT_VERSION = '1.60.19';
const ANDROID_USER_AGENT = `com.google.android.youtube/${ANDROID_CLIENT_VERSION} (Linux; U; Android 11) gzip`;
const WEB_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface WatchPageContext {
  visitorData: string;
  apiKey?: string;
}

interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string; runs?: Array<{ text: string }> };
}

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

async function getWatchPageContext(videoId: string): Promise<WatchPageContext> {
  const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': WEB_USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!resp.ok) throw new Error(`Failed to fetch video page: ${resp.status}`);
  const html = await resp.text();

  return {
    visitorData: html.match(/"visitorData":"([^"]+)"/)?.[1] || '',
    apiKey: html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1],
  };
}

async function getVisitorData(videoId: string): Promise<string> {
  return (await getWatchPageContext(videoId)).visitorData;
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
    return null;
  }

  const json = await resp.json() as Record<string, unknown>;

  if ((json as { error?: unknown }).error) {
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
// Player Caption Tracks Fallback (ANDROID_VR client)
// =============================================================================

function captionTrackName(track: CaptionTrack): string {
  return track.name?.simpleText || track.name?.runs?.map(run => run.text).join('') || '';
}

function selectCaptionTrack(tracks: CaptionTrack[], lang: string): CaptionTrack | null {
  const normalizedLang = lang.toLowerCase();
  const isExact = (track: CaptionTrack) => track.languageCode?.toLowerCase() === normalizedLang;
  const isPrefix = (track: CaptionTrack) => track.languageCode?.toLowerCase().startsWith(`${normalizedLang}-`);
  const isManual = (track: CaptionTrack) => track.kind !== 'asr';

  return (
    tracks.find(track => isExact(track) && isManual(track)) ||
    tracks.find(track => isExact(track)) ||
    tracks.find(track => isPrefix(track) && isManual(track)) ||
    tracks.find(track => isPrefix(track)) ||
    tracks.find(track => track.languageCode?.toLowerCase().startsWith('en') && isManual(track)) ||
    tracks.find(track => track.languageCode?.toLowerCase().startsWith('en')) ||
    tracks.find(isManual) ||
    tracks[0] ||
    null
  );
}

export function parseJson3Transcript(json: unknown): TranscriptSegment[] {
  const events = (json as { events?: unknown[] })?.events;
  if (!Array.isArray(events)) return [];

  const segments: TranscriptSegment[] = [];

  for (const event of events) {
    const item = event as {
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8?: string }>;
    };

    if (typeof item.tStartMs !== 'number' || !Array.isArray(item.segs)) continue;

    const text = item.segs
      .map(seg => seg.utf8 || '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) continue;

    segments.push({
      text,
      start: item.tStartMs / 1000,
      duration: typeof item.dDurationMs === 'number' ? item.dDurationMs / 1000 : 0,
    });
  }

  return segments;
}

/**
 * Fetch transcript through player caption tracks.
 *
 * The ANDROID_VR player response currently returns caption track URLs that can
 * be fetched directly as json3. This is the reliable server-side fallback when
 * get_transcript returns failedPrecondition.
 */
export async function extractTranscriptFromCaptionTracks(
  videoId: string,
  lang: string = 'en'
): Promise<{ transcript: string; segments: TranscriptSegment[]; trackName?: string } | null> {
  const context = await getWatchPageContext(videoId);
  if (!context.apiKey) return null;

  const resp = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(context.apiKey)}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': ANDROID_USER_AGENT,
        'Origin': 'https://www.youtube.com',
      },
      body: JSON.stringify({
        context: {
          client: {
            hl: lang,
            gl: 'US',
            clientName: 'ANDROID_VR',
            clientVersion: ANDROID_VR_CLIENT_VERSION,
            androidSdkVersion: 32,
            visitorData: context.visitorData,
          },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    },
  );

  if (!resp.ok) return null;

  const json = await resp.json() as {
    captions?: {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: CaptionTrack[];
      };
    };
  };

  const tracks = json.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const track = selectCaptionTrack(tracks, lang);
  if (!track) return null;

  const captionsUrl = new URL(track.baseUrl);
  captionsUrl.searchParams.set('fmt', 'json3');

  const captionsResp = await fetch(captionsUrl, {
    headers: {
      'User-Agent': WEB_USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!captionsResp.ok) return null;

  const captionsJson = await captionsResp.json();
  const segments = parseJson3Transcript(captionsJson);
  if (segments.length === 0) return null;

  return {
    transcript: segments.map(s => s.text).join(' '),
    segments,
    trackName: captionTrackName(track),
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Extract transcript — get_transcript first, caption tracks second.
 */
export async function extractTranscript(
  videoIdOrUrl: string,
  _page?: Page
): Promise<{ transcript: string; segments: TranscriptSegment[]; method: 'api' | 'captions' | 'browser' } | null> {
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

  try {
    const result = await extractTranscriptFromCaptionTracks(videoId);
    if (result) return { ...result, method: 'captions' };
  } catch (err) {
    console.error(`Caption track transcript failed for ${videoId}:`, (err as Error).message);
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
