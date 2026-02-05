/**
 * Zoom Clips DOM Extractor
 * 
 * Extracts clip metadata, video URL, and transcript from Zoom Clips pages.
 * Works with public share URLs: https://zoom.us/clips/share/<id>
 * 
 * =============================================================================
 * UI LOCATION DOCUMENTATION (Updated Feb 2026)
 * =============================================================================
 * 
 * VERIFIED PAGE STRUCTURE (https://zoom.us/clips/share/<id>):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Header: Zoom branding, Share button                         │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Video Player Area (center):                                 │
 * │   - Video.js player with controls                           │
 * │   - Play/pause, volume, fullscreen                          │
 * │   - Reaction emojis: 👍 👏 ❤ 😂 😮 🎉                        │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Metadata Section (below video):                             │
 * │   - Title (large text)                                      │
 * │   - Speaker name + avatar                                   │
 * │   - Created date ("4 hours ago" format)                     │
 * │   - Play count ("1 play")                                   │
 * ├─────────────────────────────────────────────────────────────┤
 * │ TABBED SIDEBAR (right side or below video):                 │
 * │   Uses Zoom's custom tab system: .zoom-tabs__item           │
 * │                                                             │
 * │   ┌─────────────────────────────────────────────────────┐   │
 * │   │ Summary | Chapters | Comments | Transcript | Stats  │   │
 * │   └─────────────────────────────────────────────────────┘   │
 * │                                                             │
 * │   Summary Tab (default active):                             │
 * │     - AI-generated summary in .summary-text                 │
 * │     - Auto-generated tags                                   │
 * │                                                             │
 * │   Transcript Tab:                                           │
 * │     - Click to reveal timestamped transcript                │
 * │     - Format: "00:01Text00:13More text..."                  │
 * │     - Uses 509+ DOM elements for segments                   │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * VERIFIED SELECTORS (Feb 2026):
 * 
 * | Element        | Selector                          | Notes                       |
 * |----------------|-----------------------------------|-----------------------------|
 * | Tab Container  | .zoom-tabs__item                  | All tab buttons             |
 * | Active Tab     | .zoom-tabs__item.is-active        | Currently selected tab      |
 * | Transcript Tab | .zoom-tabs__item (text="Transcript")| aria-selected="false" initially |
 * | Summary Text   | .summary-text                     | AI-generated summary        |
 * | Title          | Clips Player Page h1              | Main clip title             |
 * | Video          | video                             | HTML5 video element         |
 * | Speaker        | Below title with avatar           | Clip creator name           |
 * 
 * TRANSCRIPT EXTRACTION WORKFLOW:
 * 
 * 1. Navigate to clip share URL
 * 2. Wait for page load (check for .zoom-tabs__item presence)
 * 3. Click "Transcript" tab: document.querySelector('.zoom-tabs__item[text*="Transcript"]')
 *    OR iterate: document.querySelectorAll('.zoom-tabs__item').find(t => t.textContent === 'Transcript')
 * 4. Wait 1-2s for content to load
 * 5. Extract text content from the active tab panel
 * 
 * The transcript text is timestamped inline: "00:01Hello00:05World" format.
 * Parse timestamps with regex: /(\d{2}:\d{2})/g
 */

import type { Page } from 'puppeteer-core';
import type { ClipData } from '../types.js';

// =============================================================================
// UI Element Registry
// =============================================================================

/**
 * Registry of known UI element locations in Zoom Clips.
 * Updated Feb 2026 based on actual session observations.
 */
export const UI_LOCATIONS = {
  // Tab system (VERIFIED)
  tabs: {
    selectors: ['.zoom-tabs__item'],
    description: 'Tab navigation buttons (Summary, Chapters, Comments, Transcript, Statistics)',
    location: 'Right sidebar below video metadata',
    verified: true
  },
  
  // Active tab indicator (VERIFIED)
  activeTab: {
    selectors: ['.zoom-tabs__item.is-active', '[aria-selected="true"]'],
    description: 'Currently selected tab',
    location: 'Tab bar',
    verified: true
  },
  
  // Video player elements
  video: {
    selectors: ['video', '[data-testid="video-player"] video'],
    description: 'Main video element (Video.js player)',
    location: 'Center of page'
  },
  
  // Title elements
  title: {
    selectors: [
      'h1',
      '[class*="title"]:not([class*="subtitle"])',
      '[data-testid="clip-title"]'
    ],
    description: 'Clip title/name',
    location: 'Below video'
  },
  
  // Speaker/owner info
  speaker: {
    selectors: [
      '[class*="owner"]',
      '[class*="host"]',
      '[class*="speaker"]',
      '[class*="author"]',
      '[data-testid="clip-owner"]'
    ],
    description: 'Clip creator name',
    location: 'Below title, with avatar'
  },
  
  // Summary text (VERIFIED)
  summary: {
    selectors: ['.summary-text'],
    description: 'AI-generated summary content',
    location: 'Summary tab content (default visible)',
    verified: true
  },
  
  // Transcript tab button (VERIFIED - requires text content check)
  transcriptTab: {
    selectors: ['.zoom-tabs__item'],
    description: 'Transcript tab button - find by text content "Transcript"',
    location: 'Tab bar, 4th position',
    extractionMethod: 'Click tab with textContent === "Transcript"',
    verified: true
  },
  
  // Transcript content (appears after clicking tab)
  transcriptContent: {
    selectors: [
      '[class*="transcript"]',
      '.zoom-tabs__content',
      '[role="tabpanel"]'
    ],
    description: 'Transcript text with timestamps',
    location: 'Tab content area after clicking Transcript tab',
    format: 'Timestamped inline: "00:01Text00:05More text..."',
    verified: true
  },
  
  // Duration
  duration: {
    selectors: [
      '[class*="duration"]',
      '[data-testid="clip-duration"]',
      '[class*="time"]',
      '.player-duration'
    ],
    description: 'Clip length',
    location: 'Video player controls'
  }
} as const;

// =============================================================================
// Extraction Script (runs in browser context)
// =============================================================================

/**
 * Main extraction script - runs in the browser context via page.evaluate()
 */
const EXTRACTION_SCRIPT = `
(function() {
  const result = {
    title: null,
    description: null,
    thumbnailUrl: null,
    videoUrl: null,
    transcript: null,
    duration: null,
    durationSeconds: null,
    speaker: null,
    createdAt: null,
    warnings: []
  };

  // Helper: Get text content safely
  function getText(selector) {
    const el = document.querySelector(selector);
    return el ? el.textContent?.trim() : null;
  }

  // Helper: Get attribute safely
  function getAttr(selector, attr) {
    const el = document.querySelector(selector);
    return el ? el.getAttribute(attr) : null;
  }

  // Helper: Try multiple selectors
  function trySelectors(selectors, getter = getText) {
    for (const sel of selectors) {
      const result = getter(sel);
      if (result) return result;
    }
    return null;
  }

  // ===== TITLE =====
  result.title = trySelectors([
    'h1',
    '[class*="title"]:not([class*="subtitle"])',
    '[data-testid="clip-title"]',
    '.clip-title',
    'meta[property="og:title"]'
  ], (sel) => {
    if (sel.startsWith('meta')) {
      return getAttr(sel, 'content');
    }
    return getText(sel);
  });

  // ===== DESCRIPTION =====
  result.description = trySelectors([
    '[class*="description"]',
    '[data-testid="clip-description"]',
    'meta[property="og:description"]',
    'meta[name="description"]'
  ], (sel) => {
    if (sel.startsWith('meta')) {
      return getAttr(sel, 'content');
    }
    return getText(sel);
  });

  // ===== VIDEO URL =====
  result.videoUrl = trySelectors([
    'video source',
    'video',
    '[class*="video"] source',
    '[data-testid="video-player"] source'
  ], (sel) => {
    const el = document.querySelector(sel);
    return el ? (el.src || el.getAttribute('src')) : null;
  });

  // ===== THUMBNAIL =====
  result.thumbnailUrl = trySelectors([
    'video',
    '[class*="thumbnail"] img',
    'meta[property="og:image"]'
  ], (sel) => {
    if (sel.startsWith('meta')) {
      return getAttr(sel, 'content');
    }
    const el = document.querySelector(sel);
    return el ? (el.poster || el.src) : null;
  });

  // ===== DURATION =====
  result.duration = trySelectors([
    '[class*="duration"]',
    '[data-testid="clip-duration"]',
    '[class*="time"]',
    '.player-duration'
  ]);

  // Parse duration to seconds
  if (result.duration) {
    const parts = result.duration.split(':').map(Number);
    if (parts.length === 2) {
      result.durationSeconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      result.durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }

  // ===== SPEAKER / HOST =====
  result.speaker = trySelectors([
    '[class*="speaker"]',
    '[class*="host"]',
    '[class*="owner"]',
    '[data-testid="clip-owner"]',
    '[class*="author"]'
  ]);

  // ===== CREATED DATE =====
  result.createdAt = trySelectors([
    '[class*="date"]',
    '[class*="created"]',
    'time',
    '[datetime]'
  ], (sel) => {
    if (sel === '[datetime]') {
      return getAttr('time[datetime]', 'datetime');
    }
    return getText(sel);
  });

  // ===== TRANSCRIPT =====
  // Try multiple transcript containers
  const transcriptSelectors = [
    '[class*="transcript"]',
    '[data-testid="transcript"]',
    '[class*="captions"]',
    '[class*="subtitles"]',
    '.transcript-container',
    '#transcript'
  ];

  for (const sel of transcriptSelectors) {
    const container = document.querySelector(sel);
    if (container) {
      // Get all text nodes, preserving line breaks
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const texts = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          texts.push(text);
        }
      }
      
      if (texts.length > 0) {
        result.transcript = texts.join(' ');
        break;
      }
    }
  }

  // Also try to get transcript from data attributes
  if (!result.transcript) {
    const dataTranscript = document.querySelector('[data-transcript]');
    if (dataTranscript) {
      result.transcript = dataTranscript.getAttribute('data-transcript');
    }
  }

  // Warn if no transcript found
  if (!result.transcript) {
    result.warnings.push('No transcript found. Human may need to expand transcript panel.');
  }

  // Warn if no video URL
  if (!result.videoUrl) {
    result.warnings.push('No video URL found. Page may not be fully loaded or requires authentication.');
  }

  return result;
})()
`;

// =============================================================================
// Transcript Tab Click Extraction (VERIFIED WORKFLOW)
// =============================================================================

/**
 * Script to click Transcript tab - runs in browser context
 */
const CLICK_TRANSCRIPT_TAB_SCRIPT = `
(function() {
  const tabs = document.querySelectorAll('.zoom-tabs__item, [role="tab"]');
  for (const tab of tabs) {
    if (tab.textContent?.trim() === 'Transcript') {
      tab.click();
      return true;
    }
  }
  return false;
})()
`;

/**
 * Script to get summary text - runs in browser context
 */
const GET_SUMMARY_SCRIPT = `
(function() {
  const summaryEl = document.querySelector('.summary-text');
  return summaryEl?.textContent?.trim() || null;
})()
`;

/**
 * Script to extract transcript content - runs in browser context
 */
const EXTRACT_TRANSCRIPT_CONTENT_SCRIPT = `
(function() {
  const data = {
    transcript: '',
    summary: '',
    segmentCount: 0
  };

  // Get summary text (from Summary tab, cached on page)
  const summaryEl = document.querySelector('.summary-text');
  data.summary = summaryEl?.textContent?.trim() || '';

  // Check if Transcript tab is now active
  const activeTab = document.querySelector('.zoom-tabs__item.is-active');
  if (activeTab?.textContent?.trim() !== 'Transcript') {
    return data;
  }

  // Find transcript content - could be in various containers
  // Method 1: Look for the entire content area and extract text
  const contentArea = document.querySelector('.zoom-tabs__content, [role="tabpanel"], .detail-sidebar');
  if (contentArea) {
    // Get all text content, which includes timestamps
    const fullText = contentArea.textContent?.trim() || '';
    
    // Count segments (timestamped sections)
    const timestamps = fullText.match(/\\d{2}:\\d{2}/g) || [];
    data.segmentCount = timestamps.length;
    
    // Extract only the transcript portion (after "Transcript" heading if present)
    // The format is: "No transcripts match your search.00:01Text00:13More text..."
    const transcriptMatch = fullText.match(/(?:No transcripts match your search\\.|^)(\\d{2}:\\d{2}.+)$/s);
    if (transcriptMatch) {
      data.transcript = transcriptMatch[1];
    } else {
      // Fallback: just use all text with timestamps
      data.transcript = fullText;
    }
  }

  // Method 2: Collect from individual segment elements
  if (!data.transcript) {
    const segments = [];
    const segmentEls = document.querySelectorAll('[class*="segment"], [class*="cue"], [class*="line"]');
    segmentEls.forEach(function(el) {
      const text = el.textContent?.trim();
      if (text) {
        segments.push(text);
        data.segmentCount++;
      }
    });
    if (segments.length > 0) {
      data.transcript = segments.join(' ');
    }
  }

  return data;
})()
`;

/**
 * Click the Transcript tab and extract transcript content.
 * This is the verified workflow as of Feb 2026.
 * 
 * @param page - Puppeteer Page instance
 * @returns Extracted transcript text with timestamps, or null if not found
 */
export async function extractTranscriptWithTabClick(page: Page): Promise<{
  transcript: string | null;
  summary: string | null;
  tabClicked: boolean;
  segmentCount: number;
}> {
  // 1. Click the Transcript tab
  const tabClicked = await page.evaluate(CLICK_TRANSCRIPT_TAB_SCRIPT) as boolean;

  if (!tabClicked) {
    // Tab not found - try to get summary at least
    const summary = await page.evaluate(GET_SUMMARY_SCRIPT) as string | null;
    return { transcript: null, summary, tabClicked: false, segmentCount: 0 };
  }

  // 2. Wait for transcript content to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Extract transcript content
  const result = await page.evaluate(EXTRACT_TRANSCRIPT_CONTENT_SCRIPT) as {
    transcript: string;
    summary: string;
    segmentCount: number;
  };

  return {
    transcript: result.transcript || null,
    summary: result.summary || null,
    tabClicked: true,
    segmentCount: result.segmentCount
  };
}

/**
 * Parse timestamped transcript into structured segments.
 * Input format: "00:01Text here00:13More text00:20Even more"
 * 
 * @param rawTranscript - Raw transcript with inline timestamps
 * @returns Array of segments with timestamp and text
 */
export function parseTimestampedTranscript(rawTranscript: string): Array<{
  timestamp: string;
  seconds: number;
  text: string;
}> {
  const segments: Array<{ timestamp: string; seconds: number; text: string }> = [];
  
  // Match pattern: timestamp followed by text until next timestamp or end
  const pattern = /(\d{2}:\d{2})([^0-9]+(?:\d(?!\d:\d{2}))*)/g;
  let match;
  
  while ((match = pattern.exec(rawTranscript)) !== null) {
    const timestamp = match[1];
    const text = match[2].trim();
    
    // Parse timestamp to seconds (MM:SS format)
    const parts = timestamp.split(':').map(Number);
    const seconds = parts[0] * 60 + parts[1];
    
    if (text) {
      segments.push({ timestamp, seconds, text });
    }
  }
  
  return segments;
}

// =============================================================================
// Extraction Function
// =============================================================================

/**
 * Extract Zoom Clip data from a page.
 * 
 * Uses the verified tab-clicking workflow to extract transcripts.
 * 
 * @param page - Puppeteer Page instance
 * @param url - The URL being extracted
 * @param sessionId - Optional session ID for tracking
 * @param options - Extraction options
 */
export async function extractZoomClip(
  page: Page,
  url: string,
  sessionId?: string,
  options: { clickTranscriptTab?: boolean } = { clickTranscriptTab: true }
): Promise<ClipData> {
  // Execute basic extraction script for metadata
  const extracted = await page.evaluate(EXTRACTION_SCRIPT) as {
    title: string | null;
    description: string | null;
    thumbnailUrl: string | null;
    videoUrl: string | null;
    transcript: string | null;
    duration: string | null;
    durationSeconds: number | null;
    speaker: string | null;
    createdAt: string | null;
    warnings: string[];
  };

  // Build ClipData object
  const clipData: ClipData = {
    url,
    title: extracted.title || 'Untitled Clip',
    scrapedAt: new Date().toISOString(),
    extractionMethod: 'steel',
    sessionId
  };

  // Add optional fields if present
  if (extracted.description) clipData.description = extracted.description;
  if (extracted.thumbnailUrl) clipData.thumbnailUrl = extracted.thumbnailUrl;
  if (extracted.videoUrl) clipData.videoUrl = extracted.videoUrl;
  if (extracted.duration) clipData.duration = extracted.duration;
  if (extracted.durationSeconds) clipData.durationSeconds = extracted.durationSeconds;
  if (extracted.speaker) clipData.speaker = extracted.speaker;
  if (extracted.createdAt) clipData.createdAt = extracted.createdAt;

  // Use tab-clicking approach for transcript extraction (verified workflow)
  if (options.clickTranscriptTab !== false) {
    const transcriptResult = await extractTranscriptWithTabClick(page);
    
    if (transcriptResult.transcript) {
      clipData.transcript = transcriptResult.transcript;
      // Store segment count in metadata
      (clipData as ClipData & { transcriptSegments?: number }).transcriptSegments = transcriptResult.segmentCount;
    }
    
    // Use summary as description if no description found
    if (!clipData.description && transcriptResult.summary) {
      clipData.description = transcriptResult.summary;
    }
  } else if (extracted.transcript) {
    // Fallback to basic extraction if tab-clicking disabled
    clipData.transcript = extracted.transcript;
  }

  return clipData;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a URL is a valid Zoom Clips URL
 */
export function isZoomClipsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'zoom.us' &&
      parsed.pathname.startsWith('/clips/share/')
    );
  } catch {
    return false;
  }
}

/**
 * Extract clip ID from Zoom Clips URL
 */
export function extractClipId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/clips\/share\/([^/?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// =============================================================================
// UI Diagnostics
// =============================================================================

/**
 * Diagnostic result for a single UI element
 */
export interface UIDiagnostic {
  element: string;
  found: boolean;
  selector: string | null;
  location: string | null;
  value: string | null;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
}

/**
 * Full diagnostic report for a Zoom Clips page
 */
export interface UIReport {
  url: string;
  timestamp: string;
  diagnostics: UIDiagnostic[];
  pageStructure: string;
  recommendations: string[];
}

/**
 * Diagnostic script to discover UI element locations
 */
const UI_DIAGNOSTIC_SCRIPT = `
(function() {
  const diagnostics = [];
  
  // Helper: Find first matching selector and report
  function diagnose(name, selectors) {
    const result = {
      element: name,
      found: false,
      selector: null,
      location: null,
      value: null,
      boundingBox: null
    };
    
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        result.found = true;
        result.selector = sel;
        result.value = el.textContent?.trim().slice(0, 100) || el.src || el.getAttribute('src');
        
        // Get bounding box for location
        const rect = el.getBoundingClientRect();
        result.boundingBox = {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
        
        // Describe location in human terms
        const vp = { w: window.innerWidth, h: window.innerHeight };
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        
        let hPos = centerX < vp.w * 0.33 ? 'left' : centerX > vp.w * 0.66 ? 'right' : 'center';
        let vPos = centerY < vp.h * 0.33 ? 'top' : centerY > vp.h * 0.66 ? 'bottom' : 'middle';
        result.location = vPos + '-' + hPos;
        
        break;
      }
    }
    
    diagnostics.push(result);
  }
  
  // Diagnose each element type
  diagnose('video', ['video', '[data-testid="video-player"] video']);
  diagnose('title', ['h1', '[class*="title"]:not([class*="subtitle"])', '[data-testid="clip-title"]']);
  diagnose('speaker', ['[class*="owner"]', '[class*="host"]', '[class*="speaker"]', '[class*="author"]']);
  diagnose('duration', ['[class*="duration"]', '[data-testid="clip-duration"]', '[class*="time"]']);
  diagnose('description', ['[class*="description"]', '[data-testid="clip-description"]']);
  diagnose('transcriptTab', ['[role="tab"][aria-label*="Transcript"]', 'button[aria-label*="Transcript"]', '[class*="transcript-tab"]']);
  diagnose('transcript', ['[class*="transcript"]', '[data-testid="transcript"]', '#transcript', '.transcript-container']);
  diagnose('captions', ['track[kind="captions"]', 'track[kind="subtitles"]', '[class*="caption"]']);
  diagnose('ccButton', ['button[aria-label*="caption"]', 'button[aria-label*="CC"]', '[class*="cc-button"]']);
  
  // Build page structure description
  const structure = [];
  structure.push('=== PAGE STRUCTURE ===');
  
  // Check for tab navigation
  const tabs = document.querySelectorAll('[role="tab"]');
  if (tabs.length > 0) {
    structure.push('Tab Navigation: ' + Array.from(tabs).map(t => t.textContent?.trim()).join(' | '));
  }
  
  // Check for video player
  const video = document.querySelector('video');
  if (video) {
    structure.push('Video: ' + (video.src || 'no src') + ', duration=' + video.duration + 's');
  }
  
  // Check for transcript-related elements
  const transcriptEls = document.querySelectorAll('[class*="transcript"], [class*="Transcript"]');
  if (transcriptEls.length > 0) {
    structure.push('Transcript Elements Found: ' + transcriptEls.length);
    transcriptEls.forEach((el, i) => {
      structure.push('  ' + i + ': ' + el.tagName + '.' + el.className.split(' ').slice(0, 3).join('.'));
    });
  } else {
    structure.push('No transcript elements found on page');
  }
  
  return {
    diagnostics,
    pageStructure: structure.join('\\n')
  };
})()
`;

/**
 * Run UI diagnostics on a Zoom Clips page.
 * Use this to discover where elements are located and update UI_LOCATIONS.
 * 
 * @param page - Puppeteer Page instance
 * @param url - The URL being diagnosed
 */
export async function diagnoseUI(page: Page, url: string): Promise<UIReport> {
  const result = await page.evaluate(UI_DIAGNOSTIC_SCRIPT) as {
    diagnostics: UIDiagnostic[];
    pageStructure: string;
  };
  
  // Generate recommendations based on findings
  const recommendations: string[] = [];
  
  const transcriptDiag = result.diagnostics.find(d => d.element === 'transcript');
  const tabDiag = result.diagnostics.find(d => d.element === 'transcriptTab');
  const ccDiag = result.diagnostics.find(d => d.element === 'ccButton');
  
  if (!transcriptDiag?.found && tabDiag?.found) {
    recommendations.push('HUMAN ACTION: Click the Transcript tab at selector: ' + tabDiag.selector);
  }
  
  if (!transcriptDiag?.found && !tabDiag?.found && ccDiag?.found) {
    recommendations.push('HUMAN ACTION: Enable closed captions via CC button');
    recommendations.push('NOTE: May need to play video and capture captions dynamically');
  }
  
  if (!transcriptDiag?.found && !tabDiag?.found && !ccDiag?.found) {
    recommendations.push('WARNING: No transcript source found on page');
    recommendations.push('OPTIONS: 1) Use third-party transcription service on video URL');
    recommendations.push('         2) Check if clip owner has separate transcript file');
    recommendations.push('         3) Use speech-to-text on downloaded video');
  }
  
  return {
    url,
    timestamp: new Date().toISOString(),
    diagnostics: result.diagnostics,
    pageStructure: result.pageStructure,
    recommendations
  };
}

/**
 * Format UI report for logging/display
 */
export function formatUIReport(report: UIReport): string {
  const lines: string[] = [
    '╔══════════════════════════════════════════════════════════════╗',
    '║              ZOOM CLIPS UI DIAGNOSTIC REPORT                  ║',
    '╠══════════════════════════════════════════════════════════════╣',
    `║ URL: ${report.url.slice(0, 50)}...`,
    `║ Time: ${report.timestamp}`,
    '╠══════════════════════════════════════════════════════════════╣',
    '║ ELEMENT LOCATIONS:',
    '╠══════════════════════════════════════════════════════════════╣',
  ];
  
  for (const diag of report.diagnostics) {
    const status = diag.found ? '✓' : '✗';
    const loc = diag.location || 'not found';
    const sel = diag.selector || '-';
    lines.push(`║ ${status} ${diag.element.padEnd(15)} ${loc.padEnd(15)} ${sel.slice(0, 30)}`);
  }
  
  lines.push('╠══════════════════════════════════════════════════════════════╣');
  lines.push('║ PAGE STRUCTURE:');
  lines.push('╠══════════════════════════════════════════════════════════════╣');
  
  for (const line of report.pageStructure.split('\n')) {
    lines.push('║ ' + line);
  }
  
  if (report.recommendations.length > 0) {
    lines.push('╠══════════════════════════════════════════════════════════════╣');
    lines.push('║ RECOMMENDATIONS:');
    lines.push('╠══════════════════════════════════════════════════════════════╣');
    for (const rec of report.recommendations) {
      lines.push('║ ' + rec);
    }
  }
  
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  
  return lines.join('\n');
}
