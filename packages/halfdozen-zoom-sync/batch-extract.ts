#!/usr/bin/env npx tsx
/**
 * Batch Extract Zoom Clips Transcripts & Sync to Notion
 * 
 * Uses saved session context to authenticate and extract transcripts
 * from multiple Zoom Clips without requiring manual login.
 * Optionally syncs to Notion with optimized batch deduplication.
 * 
 * Prerequisites:
 * - Run watch-session.ts first to capture session-context.json
 * - Session context contains cookies and storage that bypass login
 * - Set NOTION_API_KEY in .env for Notion sync
 * 
 * Usage:
 *   npx tsx batch-extract.ts                    # Extract from clips library
 *   npx tsx batch-extract.ts --limit 5          # Extract first 5 clips only
 *   npx tsx batch-extract.ts --urls url1,url2   # Extract specific clip URLs
 *   npx tsx batch-extract.ts --sync             # Extract AND sync to Notion
 *   npx tsx batch-extract.ts --sync --limit 5   # Extract 5 clips and sync
 */
import 'dotenv/config';
import Steel from 'steel-sdk';
import puppeteer, { type Page, type Browser } from 'puppeteer-core';
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
const OUTPUT_DIR = 'extracted-clips';

interface SessionContext {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
    expires?: number;
  }>;
  localStorage?: Record<string, Record<string, string>>;
  sessionStorage?: Record<string, Record<string, string>>;
}

interface ExtractedClip {
  url: string;
  title: string;
  speaker?: string;
  createdAt?: string;  // From Zoom (e.g., "5 hours ago")
  transcript?: string;
  summary?: string;
  segmentCount: number;
  extractedAt: string;
}

// =============================================================================
// Helpers
// =============================================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ParsedArgs {
  limit: number;
  urls: string[];
  syncToNotion: boolean;
  databaseId: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let limit = 10;
  let urls: string[] = [];
  let syncToNotion = false;
  let databaseId = DEFAULT_DATABASE_ID;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--urls' && args[i + 1]) {
      urls = args[i + 1].split(',').map(u => u.trim());
      i++;
    } else if (args[i] === '--sync') {
      syncToNotion = true;
    } else if (args[i] === '--database' && args[i + 1]) {
      databaseId = args[i + 1];
      i++;
    }
  }

  return { limit, urls, syncToNotion, databaseId };
}

// =============================================================================
// Session Context Loading
// =============================================================================

function loadSessionContext(): SessionContext | null {
  try {
    if (!fs.existsSync(SESSION_CONTEXT_FILE)) {
      console.error(`❌ Session context file not found: ${SESSION_CONTEXT_FILE}`);
      console.error('   Run watch-session.ts or capture-and-explore.ts first to capture session context.');
      return null;
    }

    const content = fs.readFileSync(SESSION_CONTEXT_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to load session context:', (error as Error).message);
    return null;
  }
}

// =============================================================================
// Extraction Functions
// =============================================================================

async function extractClipMetadata(page: Page): Promise<{ title: string; speaker: string; createdAt: string }> {
  return await page.evaluate(() => {
    // TITLE: Use og:title meta tag (actual clip title, not page header)
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const title = ogTitle ||
                  document.title?.replace(' | Zoom Clips', '').replace('Clips', '').trim() ||
                  'Untitled Clip';

    // SPEAKER: Found in user-name class
    const speakerEl = document.querySelector('[class*="user-name"], [class*="owner"], [class*="speaker"], [class*="author"]');
    const speaker = speakerEl?.textContent?.trim() || '';

    // DATE: Found in start-time-str class (e.g., "5 hours ago")
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
// Main Script
// =============================================================================

async function main() {
  console.log('\n📦 Batch Extract Zoom Clips Transcripts\n');
  console.log('=' .repeat(60));

  const { limit, urls: specificUrls, syncToNotion, databaseId } = parseArgs();
  console.log(`📋 Config: limit=${limit}, specificUrls=${specificUrls.length > 0 ? specificUrls.length : 'auto-discover'}`);
  if (syncToNotion) {
    console.log(`🔗 Notion sync enabled (database: ${databaseId.substring(0, 8)}...)`);
  }

  // Load session context
  const sessionContext = loadSessionContext();
  if (!sessionContext) {
    process.exit(1);
  }
  console.log(`✅ Loaded session context with ${sessionContext.cookies.length} cookies`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Initialize Steel client
  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY! });

  console.log('\n🚀 Creating Steel session with saved context...');
  
  // Create session using saved context
  const session = await client.sessions.create({
    timeout: 15 * 60 * 1000, // 15 minutes
    sessionContext: sessionContext as Parameters<typeof client.sessions.create>[0]['sessionContext']
  });

  console.log(`✅ Session created: ${session.id}`);
  console.log(`🖥️  Live View: ${(session as { sessionViewerUrl?: string }).sessionViewerUrl}`);

  // Connect via Puppeteer
  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  const extractedClips: ExtractedClip[] = [];

  try {
    let clipUrls = specificUrls;

    // Auto-discover clips if no specific URLs provided
    if (clipUrls.length === 0) {
      console.log('\n📂 Navigating to Clips Library...');
      await page.goto(CLIPS_LIBRARY_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(3000);

      // Check if we're logged in or redirected to login page
      const currentUrl = page.url();
      const isLoginPage = currentUrl.includes('/signin') || currentUrl.includes('/login');
      
      if (isLoginPage) {
        console.error('\n❌ SESSION EXPIRED: Cookies are no longer valid.');
        console.error('   You need to refresh the session context:');
        console.error('   1. Run: npx tsx watch-session.ts');
        console.error('   2. Log in manually in the Steel browser');
        console.error('   3. The script will capture new cookies');
        console.error('\n   Alternatively, export cookies from your browser and update session-context.json');
        process.exit(1);
      }

      console.log('🔍 Discovering clip URLs...');
      clipUrls = await getClipUrls(page, limit);
      console.log(`   Found ${clipUrls.length} clips`);
      
      // Additional check: if no clips found, might be auth issue
      if (clipUrls.length === 0) {
        console.warn('\n⚠️  No clips found. This could mean:');
        console.warn('   1. The account has no clips');
        console.warn('   2. Session cookies may be partially expired');
        console.warn('   Check the Live View URL above to verify page state.');
      }
    }

    if (clipUrls.length === 0) {
      console.log('❌ No clips found to extract.');
      return;
    }

    // Extract each clip
    for (let i = 0; i < clipUrls.length; i++) {
      const url = clipUrls[i];
      console.log(`\n--- Clip ${i + 1}/${clipUrls.length} ---`);
      console.log(`📍 URL: ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);

        // Extract metadata (title, speaker, date)
        const metadata = await extractClipMetadata(page);
        console.log(`📝 Title: ${metadata.title}`);
        if (metadata.speaker) console.log(`👤 Speaker: ${metadata.speaker}`);
        if (metadata.createdAt) console.log(`📅 Created: ${metadata.createdAt}`);

        // Extract transcript using canonical function from src
        const transcriptResult = await extractTranscriptWithTabClick(page);
        
        const extracted: ExtractedClip = {
          url,
          title: metadata.title,
          speaker: metadata.speaker || undefined,
          createdAt: metadata.createdAt || undefined,  // Actual clip creation date
          transcript: transcriptResult.transcript || undefined,
          summary: transcriptResult.summary || undefined,
          segmentCount: transcriptResult.segmentCount,
          extractedAt: new Date().toISOString()
        };

        if (transcriptResult.transcript) {
          console.log(`✅ Transcript extracted: ${transcriptResult.transcript.length} chars, ${transcriptResult.segmentCount} segments`);
          
          // Save individual transcript file
          const safeTitle = metadata.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
          const filename = `${OUTPUT_DIR}/${safeTitle}_transcript.txt`;
          fs.writeFileSync(filename, transcriptResult.transcript);
          console.log(`   Saved to: ${filename}`);
        } else {
          console.log(`⚠️  No transcript found (tab clicked: ${transcriptResult.tabClicked})`);
        }

        extractedClips.push(extracted);

        // Rate limiting between clips
        await sleep(1000);

      } catch (error) {
        console.error(`❌ Error extracting clip: ${(error as Error).message}`);
        extractedClips.push({
          url,
          title: 'Error',
          segmentCount: 0,
          extractedAt: new Date().toISOString()
        });
      }
    }

    // Save all extracted data
    const outputFile = `${OUTPUT_DIR}/batch-extract-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(extractedClips, null, 2));
    console.log(`\n📁 All data saved to: ${outputFile}`);

    // Extraction Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total clips processed: ${extractedClips.length}`);
    console.log(`With transcript: ${extractedClips.filter(c => c.transcript).length}`);
    console.log(`Without transcript: ${extractedClips.filter(c => !c.transcript).length}`);
    
    const totalChars = extractedClips.reduce((sum, c) => sum + (c.transcript?.length || 0), 0);
    console.log(`Total transcript characters: ${totalChars.toLocaleString()}`);

    // Sync to Notion (if enabled)
    if (syncToNotion && extractedClips.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('🔗 SYNCING TO NOTION');
      console.log('='.repeat(60));

      // Convert ExtractedClip to ClipData format
      const clipsToSync: ClipData[] = extractedClips
        .filter(c => c.transcript) // Only sync clips with transcripts
        .map(c => ({
          url: c.url,
          title: c.title,
          speaker: c.speaker,
          transcript: c.transcript,
          description: c.summary,
          createdAt: c.createdAt || c.extractedAt, // Use Zoom's date, fallback to extraction time
          scrapedAt: c.extractedAt,
          extractionMethod: 'steel' as const
        }));

      if (clipsToSync.length === 0) {
        console.log('⚠️  No clips with transcripts to sync');
      } else {
        console.log(`📤 Syncing ${clipsToSync.length} clips...`);
        
        const notionClient = new ZoomClipsNotionClient({
          defaultDatabaseId: databaseId,
          propertyMapping: NOTION_PROPERTY_MAPPING,
          selectDefaults: NOTION_SELECT_DEFAULTS
        });

        const syncResult = await notionClient.syncClips(clipsToSync, {
          skipDuplicates: true  // Optimized batch dedup (1 API call)
        });

        console.log('\n📊 NOTION SYNC SUMMARY');
        console.log(`   Total: ${syncResult.total}`);
        console.log(`   ✅ Synced: ${syncResult.successful}`);
        console.log(`   ⏭️  Skipped (duplicates): ${syncResult.skipped}`);
        console.log(`   ❌ Failed: ${syncResult.failed}`);

        // Show individual results
        if (syncResult.failed > 0) {
          console.log('\n   Failed clips:');
          syncResult.results.forEach((r, i) => {
            if (!r.success && !r.error?.includes('Skipped')) {
              console.log(`     - ${clipsToSync[i]?.title}: ${r.error}`);
            }
          });
        }
      }
    }

  } finally {
    console.log('\n🔓 Releasing session...');
    await client.sessions.release(session.id);
    console.log('✅ Done!');
  }
}

main().catch(console.error);
