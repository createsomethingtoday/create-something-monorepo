/**
 * YouTube Transcript Extraction
 * 
 * Extracts transcripts from YouTube videos using Steel.dev browser automation.
 * Browser-first approach — YouTube has blocked all server-side transcript APIs
 * from server IPs as of 2026.
 * 
 * Requires:
 * - Steel session with authenticated YouTube context (via Steel Profiles API or session context)
 * - Puppeteer page connected to the session
 * 
 * The browser method opens the transcript panel in YouTube's UI and extracts
 * the timestamped segments from the DOM.
 */

import type { Page } from 'puppeteer-core';
import type { TranscriptSegment, VideoData } from '../types.js';
import { extractVideoId, buildVideoUrl } from './playlist.js';

// =============================================================================
// Browser-Based Transcript Extraction
// =============================================================================

/**
 * Extract transcript using Steel.dev browser automation.
 * 
 * @param page - Puppeteer page connected to Steel session
 * @param videoUrl - YouTube video URL
 */
export async function extractTranscriptBrowser(
  page: Page,
  videoUrl: string
): Promise<{ transcript: string; segments: TranscriptSegment[] } | null> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error(`Invalid YouTube video URL: ${videoUrl}`);

  // Navigate to video page
  await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#movie_player', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => new Promise(r => setTimeout(r, 4000)));

  // Check for bot gate — reload if present (context applies on second load)
  const hasBotGate = await page.evaluate(() =>
    document.body.innerText?.includes('Sign in to confirm') ||
    document.body.innerText?.includes('not a bot')
  );
  if (hasBotGate) {
    await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('#movie_player', { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => new Promise(r => setTimeout(r, 4000)));
  }

  // Open transcript panel
  const transcriptOpened = await openTranscriptPanel(page);
  if (!transcriptOpened) return null;

  // Wait for segments to load — poll every 3s for up to 60s
  // YouTube lazy-loads transcript content; with Profile auth it can take 30-60s
  let segmentLoaded = false;
  for (let elapsed = 0; elapsed < 60000; elapsed += 3000) {
    const count = await page.evaluate(() =>
      document.querySelectorAll('ytd-transcript-segment-renderer, .segment-text').length
    );
    if (count > 0) {
      segmentLoaded = true;
      // Give extra time for all segments to finish rendering
      await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));
      break;
    }
    await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));
  }

  if (!segmentLoaded) return null;

  // Extract segments from DOM
  return extractSegmentsFromDOM(page);
}

// =============================================================================
// DOM Segment Extraction
// =============================================================================

async function extractSegmentsFromDOM(
  page: Page
): Promise<{ transcript: string; segments: TranscriptSegment[] } | null> {
  const result = await page.evaluate(() => {
    const segments: Array<{ text: string; start: number; duration: number }> = [];

    // Find segment elements
    const selectors = [
      'ytd-transcript-segment-renderer',
      '#segments-container ytd-transcript-segment-renderer',
      '[class*="transcript"] [class*="segment"]',
    ];

    let elements: Element[] = [];
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) { elements = Array.from(found); break; }
    }

    // Fallback: find timestamp elements in transcript panel
    if (elements.length === 0) {
      const panel = document.querySelector(
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
      );
      if (panel) {
        const allEls = Array.from(panel.querySelectorAll('*'));
        for (const el of allEls) {
          const text = el.textContent?.trim() || '';
          if (/^\d+:\d{2}$/.test(text) && el.children.length === 0 && el.parentElement) {
            elements.push(el.parentElement);
          }
        }
        elements = [...new Set(elements)];
      }
    }

    for (const el of elements) {
      // Timestamp
      let timeText = '0:00';
      const timeEl = el.querySelector('.segment-timestamp, [class*="timestamp"]');
      if (timeEl?.textContent?.match(/^\s*\d+:\d+/)) {
        timeText = timeEl.textContent.trim();
      } else {
        const match = el.textContent?.trim().match(/^(\d+:\d+(?::\d+)?)/);
        if (match) timeText = match[1];
      }

      const timeParts = timeText.split(':').map(p => parseInt(p, 10));
      const startSeconds = timeParts.length === 3
        ? timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]
        : timeParts[0] * 60 + (timeParts[1] || 0);

      // Text
      let text = '';
      const textEl = el.querySelector('.segment-text, [class*="cue"], yt-formatted-string:last-child');
      if (textEl?.textContent?.trim() && !textEl.textContent.match(/^\d+:\d+/)) {
        text = textEl.textContent.trim();
      } else {
        text = (el.textContent?.trim() || '').replace(/^\d+:\d+(?::\d+)?\s*/, '').trim();
      }

      if (text) segments.push({ text, start: startSeconds, duration: 0 });
    }

    // Calculate durations
    for (let i = 0; i < segments.length - 1; i++) {
      segments[i].duration = segments[i + 1].start - segments[i].start;
    }
    if (segments.length > 0) segments[segments.length - 1].duration = 5;

    return segments;
  });

  if (!result || result.length === 0) return null;
  return { transcript: result.map(s => s.text).join(' '), segments: result };
}

// =============================================================================
// Transcript Panel Opener
// =============================================================================

async function openTranscriptPanel(page: Page): Promise<boolean> {
  const wait = (ms: number) => page.evaluate(`new Promise(r => setTimeout(r, ${ms}))`);

  // Dismiss consent banners
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll('button')) {
      if (btn.textContent?.toLowerCase().includes('reject all') || btn.textContent?.toLowerCase().includes('accept all')) {
        btn.click(); break;
      }
    }
  });
  await wait(1000);

  // Scroll to description
  await page.evaluate(() => window.scrollBy(0, 400));
  await wait(1500);

  // Expand description
  await page.evaluate(() => {
    const expander = document.querySelector('#description-inline-expander #expand') ||
                     document.querySelector('tp-yt-paper-button#expand');
    if (expander) (expander as HTMLElement).click();
  });
  await wait(1500);

  // Method 1: Click "Show transcript" in description
  const clicked = await page.evaluate(() => {
    const section = document.querySelector('ytd-video-description-transcript-section-renderer');
    if (section) {
      const btn = section.querySelector('button');
      if (btn) { btn.click(); return true; }
    }
    for (const btn of document.querySelectorAll('button')) {
      const text = btn.textContent?.toLowerCase() || '';
      const label = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if (text.includes('show transcript') || label.includes('show transcript')) {
        btn.click(); return true;
      }
    }
    return false;
  });
  if (clicked) { await wait(2000); return true; }

  // Method 2: Three-dot menu → "Show transcript"
  const menuClicked = await page.evaluate(() => {
    const menuBtn = document.querySelector('button[aria-label="More actions"]') as HTMLElement;
    if (menuBtn) { menuBtn.click(); return true; }
    return false;
  });

  if (menuClicked) {
    await wait(1500);
    const transcriptClicked = await page.evaluate(() => {
      for (const item of document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item, [role="menuitem"]')) {
        if (item.textContent?.toLowerCase().includes('transcript')) {
          (item as HTMLElement).click(); return true;
        }
      }
      return false;
    });
    if (transcriptClicked) { await wait(2000); return true; }
    await page.keyboard.press('Escape');
  }

  return false;
}

// =============================================================================
// Combined Extraction
// =============================================================================

/**
 * Extract transcript — requires a Steel browser page.
 * Returns null if no page provided (server-side APIs are blocked).
 */
export async function extractTranscript(
  videoIdOrUrl: string,
  page?: Page
): Promise<{ transcript: string; segments: TranscriptSegment[]; method: 'browser' } | null> {
  if (!page) return null;

  const videoUrl = videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be')
    ? videoIdOrUrl
    : buildVideoUrl(videoIdOrUrl);

  const result = await extractTranscriptBrowser(page, videoUrl);
  return result ? { ...result, method: 'browser' } : null;
}

/**
 * Extract video metadata from YouTube page
 */
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
    const title = (document.querySelector('#title h1 yt-formatted-string') ||
                   document.querySelector('meta[property="og:title"]'));
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
