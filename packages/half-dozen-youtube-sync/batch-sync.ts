#!/usr/bin/env npx tsx
/**
 * Batch Sync YouTube Playlist to Notion
 * 
 * CLI tool to extract transcripts from a YouTube playlist and sync to Notion.
 * Designed for the Half Dozen client workflow.
 * 
 * Usage:
 *   npx tsx batch-sync.ts --playlist URL --sync          # Full workflow
 *   npx tsx batch-sync.ts --playlist URL --limit 5       # Extract first 5 videos
 *   npx tsx batch-sync.ts --video URL                    # Single video transcript
 *   npx tsx batch-sync.ts --check-db                     # Verify Notion database
 */
import 'dotenv/config';
import Steel from 'steel-sdk';
import puppeteer from 'puppeteer-core';
import * as fs from 'fs';
import { YouTubeNotionClient } from './src/notion/client.js';
import { extractPlaylist, extractPlaylistId } from './src/youtube/playlist.js';
import { extractTranscript, extractVideoMetadata } from './src/youtube/transcript.js';
import type { VideoData } from './src/types.js';

// =============================================================================
// Configuration
// =============================================================================

const OUTPUT_DIR = 'extracted-videos';

// Half Dozen Notion database
const DEFAULT_DATABASE_ID = process.env.NOTION_DATABASE_ID || '27a019187ac580b797fec563c98afbbc';

// Property mapping for Half Dozen database
const NOTION_PROPERTY_MAPPING = {
  title: 'Item',
  url: 'Source URL',
  date: 'Date',
  status: 'Status',
  source: 'Source',
  type: 'Type'
};

// Default values for select properties
const NOTION_SELECT_DEFAULTS = {
  status: 'Active',
  source: 'Internal',
  type: 'Video'
};

// =============================================================================
// Helpers
// =============================================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Load saved session context from session-context.json.
 * Created by running `pnpm capture:session`.
 */
function loadSessionContext(): Record<string, unknown> | null {
  const paths = [
    new URL('./session-context.json', import.meta.url),
    new URL('../session-context.json', import.meta.url),
  ];

  for (const p of paths) {
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        console.log('🔑 Loaded YouTube session context (authenticated)');
        return parsed;
      }
    } catch {
      // Try next path
    }
  }

  console.log('⚠️  No session context found — run "pnpm capture:session" to authenticate');
  return null;
}

interface ParsedArgs {
  playlistUrl?: string;
  videoUrl?: string;
  limit: number;
  syncToNotion: boolean;
  databaseId: string;
  checkDb: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let playlistUrl: string | undefined;
  let videoUrl: string | undefined;
  let limit = Infinity;
  let syncToNotion = false;
  let databaseId = DEFAULT_DATABASE_ID;
  let checkDb = false;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--playlist' || args[i] === '-p') && args[i + 1]) {
      playlistUrl = args[i + 1];
      i++;
    } else if ((args[i] === '--video' || args[i] === '-v') && args[i + 1]) {
      videoUrl = args[i + 1];
      i++;
    } else if ((args[i] === '--limit' || args[i] === '-l') && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--sync' || args[i] === '-s') {
      syncToNotion = true;
    } else if ((args[i] === '--database' || args[i] === '-d') && args[i + 1]) {
      databaseId = args[i + 1];
      i++;
    } else if (args[i] === '--check-db') {
      checkDb = true;
    }
  }

  return { playlistUrl, videoUrl, limit, syncToNotion, databaseId, checkDb };
}

function printUsage() {
  console.log(`
📺 Half Dozen YouTube Sync

Usage:
  npx tsx batch-sync.ts --playlist URL [options]
  npx tsx batch-sync.ts --video URL [options]
  npx tsx batch-sync.ts --check-db

Options:
  --playlist, -p URL    YouTube playlist URL to sync
  --video, -v URL       Single YouTube video URL
  --limit, -l N         Max videos to process (default: all)
  --sync, -s            Sync to Notion after extraction
  --database, -d ID     Notion database ID (default: Half Dozen Internal LLM)
  --check-db            Verify Notion database connection

Examples:
  npx tsx batch-sync.ts --playlist "https://youtube.com/playlist?list=..." --sync
  npx tsx batch-sync.ts --playlist "https://youtube.com/playlist?list=..." --limit 5
  npx tsx batch-sync.ts --video "https://youtube.com/watch?v=..." --sync
`);
}

// =============================================================================
// Main Functions
// =============================================================================

async function checkDatabase(databaseId: string) {
  console.log('\n🔍 Checking Notion database connection...\n');

  const notionClient = new YouTubeNotionClient({
    defaultDatabaseId: databaseId,
    propertyMapping: NOTION_PROPERTY_MAPPING,
    selectDefaults: NOTION_SELECT_DEFAULTS
  });

  const schema = await notionClient.getDatabaseSchema(databaseId);

  if (!schema) {
    console.error('❌ Could not connect to database');
    console.error('   Check your NOTION_API_KEY and database ID');
    return;
  }

  console.log(`✅ Connected to: ${schema.title}`);
  console.log(`   ID: ${schema.id}`);
  console.log('\n📋 Properties:');
  
  for (const [name, prop] of Object.entries(schema.properties)) {
    console.log(`   - ${name} (${prop.type})`);
  }

  // Check required properties exist
  const required = ['Item', 'Source URL', 'Status', 'Source', 'Type'];
  const missing = required.filter(r => !schema.properties[r]);
  
  if (missing.length > 0) {
    console.log('\n⚠️  Missing expected properties:');
    missing.forEach(m => console.log(`   - ${m}`));
  } else {
    console.log('\n✅ All expected properties found');
  }
}

async function extractSingleVideo(videoUrl: string, syncToNotion: boolean, databaseId: string) {
  console.log('\n📺 Extracting single video transcript...\n');
  console.log(`URL: ${videoUrl}`);

  // Create Steel session with auth context for browser-based extraction
  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY! });
  const sessionContext = loadSessionContext();
  console.log('\n🚀 Creating Steel session...');

  const session = await client.sessions.create({
    timeout: 5 * 60 * 1000,
    solveCaptcha: true,
    ...(sessionContext ? { sessionContext } : {}),
  });

  console.log(`✅ Session: ${session.id}`);
  console.log(`🖥️  Live View: ${(session as { sessionViewerUrl?: string }).sessionViewerUrl}`);

  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  try {
    const transcriptResult = await extractTranscript(videoUrl, page);

    if (transcriptResult) {
      console.log(`\n✅ Transcript extracted via Steel browser`);
      console.log(`   Length: ${transcriptResult.transcript.length} characters`);
      console.log(`   Segments: ${transcriptResult.segments.length}`);

      // Save transcript
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      const videoId = videoUrl.match(/v=([a-zA-Z0-9_-]+)/)?.[1] || 'unknown';
      const filename = `${OUTPUT_DIR}/${videoId}_transcript.txt`;
      fs.writeFileSync(filename, transcriptResult.transcript);
      console.log(`   Saved to: ${filename}`);

      // Get video title from browser
      const title = await page.evaluate(() => {
        const el = document.querySelector('#title h1 yt-formatted-string') ||
                   document.querySelector('meta[property="og:title"]');
        return el?.textContent?.trim() || el?.getAttribute('content') || 'Untitled';
      });

      // Sync to Notion if requested
      if (syncToNotion) {
        console.log('\n🔗 Syncing to Notion...');
        
        const video: VideoData = {
          videoId: videoUrl.match(/v=([a-zA-Z0-9_-]+)/)?.[1] || '',
          url: videoUrl,
          title,
          transcript: transcriptResult.transcript,
          transcriptSegments: transcriptResult.segments,
          scrapedAt: new Date().toISOString(),
          extractionMethod: 'steel'
        };

        const notionClient = new YouTubeNotionClient({
          defaultDatabaseId: databaseId,
          propertyMapping: NOTION_PROPERTY_MAPPING,
          selectDefaults: NOTION_SELECT_DEFAULTS
        });

        const result = await notionClient.syncVideo(video);

        if (result.success) {
          console.log(`✅ Synced to Notion: ${result.pageUrl}`);
        } else {
          console.log(`❌ Sync failed: ${result.error}`);
        }
      }
    } else {
      console.log('\n❌ Could not extract transcript');
      console.log('   Video may not have captions available');
    }
  } finally {
    console.log('\n🔓 Releasing session...');
    await client.sessions.release(session.id);
  }
}

async function extractPlaylistVideos(
  playlistUrl: string,
  limit: number,
  syncToNotion: boolean,
  databaseId: string
) {
  console.log('\n📺 Half Dozen YouTube Playlist Sync\n');
  console.log('=' .repeat(60));

  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    console.error('❌ Invalid playlist URL');
    return;
  }

  console.log(`📋 Playlist ID: ${playlistId}`);
  console.log(`📊 Limit: ${limit === Infinity ? 'all' : limit}`);
  if (syncToNotion) {
    console.log(`🔗 Notion sync: enabled (database: ${databaseId.substring(0, 8)}...)`);
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Initialize Steel client with auth context
  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY! });
  const sessionContext = loadSessionContext();

  console.log('\n🚀 Creating Steel session...');
  
  const session = await client.sessions.create({
    timeout: 30 * 60 * 1000,
    solveCaptcha: true,
    ...(sessionContext ? { sessionContext } : {}),
  });

  console.log(`✅ Session created: ${session.id}`);
  console.log(`🖥️  Live View: ${(session as { sessionViewerUrl?: string }).sessionViewerUrl}`);

  // Connect via Puppeteer
  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  const extractedVideos: VideoData[] = [];

  try {
    // Extract playlist
    console.log('\n📂 Extracting playlist...');
    const playlist = await extractPlaylist(page, playlistUrl, limit);
    
    console.log(`\n📋 Playlist: ${playlist.title}`);
    console.log(`   Channel: ${playlist.channelName}`);
    console.log(`   Videos: ${playlist.videos.length} (of ${playlist.videoCount} total)`);

    // Extract each video
    for (let i = 0; i < playlist.videos.length; i++) {
      const video = playlist.videos[i];
      console.log(`\n--- Video ${i + 1}/${playlist.videos.length} ---`);
      console.log(`📍 ${video.title}`);

      try {
        // Browser-first transcript extraction (server-side APIs blocked as of 2026)
        console.log(`   Extracting via Steel browser...`);
        const transcriptResult = await extractTranscript(video.url, page);

        const videoData: VideoData = {
          videoId: video.videoId,
          url: video.url,
          title: video.title,
          channelName: video.channelName || playlist.channelName,
          duration: video.duration,
          thumbnailUrl: video.thumbnailUrl,
          transcript: transcriptResult?.transcript,
          transcriptSegments: transcriptResult?.segments,
          scrapedAt: new Date().toISOString(),
          extractionMethod: 'steel',
          playlistId: playlist.playlistId,
          playlistTitle: playlist.title
        };

        if (videoData.transcript) {
          console.log(`   ✅ Transcript: ${videoData.transcript.length} chars`);
          
          // Save individual transcript
          const safeTitle = video.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
          const filename = `${OUTPUT_DIR}/${safeTitle}_transcript.txt`;
          fs.writeFileSync(filename, videoData.transcript);
        } else {
          console.log(`   ⚠️  No transcript available`);
        }

        extractedVideos.push(videoData);

        // Rate limiting
        await sleep(500);

      } catch (error) {
        console.error(`   ❌ Error: ${(error as Error).message}`);
        extractedVideos.push({
          videoId: video.videoId,
          url: video.url,
          title: video.title,
          scrapedAt: new Date().toISOString(),
          extractionMethod: 'steel'
        });
      }
    }

    // Save all extracted data
    const outputFile = `${OUTPUT_DIR}/batch-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify({
      playlist: {
        id: playlist.playlistId,
        title: playlist.title,
        url: playlist.url,
        channelName: playlist.channelName,
        videoCount: playlist.videoCount
      },
      videos: extractedVideos,
      extractedAt: new Date().toISOString()
    }, null, 2));
    console.log(`\n📁 Data saved to: ${outputFile}`);

    // Extraction summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total videos: ${extractedVideos.length}`);
    console.log(`With transcript: ${extractedVideos.filter(v => v.transcript).length}`);
    console.log(`Without transcript: ${extractedVideos.filter(v => !v.transcript).length}`);
    
    const totalChars = extractedVideos.reduce((sum, v) => sum + (v.transcript?.length || 0), 0);
    console.log(`Total transcript chars: ${totalChars.toLocaleString()}`);

    // Sync to Notion
    if (syncToNotion && extractedVideos.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('🔗 SYNCING TO NOTION');
      console.log('='.repeat(60));

      const videosToSync = extractedVideos.filter(v => v.transcript);

      if (videosToSync.length === 0) {
        console.log('⚠️  No videos with transcripts to sync');
      } else {
        console.log(`📤 Syncing ${videosToSync.length} videos...`);

        const notionClient = new YouTubeNotionClient({
          defaultDatabaseId: databaseId,
          propertyMapping: NOTION_PROPERTY_MAPPING,
          selectDefaults: NOTION_SELECT_DEFAULTS
        });

        const syncResult = await notionClient.syncVideos(videosToSync, {
          skipDuplicates: true
        });

        console.log('\n📊 NOTION SYNC SUMMARY');
        console.log(`   Total: ${syncResult.total}`);
        console.log(`   ✅ Synced: ${syncResult.successful}`);
        console.log(`   ⏭️  Skipped (duplicates): ${syncResult.skipped}`);
        console.log(`   ❌ Failed: ${syncResult.failed}`);

        if (syncResult.failed > 0) {
          console.log('\n   Failed videos:');
          syncResult.results.forEach((r, i) => {
            if (!r.success && !r.error?.includes('Skipped')) {
              console.log(`     - ${videosToSync[i]?.title}: ${r.error}`);
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

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = parseArgs();

  if (args.checkDb) {
    await checkDatabase(args.databaseId);
  } else if (args.playlistUrl) {
    await extractPlaylistVideos(args.playlistUrl, args.limit, args.syncToNotion, args.databaseId);
  } else if (args.videoUrl) {
    await extractSingleVideo(args.videoUrl, args.syncToNotion, args.databaseId);
  } else {
    printUsage();
  }
}

main().catch(console.error);
