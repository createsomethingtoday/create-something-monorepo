/**
 * YouTube Transcript Extraction
 * 
 * Extracts transcripts from YouTube videos using two methods:
 * 1. youtube-transcript npm package (fast, no browser needed) — primary
 * 2. Steel.dev browser automation (fallback for restricted videos)
 */

import { YoutubeTranscript } from 'youtube-transcript';
import type { Page } from 'puppeteer-core';
import type { TranscriptSegment, VideoData } from '../types.js';
import { extractVideoId, buildVideoUrl } from './playlist.js';
import { withYouTubeRetry } from '../utils/retry.js';

// =============================================================================
// Primary Method: youtube-transcript package
// =============================================================================

/**
 * Extract transcript using youtube-transcript npm package.
 * This is the fastest method and doesn't require browser automation.
 * 
 * @param videoIdOrUrl - YouTube video ID or full URL
 * @returns Transcript text and segments, or null if unavailable
 */
export async function extractTranscriptApi(
  videoIdOrUrl: string
): Promise<{ transcript: string; segments: TranscriptSegment[] } | null> {
  const videoId = videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be')
    ? extractVideoId(videoIdOrUrl)
    : videoIdOrUrl;

  if (!videoId) {
    throw new Error(`Invalid video ID or URL: ${videoIdOrUrl}`);
  }

  try {
    const transcriptData = await withYouTubeRetry(() =>
      YoutubeTranscript.fetchTranscript(videoId)
    );
    
    if (!transcriptData || transcriptData.length === 0) {
      return null;
    }

    // Convert to our segment format
    const segments: TranscriptSegment[] = transcriptData.map(item => ({
      text: item.text,
      start: item.offset / 1000, // Convert ms to seconds
      duration: item.duration / 1000
    }));

    // Build full transcript text
    const transcript = segments.map(s => s.text).join(' ');

    return { transcript, segments };
  } catch (error) {
    // Transcript not available (disabled, private, etc.)
    const message = error instanceof Error ? error.message : String(error);
    
    // Common reasons for failure:
    // - Transcript disabled by video owner
    // - Video is private or age-restricted
    // - Video doesn't exist
    console.warn(`Transcript API failed for ${videoId}: ${message}`);
    return null;
  }
}

// =============================================================================
// Fallback Method: Steel.dev Browser Automation
// =============================================================================

/**
 * Extract transcript using Steel.dev browser automation.
 * Use this as a fallback when the API method fails.
 * 
 * @param page - Puppeteer page connected to Steel session
 * @param videoUrl - YouTube video URL
 */
export async function extractTranscriptBrowser(
  page: Page,
  videoUrl: string
): Promise<{ transcript: string; segments: TranscriptSegment[] } | null> {
  const videoId = extractVideoId(videoUrl);
  
  if (!videoId) {
    throw new Error(`Invalid YouTube video URL: ${videoUrl}`);
  }

  // Navigate to video page
  await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Wait for video player to load
  await page.waitForSelector('#movie_player', { timeout: 15000 }).catch(() => {});

  // Wait a bit for dynamic content
  await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

  // Try to open transcript panel
  const transcriptOpened = await openTranscriptPanel(page);
  
  if (!transcriptOpened) {
    return null;
  }

  // Wait for transcript content to load
  await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

  // Extract transcript segments from the side panel
  const result = await page.evaluate(() => {
    const segments: Array<{ text: string; start: number; duration: number }> = [];
    
    // YouTube 2024/2025 transcript panel selectors
    const segmentSelectors = [
      'ytd-transcript-segment-renderer',
      'ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer',
      '#segments-container ytd-transcript-segment-renderer',
      'ytd-engagement-panel-section-list-renderer ytd-transcript-segment-renderer',
      '[class*="transcript"] [class*="segment"]',
      '.ytd-transcript-segment-renderer'
    ];
    
    let segmentElements: Element[] = [];
    for (const selector of segmentSelectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        segmentElements = Array.from(found);
        break;
      }
    }

    // If still no segments, try to find any timestamped content in the panel
    if (segmentElements.length === 0) {
      const panel = document.querySelector(
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ' +
        '#panels ytd-engagement-panel-section-list-renderer, ' +
        '[class*="transcript-panel"]'
      );
      
      if (panel) {
        // Get all clickable transcript items
        segmentElements = Array.from(panel.querySelectorAll('[class*="segment"], [role="button"]'));
      }
    }

    segmentElements.forEach((el) => {
      // Get timestamp - try multiple selectors
      const timeSelectors = [
        '.segment-timestamp',
        '[class*="timestamp"]',
        '.ytd-transcript-segment-renderer:first-child',
        'div:first-child'
      ];
      
      let timeText = '0:00';
      for (const sel of timeSelectors) {
        const timeEl = el.querySelector(sel);
        const text = timeEl?.textContent?.trim() || '';
        if (text.match(/^\d+:\d+/)) {
          timeText = text;
          break;
        }
      }
      
      // Also check if the element itself starts with timestamp
      const elText = el.textContent?.trim() || '';
      const timestampMatch = elText.match(/^(\d+:\d+(?::\d+)?)/);
      if (timestampMatch) {
        timeText = timestampMatch[1];
      }
      
      // Parse timestamp to seconds
      const timeParts = timeText.split(':').map(p => parseInt(p, 10));
      let startSeconds = 0;
      if (timeParts.length === 3) {
        startSeconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
      } else if (timeParts.length === 2) {
        startSeconds = timeParts[0] * 60 + timeParts[1];
      }

      // Get text content - remove the timestamp from it
      let text = el.textContent?.trim() || '';
      text = text.replace(/^\d+:\d+(?::\d+)?\s*/, '').trim();
      
      // Also try specific text selectors
      const textSelectors = [
        '.segment-text',
        '[class*="cue"]',
        'yt-formatted-string:last-child',
        'span:last-child'
      ];
      
      for (const sel of textSelectors) {
        const textEl = el.querySelector(sel);
        if (textEl?.textContent?.trim() && !textEl.textContent.match(/^\d+:\d+/)) {
          text = textEl.textContent.trim();
          break;
        }
      }

      if (text && text.length > 0) {
        segments.push({
          text,
          start: startSeconds,
          duration: 0
        });
      }
    });

    // Calculate durations (time until next segment)
    for (let i = 0; i < segments.length - 1; i++) {
      segments[i].duration = segments[i + 1].start - segments[i].start;
    }
    if (segments.length > 0) {
      segments[segments.length - 1].duration = 5;
    }

    return segments;
  });

  if (!result || result.length === 0) {
    return null;
  }

  const transcript = result.map(s => s.text).join(' ');

  return {
    transcript,
    segments: result
  };
}

/**
 * Try to open the transcript panel in YouTube's UI
 * YouTube 2024/2025 UI: Transcript is accessed via "...more" in description or "..." menu
 */
async function openTranscriptPanel(page: Page): Promise<boolean> {
  const wait = (ms: number) => page.evaluate(`new Promise(r => setTimeout(r, ${ms}))`);
  
  // First, scroll down slightly to ensure description is visible
  await page.evaluate(() => window.scrollBy(0, 300));
  await wait(1000);

  // Method 1: Expand description and look for "Show transcript" button
  const expandedDesc = await page.evaluate(() => {
    const moreButtons = Array.from(document.querySelectorAll(
      '#description-inline-expander #expand, ' +
      '#description tp-yt-paper-button, ' +
      'ytd-text-inline-expander #expand, ' +
      '[class*="more-button"], ' +
      'button'
    ));
    
    for (const btn of moreButtons) {
      const text = btn.textContent?.toLowerCase() || '';
      if (text.includes('more') && !text.includes('show more replies')) {
        (btn as HTMLElement).click();
        return true;
      }
    }
    return false;
  });
  
  if (expandedDesc) {
    await wait(1000);
  }

  // Now look for "Show transcript" button in expanded description
  const transcriptBtn = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll(
      'ytd-video-description-transcript-section-renderer button, ' +
      '#description button, ' +
      '#description-inline-expander button, ' +
      'button, ' +
      'ytd-button-renderer'
    ));
    
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if (text.includes('show transcript') || ariaLabel.includes('transcript')) {
        (btn as HTMLElement).click();
        return true;
      }
    }
    return false;
  });

  if (transcriptBtn) {
    await wait(2000);
    return true;
  }

  // Method 2: Click the "..." (more actions) menu below the video
  const menuOpened = await page.evaluate(() => {
    const menuButtons = Array.from(document.querySelectorAll(
      '#top-level-buttons-computed ytd-menu-renderer button, ' +
      '#menu-container button, ' +
      'ytd-menu-renderer yt-icon-button, ' +
      '#actions ytd-menu-renderer button, ' +
      'button[aria-label="More actions"], ' +
      'button[aria-label="More"]'
    ));
    
    for (const btn of menuButtons) {
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if (ariaLabel.includes('more') || btn.querySelector('yt-icon')) {
        (btn as HTMLElement).click();
        return true;
      }
    }
    
    const fallbackBtn = document.querySelector('ytd-menu-renderer button');
    if (fallbackBtn) {
      (fallbackBtn as HTMLElement).click();
      return true;
    }
    
    return false;
  });

  if (menuOpened) {
    await wait(1000);
    
    const transcriptClicked = await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll(
        'ytd-menu-service-item-renderer, ' +
        'tp-yt-paper-item, ' +
        'ytd-menu-popup-renderer tp-yt-paper-listbox > *, ' +
        '[role="menuitem"], ' +
        'yt-list-item-view-model'
      ));
      
      for (const item of menuItems) {
        const text = item.textContent?.toLowerCase() || '';
        if (text.includes('transcript')) {
          (item as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (transcriptClicked) {
      await wait(2000);
      return true;
    }
    
    await page.keyboard.press('Escape');
  }

  // Method 3: Try clicking directly on any visible transcript button
  const directClick = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('*'));
    for (const el of allElements) {
      if (el.children.length === 0) {
        const text = el.textContent?.toLowerCase() || '';
        if (text === 'show transcript' || text === 'transcript') {
          (el as HTMLElement).click();
          return true;
        }
      }
    }
    return false;
  });

  if (directClick) {
    await wait(2000);
    return true;
  }

  return false;
}

// =============================================================================
// Combined Extraction
// =============================================================================

/**
 * Extract transcript using the best available method.
 * Priority order:
 * 1. youtube-transcript API (fast, no dependencies)
 * 2. Browser automation (last resort, requires Steel session)
 * 
 * @param videoIdOrUrl - YouTube video ID or URL
 * @param page - Optional Puppeteer page for browser fallback
 */
export async function extractTranscript(
  videoIdOrUrl: string,
  page?: Page
): Promise<{ transcript: string; segments: TranscriptSegment[]; method: 'api' | 'browser' } | null> {
  // Try API method first (fast, no browser needed)
  const apiResult = await extractTranscriptApi(videoIdOrUrl);
  
  if (apiResult) {
    return { ...apiResult, method: 'api' };
  }

  // Fall back to browser method if page is provided
  if (page) {
    const videoUrl = videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be')
      ? videoIdOrUrl
      : buildVideoUrl(videoIdOrUrl);
    
    const browserResult = await extractTranscriptBrowser(page, videoUrl);
    
    if (browserResult) {
      return { ...browserResult, method: 'browser' };
    }
  }

  return null;
}

/**
 * Extract video metadata from YouTube page
 */
export async function extractVideoMetadata(
  page: Page,
  videoUrl: string
): Promise<Partial<VideoData>> {
  const videoId = extractVideoId(videoUrl);
  
  if (!videoId) {
    throw new Error(`Invalid YouTube video URL: ${videoUrl}`);
  }

  // Make sure we're on the video page
  const currentUrl = page.url();
  if (!currentUrl.includes(videoId)) {
    await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));
  }

  return await page.evaluate((vid) => {
    const data: Record<string, string | undefined> = {};

    // Title
    const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
                    document.querySelector('#title h1 yt-formatted-string') ||
                    document.querySelector('meta[property="og:title"]');
    data.title = titleEl?.textContent?.trim() || 
                 titleEl?.getAttribute('content') || 
                 'Untitled Video';

    // Channel name
    const channelEl = document.querySelector('#channel-name a') ||
                      document.querySelector('ytd-channel-name a');
    data.channelName = channelEl?.textContent?.trim() || '';

    // Published date
    const dateEl = document.querySelector('#info-strings yt-formatted-string') ||
                   document.querySelector('.date');
    data.publishedAt = dateEl?.textContent?.trim() || '';

    // Duration from player
    const durationEl = document.querySelector('.ytp-time-duration');
    data.duration = durationEl?.textContent?.trim() || '';

    // Thumbnail
    const thumbEl = document.querySelector('meta[property="og:image"]');
    data.thumbnailUrl = thumbEl?.getAttribute('content') || 
                        `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`;

    return data;
  }, videoId);
}

/**
 * Format transcript segments into readable text with timestamps
 */
export function formatTranscriptWithTimestamps(segments: TranscriptSegment[]): string {
  return segments.map(seg => {
    const minutes = Math.floor(seg.start / 60);
    const seconds = Math.floor(seg.start % 60);
    const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `[${timestamp}] ${seg.text}`;
  }).join('\n');
}

/**
 * Clean transcript text (remove duplicates, normalize whitespace)
 */
export function cleanTranscript(text: string): string {
  return text
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/\[Music\]/gi, '')     // Remove music markers
    .replace(/\[Applause\]/gi, '')  // Remove applause markers
    .trim();
}
