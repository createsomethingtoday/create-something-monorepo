#!/usr/bin/env npx tsx
/**
 * Zoom Clips Cron Service
 * 
 * Standalone service with built-in cron scheduling and Resend email alerts.
 * Deploy to Railway, Render, or Fly.io.
 * 
 * Environment variables:
 *   STEEL_API_KEY      - Required
 *   NOTION_API_KEY     - Required
 *   RESEND_API_KEY     - Required
 *   ALERT_EMAIL        - Email for alerts (default: micah@createsomething.io)
 *   CRON_SCHEDULE      - Cron expression (default: "0 9 * * *" = 9am daily)
 *   TIMEZONE           - Timezone (default: "America/New_York")
 * 
 * Usage:
 *   npx tsx cron-service.ts          # Start cron service
 *   npx tsx cron-service.ts --now    # Run sync immediately (for testing)
 */
import 'dotenv/config';
import * as cron from 'node-cron';
import Steel from 'steel-sdk';
import puppeteer, { type Page } from 'puppeteer-core';
import * as fs from 'fs';
import { Resend } from 'resend';

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  alertEmail: process.env.ALERT_EMAIL || 'micah@createsomething.io',
  cronSchedule: process.env.CRON_SCHEDULE || '0 9 * * *', // 9am daily
  timezone: process.env.TIMEZONE || 'America/New_York',
  clipsLibraryUrl: 'https://zoom.us/clips/mine',
  sessionContextFile: 'session-context.json',
  notionDatabaseId: '27a019187ac580b797fec563c98afbbc',
};

const NOTION_PROPERTY_MAPPING = {
  title: 'Item',
  url: 'Source URL',
  speaker: 'Attendees',
  date: 'Date',
  status: 'Status',
  source: 'Source',
  type: 'Type',
  description: undefined,
  duration: undefined,
  thumbnailUrl: undefined,
  videoUrl: undefined,
  scrapedAt: undefined,
  transcript: undefined,
};

const NOTION_SELECT_DEFAULTS = {
  status: 'Active',
  source: 'Zoom',
  type: 'Clip'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// Email Alerts via Resend
// =============================================================================

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(subject: string, html: string) {
  try {
    await resend.emails.send({
      from: 'Zoom Clips Sync <notifications@createsomething.io>',
      to: [CONFIG.alertEmail],
      subject,
      html,
    });
    console.log(`📧 Email sent: ${subject}`);
  } catch (error) {
    console.error(`❌ Failed to send email: ${(error as Error).message}`);
  }
}

async function sendSuccessEmail(stats: { processed: number; synced: number; skipped: number }) {
  await sendEmail(
    '✅ Zoom Clips Sync Complete',
    `
    <h2>Daily Sync Completed</h2>
    <ul>
      <li><strong>Processed:</strong> ${stats.processed} clips</li>
      <li><strong>Synced:</strong> ${stats.synced} new</li>
      <li><strong>Skipped:</strong> ${stats.skipped} duplicates</li>
    </ul>
    <p><small>Sync completed at ${new Date().toISOString()}</small></p>
    `
  );
}

async function sendFailureEmail(error: string) {
  await sendEmail(
    '🚨 Zoom Clips Sync FAILED',
    `
    <h2>Daily Sync Failed</h2>
    <p><strong>Error:</strong> ${error}</p>
    <h3>Action Required:</h3>
    <p>Session cookies may have expired. To fix:</p>
    <ol>
      <li>Run <code>npx tsx watch-session.ts</code></li>
      <li>Log into Zoom in the Live View browser</li>
      <li>Restart this service to use the new session context</li>
    </ol>
    <p><small>Failed at ${new Date().toISOString()}</small></p>
    `
  );
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

async function extractTranscript(page: Page) {
  const summary = await page.evaluate(() => {
    return document.querySelector('.summary-text')?.textContent?.trim() || null;
  });

  const tabClicked = await page.evaluate(() => {
    const tabs = document.querySelectorAll('.zoom-tabs__item, [role="tab"]');
    for (const tab of tabs) {
      if (tab.textContent?.trim() === 'Transcript') {
        (tab as HTMLElement).click();
        return true;
      }
    }
    return false;
  });

  if (!tabClicked) {
    return { transcript: null, summary, tabClicked: false, segmentCount: 0 };
  }

  await sleep(3000);

  const result = await page.evaluate(() => {
    const data = { transcript: '', segmentCount: 0 };
    const segments: string[] = [];
    const listItems = document.querySelectorAll('.transcript-list-item');
    listItems.forEach((item) => {
      const text = item.textContent?.trim();
      if (text) {
        segments.push(text);
        data.segmentCount++;
      }
    });
    if (segments.length > 0) {
      data.transcript = segments.join('\n');
    }
    return data;
  });

  return {
    transcript: result.transcript || null,
    summary,
    tabClicked: true,
    segmentCount: result.segmentCount
  };
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
// Main Sync Function
// =============================================================================

async function runSync(): Promise<{ processed: number; synced: number; skipped: number }> {
  console.log('\n' + '='.repeat(60));
  console.log(`[${new Date().toISOString()}] Starting Zoom Clips Sync`);
  console.log('='.repeat(60));

  // Load session context
  if (!fs.existsSync(CONFIG.sessionContextFile)) {
    throw new Error('Session context file not found. Run watch-session.ts to authenticate.');
  }

  const sessionContext = JSON.parse(fs.readFileSync(CONFIG.sessionContextFile, 'utf-8'));
  console.log(`✅ Loaded session context with ${sessionContext.cookies.length} cookies`);

  // Create Steel session
  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY! });
  const session = await client.sessions.create({
    timeout: 15 * 60 * 1000,
    sessionContext
  });
  console.log(`✅ Steel session: ${session.id}`);

  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  const stats = { processed: 0, synced: 0, skipped: 0 };

  try {
    // Navigate to clips library
    await page.goto(CONFIG.clipsLibraryUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    // Check for auth failure
    const currentUrl = page.url();
    if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
      throw new Error('SESSION EXPIRED: Cookies are no longer valid.');
    }

    // Discover clips
    const clipUrls = await getClipUrls(page, 20);
    console.log(`🔍 Found ${clipUrls.length} clips`);

    // Extract clips
    const extractedClips: any[] = [];
    
    for (let i = 0; i < clipUrls.length; i++) {
      const url = clipUrls[i];
      console.log(`📍 [${i + 1}/${clipUrls.length}] ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

        const metadata = await extractClipMetadata(page);
        const transcriptResult = await extractTranscript(page);

        extractedClips.push({
          url,
          title: metadata.title,
          speaker: metadata.speaker,
          createdAt: metadata.createdAt,
          transcript: transcriptResult.transcript,
          summary: transcriptResult.summary,
          extractedAt: new Date().toISOString()
        });

        stats.processed++;
        await sleep(1000);
      } catch (error) {
        console.warn(`⚠️ Failed: ${(error as Error).message}`);
      }
    }

    // Sync to Notion
    const { ZoomClipsNotionClient } = await import('./src/notion/client.js');
    
    const clipsToSync = extractedClips
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
      console.log(`📤 Syncing ${clipsToSync.length} clips to Notion...`);
      
      const notionClient = new ZoomClipsNotionClient({
        defaultDatabaseId: CONFIG.notionDatabaseId,
        propertyMapping: NOTION_PROPERTY_MAPPING,
        selectDefaults: NOTION_SELECT_DEFAULTS
      });

      const syncResult = await notionClient.syncClips(clipsToSync, { skipDuplicates: true });
      stats.synced = syncResult.successful;
      stats.skipped = syncResult.skipped;
    }

  } finally {
    await client.sessions.release(session.id);
    console.log('✅ Session released');
  }

  console.log('\n📊 Summary:');
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Synced: ${stats.synced}`);
  console.log(`   Skipped: ${stats.skipped}`);

  return stats;
}

// =============================================================================
// Cron Service
// =============================================================================

async function main() {
  const runNow = process.argv.includes('--now');

  console.log('🚀 Zoom Clips Cron Service');
  console.log(`📧 Alerts to: ${CONFIG.alertEmail}`);
  console.log(`⏰ Schedule: ${CONFIG.cronSchedule} (${CONFIG.timezone})`);

  // Validate environment
  if (!process.env.STEEL_API_KEY) throw new Error('Missing STEEL_API_KEY');
  if (!process.env.NOTION_API_KEY) throw new Error('Missing NOTION_API_KEY');
  if (!process.env.RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');

  const executeSync = async () => {
    try {
      const stats = await runSync();
      await sendSuccessEmail(stats);
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error(`❌ Sync failed: ${errorMsg}`);
      await sendFailureEmail(errorMsg);
    }
  };

  if (runNow) {
    console.log('\n🏃 Running sync immediately (--now flag)...');
    await executeSync();
    process.exit(0);
  }

  // Schedule cron job
  cron.schedule(CONFIG.cronSchedule, executeSync, {
    timezone: CONFIG.timezone
  });

  console.log('\n✅ Cron service started. Waiting for scheduled time...');
  console.log('   Press Ctrl+C to stop.\n');
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
