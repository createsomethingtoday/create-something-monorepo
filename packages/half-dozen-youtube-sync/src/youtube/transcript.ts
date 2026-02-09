/**
 * YouTube Transcript Extraction
 * 
 * Extracts transcripts from YouTube videos using Steel.dev browser automation.
 * Browser-first approach — YouTube has blocked all server-side transcript APIs
 * (timedtext XML, innertube get_transcript, npm packages) from server IPs as of 2026.
 * 
 * The browser method opens the transcript panel in YouTube's UI and extracts
 * the timestamped segments from the DOM, which is reliable because it uses
 * the same path a human viewer would.
 */

import type { Page } from 'puppeteer-core';
import type { TranscriptSegment, VideoData } from '../types.js';
import { extractVideoId, buildVideoUrl } from './playlist.js';

// =============================================================================
// Primary Method: Steel.dev Browser Automation
// =============================================================================

/**
 * Extract transcript using Steel.dev browser automation.
 * This is the primary (and only reliable) method as of 2026.
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

  // Wait for dynamic content
  await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));

  // Try to open transcript panel
  const transcriptOpened = await openTranscriptPanel(page);
  
  if (!transcriptOpened) {
    return null;
  }

  // Wait for transcript content to load (YouTube lazy-loads segments)
  await page.evaluate(() => new Promise(r => setTimeout(r, 5000)));

  // Diagnostic: what's inside the transcript panel?
  const panelDiag = await page.evaluate(() => {
    const panel = document.querySelector(
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
    );
    if (!panel) return 'No transcript panel found';

    const allTags: Record<string, number> = {};
    panel.querySelectorAll('*').forEach(el => {
      allTags[el.tagName.toLowerCase()] = (allTags[el.tagName.toLowerCase()] || 0) + 1;
    });

    // Look for any elements with timestamps (0:00 format)
    const timestampEls: string[] = [];
    panel.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.match(/^\d+:\d{2}$/) && el.children.length === 0) {
        timestampEls.push(`${el.tagName}.${el.className?.toString().split(' ')[0] || 'no-class'}: "${text}"`);
      }
    });

    return JSON.stringify({
      tags: Object.entries(allTags).sort((a, b) => b[1] - a[1]).slice(0, 20),
      timestampElements: timestampEls.slice(0, 5),
      totalElements: panel.querySelectorAll('*').length,
      innerTextPreview: panel.textContent?.replace(/\s+/g, ' ').trim().substring(0, 300),
    }, null, 2);
  });
  console.error(`  [transcript] Panel DOM: ${panelDiag}`);

  // Extract transcript segments from the side panel
  const result = await page.evaluate(() => {
    const segments: Array<{ text: string; start: number; duration: number }> = [];
    
    // YouTube 2025/2026 transcript panel selectors
    const segmentSelectors = [
      'ytd-transcript-segment-renderer',
      'ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer',
      '#segments-container ytd-transcript-segment-renderer',
      'ytd-engagement-panel-section-list-renderer ytd-transcript-segment-renderer',
      '[class*="transcript"] [class*="segment"]',
      '.ytd-transcript-segment-renderer',
      // 2026: YouTube may use new component names
      'ytd-transcript-renderer [role="button"]',
      'ytd-transcript-body-renderer [role="button"]',
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
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
      );
      
      if (panel) {
        // Try: any element with a sibling that contains timestamp text
        const allEls = Array.from(panel.querySelectorAll('*'));
        const timestampPattern = /^\d+:\d{2}$/;
        
        for (const el of allEls) {
          const text = el.textContent?.trim() || '';
          // If this element IS a timestamp, its sibling or parent should have the text
          if (timestampPattern.test(text) && el.children.length === 0) {
            const parent = el.parentElement;
            if (parent) {
              segmentElements.push(parent);
            }
          }
        }
        
        // Deduplicate
        segmentElements = [...new Set(segmentElements)];
        
        // Fallback: any role="button" or clickable segments
        if (segmentElements.length === 0) {
          segmentElements = Array.from(panel.querySelectorAll('[role="button"], [class*="segment"]'));
        }
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
 * Try to open the transcript panel in YouTube's UI.
 * YouTube 2025/2026 UI: Transcript is accessed via "...more" in description or "..." menu.
 */
async function openTranscriptPanel(page: Page): Promise<boolean> {
  const wait = (ms: number) => page.evaluate(`new Promise(r => setTimeout(r, ${ms}))`);
  const log = (msg: string) => console.error(`  [transcript] ${msg}`);
  
  // Dismiss any consent/cookie banners first
  await page.evaluate(() => {
    const rejectButtons = Array.from(document.querySelectorAll('button'));
    for (const btn of rejectButtons) {
      const text = btn.textContent?.toLowerCase() || '';
      if (text.includes('reject all') || text.includes('accept all')) {
        (btn as HTMLElement).click();
        break;
      }
    }
  });
  await wait(1000);

  // Scroll down to ensure description area is visible
  await page.evaluate(() => window.scrollBy(0, 400));
  await wait(1500);

  // Method 1: Expand description and look for "Show transcript"
  log('Method 1: expanding description...');
  const expandedDesc = await page.evaluate(() => {
    // Try the "...more" expander
    const expander = document.querySelector('#description-inline-expander #expand') ||
                     document.querySelector('tp-yt-paper-button#expand');
    if (expander) {
      (expander as HTMLElement).click();
      return 'expander';
    }
    
    // Try all buttons with "more" text
    const moreButtons = Array.from(document.querySelectorAll('button, tp-yt-paper-button, ytd-button-renderer'));
    for (const btn of moreButtons) {
      const text = btn.textContent?.trim().toLowerCase() || '';
      if ((text === 'more' || text === '...more') && !text.includes('replies')) {
        (btn as HTMLElement).click();
        return text;
      }
    }
    return null;
  });
  
  if (expandedDesc) {
    log(`  Expanded desc via: "${expandedDesc}"`);
    await wait(1500);
  } else {
    log('  No expander found');
  }

  // Look for "Show transcript" button
  log('Looking for transcript button...');
  const transcriptBtn = await page.evaluate(() => {
    // Specific transcript section selector first
    const transcriptSection = document.querySelector('ytd-video-description-transcript-section-renderer');
    if (transcriptSection) {
      const btn = transcriptSection.querySelector('button');
      if (btn) {
        btn.click();
        return 'transcript-section-button';
      }
    }
    
    // Search all buttons
    const buttons = Array.from(document.querySelectorAll('button, ytd-button-renderer'));
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if (text.includes('show transcript') || ariaLabel.includes('show transcript')) {
        (btn as HTMLElement).click();
        return `button: "${text.substring(0, 40)}"`;
      }
    }
    return null;
  });

  if (transcriptBtn) {
    log(`  Clicked: ${transcriptBtn}`);
    await wait(2500);
    return true;
  }
  log('  No transcript button found in description');

  // Method 2: Three-dot menu → "Show transcript"
  log('Method 2: three-dot menu...');
  const menuOpened = await page.evaluate(() => {
    // Find the three-dot menu button near the video actions
    const candidates = Array.from(document.querySelectorAll(
      'button[aria-label="More actions"], ' +
      '#top-level-buttons-computed ytd-menu-renderer button, ' +
      'ytd-menu-renderer yt-icon-button button, ' +
      '#actions ytd-menu-renderer button'
    ));
    
    // Prefer the one with "More actions" aria-label
    for (const btn of candidates) {
      const ariaLabel = btn.getAttribute('aria-label') || '';
      if (ariaLabel.toLowerCase().includes('more actions')) {
        (btn as HTMLElement).click();
        return ariaLabel;
      }
    }
    
    // Fallback: any menu button
    if (candidates.length > 0) {
      (candidates[candidates.length - 1] as HTMLElement).click();
      return 'fallback-menu';
    }
    
    return null;
  });

  if (menuOpened) {
    log(`  Menu opened via: "${menuOpened}"`);
    await wait(1500);
    
    const transcriptClicked = await page.evaluate(() => {
      const menuItems = Array.from(document.querySelectorAll(
        'ytd-menu-service-item-renderer, ' +
        'tp-yt-paper-item, ' +
        '[role="menuitem"], ' +
        'yt-list-item-view-model'
      ));
      
      for (const item of menuItems) {
        const text = item.textContent?.trim().toLowerCase() || '';
        if (text.includes('show transcript') || text === 'transcript') {
          (item as HTMLElement).click();
          return text;
        }
      }
      
      // Return all menu item texts for debugging
      return menuItems.map(i => i.textContent?.trim().substring(0, 40)).filter(Boolean).join(' | ');
    });

    if (transcriptClicked && !transcriptClicked.includes('|')) {
      log(`  Clicked menu item: "${transcriptClicked}"`);
      await wait(2500);
      return true;
    }
    
    log(`  Menu items found: ${transcriptClicked || 'none'}`);
    await page.keyboard.press('Escape');
    await wait(500);
  } else {
    log('  No menu button found');
  }

  // Method 3: Direct scan for any "transcript" text
  log('Method 3: direct text scan...');
  const directClick = await page.evaluate(() => {
    // Look for elements containing "transcript" that are clickable
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      const el = node as HTMLElement;
      const text = el.textContent?.trim().toLowerCase() || '';
      if ((text === 'show transcript' || text === 'transcript') && el.children.length === 0) {
        el.click();
        return `clicked: "${text}"`;
      }
    }
    return null;
  });

  if (directClick) {
    log(`  ${directClick}`);
    await wait(2500);
    return true;
  }
  log('  No transcript text found');

  // Debug: log what's on the page
  const debugInfo = await page.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      hasPlayer: !!document.querySelector('#movie_player'),
      hasDescription: !!document.querySelector('#description'),
      hasActions: !!document.querySelector('#actions'),
      hasEngagementPanels: document.querySelectorAll('ytd-engagement-panel-section-list-renderer').length,
      pageText: document.body.innerText?.substring(0, 200),
    };
  });
  log(`Debug: ${JSON.stringify(debugInfo, null, 2)}`);

  return false;
}

// =============================================================================
// Combined Extraction
// =============================================================================

/**
 * Extract transcript — browser-first approach.
 * 
 * If a Puppeteer page is provided, uses Steel browser automation (primary).
 * Without a page, returns null (server-side APIs are blocked as of 2026).
 * 
 * @param videoIdOrUrl - YouTube video ID or URL
 * @param page - Puppeteer page connected to Steel session (required for extraction)
 */
export async function extractTranscript(
  videoIdOrUrl: string,
  page?: Page
): Promise<{ transcript: string; segments: TranscriptSegment[]; method: 'browser' } | null> {
  if (!page) {
    // No browser session — can't extract transcripts server-side
    return null;
  }

  const videoUrl = videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be')
    ? videoIdOrUrl
    : buildVideoUrl(videoIdOrUrl);
  
  const browserResult = await extractTranscriptBrowser(page, videoUrl);
  
  if (browserResult) {
    return { ...browserResult, method: 'browser' };
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
