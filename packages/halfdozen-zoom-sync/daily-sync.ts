#!/usr/bin/env npx tsx
/**
 * Daily Zoom Clips Sync
 * 
 * Cron-friendly script for automated daily extraction and Notion sync.
 * Includes auth detection, logging, and optional webhook alerts.
 * 
 * Usage:
 *   npx tsx daily-sync.ts                    # Run sync
 *   npx tsx daily-sync.ts --webhook <url>    # Run with Slack/webhook alert on failure
 *   
 * Schedule with cron (run daily at 9am):
 *   0 9 * * * cd /path/to/zoom-clips-mcp && npx tsx daily-sync.ts >> logs/sync.log 2>&1
 * 
 * Environment:
 *   STEEL_API_KEY      - Required
 *   NOTION_API_KEY     - Required
 *   ALERT_WEBHOOK_URL  - Optional (Slack/Discord webhook for failure alerts)
 */
import 'dotenv/config';
import Steel from 'steel-sdk';
import puppeteer, { type Page } from 'puppeteer-core';
import * as fs from 'fs';
import { ZoomClipsNotionClient } from './src/notion/client.js';
import { extractTranscriptWithTabClick } from './src/extractors/zoom-clip.js';
import { DEFAULT_DATABASE_ID, NOTION_PROPERTY_MAPPING, NOTION_SELECT_DEFAULTS } from './src/config.js';
import type { ClipData } from './src/types.js';

// =============================================================================
// Configuration
// =============================================================================

const CLIPS_LIBRARY_URL = 'https://zoom.us/clips/mine';
const SESSION_CONTEXT_FILE = 'session-context.json';
const LOG_DIR = 'logs';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// Logging
// =============================================================================

function log(level: 'INFO' | 'WARN' | 'ERROR', message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// =============================================================================
// Alerting
// =============================================================================

async function sendAlert(webhookUrl: string, message: string, isError: boolean = true) {
  try {
    // Format for Slack webhook
    const payload = {
      text: isError ? `🚨 Zoom Clips Sync Error` : `✅ Zoom Clips Sync Success`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        }
      ]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    log('INFO', 'Alert sent to webhook');
  } catch (error) {
    log('WARN', `Failed to send alert: ${(error as Error).message}`);
  }
}

// =============================================================================
// Extraction Functions
// =============================================================================

async function extractClipMetadata(page: Page) {
  return await page.evaluate(() => {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const title = ogTitle || document.title?.replace(' | Zoom Clips', '').replace('Clips', '').trim() || 'Untitled Clip';
    const speakerEl = document.querySelector('[class*="user-name"], [class*="owner"], [class*="speaker"]');
    const speaker = speakerEl?.textContent?.trim() || '';
    const dateEl = document.querySelector('.start-time-str, [class*="start-time"], [class*="created"]');
    const createdAt = dateEl?.textContent?.trim() || '';
    return { title, speaker, createdAt };
  });
}

async function getClipUrls(page: Page, limit: number): Promise<string[]> {
  return await page.evaluate((maxClips) => {
    const links: string[] = [];
    const clipLinks = document.querySelectorAll('a[href*="/clips/share/"]');
    clipLinks.forEach((link) => {
      if (links.length < maxClips) {
        const href = link.getAttribute('href');
        if (href && !links.includes(href)) {
          links.push(href.startsWith('http') ? href : `https://zoom.us${href}`);
        }
      }
    });
    return links;
  }, limit);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const startTime = Date.now();
  const webhookUrl = process.env.ALERT_WEBHOOK_URL || process.argv.find((_, i, arr) => arr[i - 1] === '--webhook');
  
  log('INFO', '='.repeat(60));
  log('INFO', 'Starting Daily Zoom Clips Sync');
  log('INFO', '='.repeat(60));

  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  // Load session context
  if (!fs.existsSync(SESSION_CONTEXT_FILE)) {
    const msg = 'Session context file not found. Run watch-session.ts to authenticate.';
    log('ERROR', msg);
    if (webhookUrl) await sendAlert(webhookUrl, msg);
    process.exit(1);
  }

  const sessionContext = JSON.parse(fs.readFileSync(SESSION_CONTEXT_FILE, 'utf-8'));
  log('INFO', `Loaded session context with ${sessionContext.cookies.length} cookies`);

  // Check cookie freshness
  const oldestCookie = sessionContext.cookies
    .filter((c: any) => c.expires)
    .sort((a: any, b: any) => a.expires - b.expires)[0];
  
  if (oldestCookie && oldestCookie.expires * 1000 < Date.now()) {
    const msg = 'Some cookies have expired. Session may fail. Consider refreshing.';
    log('WARN', msg);
  }

  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY! });
  
  let session;
  try {
    session = await client.sessions.create({
      timeout: 15 * 60 * 1000,
      sessionContext
    });
    log('INFO', `Steel session created: ${session.id}`);
  } catch (error) {
    const msg = `Failed to create Steel session: ${(error as Error).message}`;
    log('ERROR', msg);
    if (webhookUrl) await sendAlert(webhookUrl, msg);
    process.exit(1);
  }

  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  const results = {
    clipsProcessed: 0,
    clipsWithTranscript: 0,
    clipsSynced: 0,
    clipsSkipped: 0,
    clipsFailed: 0,
    error: null as string | null
  };

  try {
    // Navigate to clips library
    await page.goto(CLIPS_LIBRARY_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Check for auth failure
    const currentUrl = page.url();
    if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
      results.error = 'SESSION EXPIRED: Cookies are no longer valid. Run watch-session.ts to re-authenticate.';
      throw new Error(results.error);
    }

    // Discover clips
    const clipUrls = await getClipUrls(page, 20); // Get up to 20 clips
    log('INFO', `Found ${clipUrls.length} clips`);

    if (clipUrls.length === 0) {
      log('WARN', 'No clips found. Account may be empty or partially logged out.');
    }

    // Extract clips
    const extractedClips: any[] = [];
    
    for (let i = 0; i < clipUrls.length; i++) {
      const url = clipUrls[i];
      log('INFO', `Processing clip ${i + 1}/${clipUrls.length}: ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

        const metadata = await extractClipMetadata(page);
        const transcriptResult = await extractTranscriptWithTabClick(page);

        extractedClips.push({
          url,
          title: metadata.title,
          speaker: metadata.speaker,
          createdAt: metadata.createdAt,
          transcript: transcriptResult.transcript,
          summary: transcriptResult.summary,
          segmentCount: transcriptResult.segmentCount,
          extractedAt: new Date().toISOString()
        });

        results.clipsProcessed++;
        if (transcriptResult.transcript) {
          results.clipsWithTranscript++;
        }

        await sleep(1000);
      } catch (error) {
        log('WARN', `Failed to extract clip ${url}: ${(error as Error).message}`);
      }
    }

    // Sync to Notion
    const clipsToSync: ClipData[] = extractedClips
      .filter(c => c.transcript)
      .map(c => ({
        url: c.url,
        title: c.title,
        speaker: c.speaker,
        transcript: c.transcript,
        description: c.summary,
        createdAt: c.createdAt || c.extractedAt,
        scrapedAt: c.extractedAt,
        extractionMethod: 'steel' as const
      }));

    if (clipsToSync.length > 0) {
      log('INFO', `Syncing ${clipsToSync.length} clips to Notion...`);
      
      const notionClient = new ZoomClipsNotionClient({
        defaultDatabaseId: DEFAULT_DATABASE_ID,
        propertyMapping: NOTION_PROPERTY_MAPPING,
        selectDefaults: NOTION_SELECT_DEFAULTS
      });

      const syncResult = await notionClient.syncClips(clipsToSync, { skipDuplicates: true });
      
      results.clipsSynced = syncResult.successful;
      results.clipsSkipped = syncResult.skipped;
      results.clipsFailed = syncResult.failed;
    }

  } catch (error) {
    results.error = (error as Error).message;
    log('ERROR', results.error);
  } finally {
    await client.sessions.release(session.id);
    log('INFO', 'Steel session released');
  }

  // Summary
  const duration = Math.round((Date.now() - startTime) / 1000);
  log('INFO', '='.repeat(60));
  log('INFO', 'SYNC COMPLETE');
  log('INFO', '='.repeat(60));
  log('INFO', `Duration: ${duration}s`);
  log('INFO', `Clips processed: ${results.clipsProcessed}`);
  log('INFO', `With transcript: ${results.clipsWithTranscript}`);
  log('INFO', `Synced to Notion: ${results.clipsSynced}`);
  log('INFO', `Skipped (dupes): ${results.clipsSkipped}`);
  log('INFO', `Failed: ${results.clipsFailed}`);

  // Send alert
  if (webhookUrl) {
    if (results.error) {
      await sendAlert(webhookUrl, `*Error:* ${results.error}\n\nAction required: Re-authenticate with \`npx tsx watch-session.ts\``);
      process.exit(1);
    } else {
      await sendAlert(
        webhookUrl,
        `*Daily sync completed*\n• Processed: ${results.clipsProcessed}\n• Synced: ${results.clipsSynced}\n• Skipped: ${results.clipsSkipped}`,
        false
      );
    }
  }

  if (results.error) {
    process.exit(1);
  }
}

main().catch((error) => {
  log('ERROR', `Unhandled error: ${error.message}`);
  process.exit(1);
});
