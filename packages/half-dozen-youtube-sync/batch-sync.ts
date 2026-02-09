#!/usr/bin/env npx tsx
/**
 * Batch Sync YouTube Playlist to Notion
 * 
 * CLI tool that uses the same provider as the MCP server.
 * No duplicated Steel/Puppeteer logic — delegates to the provider.
 * 
 * Usage:
 *   npx tsx batch-sync.ts --playlist URL --sync          # Full workflow
 *   npx tsx batch-sync.ts --playlist URL --limit 5       # Extract first 5 videos
 *   npx tsx batch-sync.ts --video URL --sync             # Single video
 *   npx tsx batch-sync.ts --check-db                     # Verify Notion database
 */
import 'dotenv/config';
import * as fs from 'fs';
import { YouTubeNotionClient } from './src/notion/client.js';
import { getYouTubeProvider, resetProvider } from './src/providers/steel.js';
import { extractPlaylistId } from './src/youtube/playlist.js';
import type { VideoData } from './src/types.js';

// =============================================================================
// Configuration
// =============================================================================

const OUTPUT_DIR = 'extracted-videos';
const DEFAULT_DATABASE_ID = process.env.NOTION_DATABASE_ID || '27a019187ac580b797fec563c98afbbc';

const NOTION_PROPERTY_MAPPING = {
  title: 'Item',
  url: 'Source URL',
  date: 'Date',
  status: 'Status',
  source: 'Source',
  type: 'Type'
};

const NOTION_SELECT_DEFAULTS = {
  status: 'Active',
  source: 'Internal',
  type: 'Video'
};

// =============================================================================
// Helpers
// =============================================================================

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
      playlistUrl = args[i + 1]; i++;
    } else if ((args[i] === '--video' || args[i] === '-v') && args[i + 1]) {
      videoUrl = args[i + 1]; i++;
    } else if ((args[i] === '--limit' || args[i] === '-l') && args[i + 1]) {
      limit = parseInt(args[i + 1], 10); i++;
    } else if (args[i] === '--sync' || args[i] === '-s') {
      syncToNotion = true;
    } else if ((args[i] === '--database' || args[i] === '-d') && args[i + 1]) {
      databaseId = args[i + 1]; i++;
    } else if (args[i] === '--check-db') {
      checkDb = true;
    }
  }

  return { playlistUrl, videoUrl, limit, syncToNotion, databaseId, checkDb };
}

function printUsage() {
  console.log(`
  Half Dozen YouTube Sync

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
`);
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

// =============================================================================
// Commands
// =============================================================================

async function checkDatabase(databaseId: string) {
  console.log('\n  Checking Notion database connection...\n');

  const notionClient = new YouTubeNotionClient({
    defaultDatabaseId: databaseId,
    propertyMapping: NOTION_PROPERTY_MAPPING,
    selectDefaults: NOTION_SELECT_DEFAULTS
  });

  const schema = await notionClient.getDatabaseSchema(databaseId);

  if (!schema) {
    console.error('  Could not connect to database');
    console.error('  Check your NOTION_API_KEY and database ID');
    return;
  }

  console.log(`  Connected to: ${schema.title}`);
  console.log(`  ID: ${schema.id}\n`);
  
  for (const [name, prop] of Object.entries(schema.properties)) {
    console.log(`    ${name} (${prop.type})`);
  }

  const required = ['Item', 'Source URL', 'Status', 'Source', 'Type'];
  const missing = required.filter(r => !schema.properties[r]);
  
  if (missing.length > 0) {
    console.log(`\n  Missing: ${missing.join(', ')}`);
  } else {
    console.log('\n  All required properties found');
  }
}

async function extractSingleVideo(videoUrl: string, syncToNotion: boolean, databaseId: string) {
  console.log(`\n  Extracting: ${videoUrl}\n`);

  const provider = getYouTubeProvider();
  const session = await provider.createSession(videoUrl);

  console.log(`  Session: ${session.id}`);
  console.log(`  Live View: ${session.liveViewUrl}\n`);

  try {
    const video = await provider.extractVideo(session.id, videoUrl);

    if (video.transcript) {
      console.log(`  Transcript: ${video.transcript.length} chars, ${video.transcriptSegments?.length || 0} segments`);

      ensureOutputDir();
      const filename = `${OUTPUT_DIR}/${video.videoId}_transcript.txt`;
      fs.writeFileSync(filename, video.transcript);
      console.log(`  Saved to: ${filename}`);
    } else {
      console.log('  No transcript available');
    }

    if (syncToNotion) {
      console.log('\n  Syncing to Notion...');
      const notionClient = new YouTubeNotionClient({
        defaultDatabaseId: databaseId,
        propertyMapping: NOTION_PROPERTY_MAPPING,
        selectDefaults: NOTION_SELECT_DEFAULTS
      });

      const result = await notionClient.syncVideo(video);
      console.log(result.success ? `  Synced: ${result.pageUrl}` : `  Failed: ${result.error}`);
    }
  } finally {
    await provider.closeSession(session.id);
    console.log('  Session released.');
  }
}

async function extractPlaylistVideos(
  playlistUrl: string,
  limit: number,
  syncToNotion: boolean,
  databaseId: string
) {
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    console.error('  Invalid playlist URL');
    return;
  }

  console.log(`\n  Playlist: ${playlistId}`);
  console.log(`  Limit: ${limit === Infinity ? 'all' : limit}`);
  if (syncToNotion) console.log(`  Notion: ${databaseId.substring(0, 8)}...`);

  ensureOutputDir();

  const provider = getYouTubeProvider();
  const session = await provider.createSession(playlistUrl);

  console.log(`\n  Session: ${session.id}`);
  console.log(`  Live View: ${session.liveViewUrl}\n`);

  try {
    // Extract playlist + all transcripts (provider handles everything)
    const { playlist, videos, errors } = await provider.extractPlaylistVideos(
      session.id, playlistUrl, limit
    );

    console.log(`\n  ${playlist.title}`);
    console.log(`  ${videos.length} videos extracted, ${errors.length} errors`);

    // Save transcripts
    for (const v of videos) {
      if (v.transcript) {
        const safeTitle = v.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        fs.writeFileSync(`${OUTPUT_DIR}/${safeTitle}_transcript.txt`, v.transcript);
      }
    }

    // Save batch data
    const outputFile = `${OUTPUT_DIR}/batch-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify({
      playlist: { id: playlist.playlistId, title: playlist.title, url: playlist.url, videoCount: playlist.videoCount },
      videos,
      extractedAt: new Date().toISOString()
    }, null, 2));

    // Summary
    const withTranscript = videos.filter(v => v.transcript).length;
    console.log(`\n  ${'─'.repeat(40)}`);
    console.log(`  Total: ${videos.length}  Transcripts: ${withTranscript}  Errors: ${errors.length}`);
    console.log(`  Saved to: ${outputFile}`);

    // Sync to Notion
    if (syncToNotion && withTranscript > 0) {
      console.log(`\n  Syncing ${withTranscript} videos to Notion...`);

      const notionClient = new YouTubeNotionClient({
        defaultDatabaseId: databaseId,
        propertyMapping: NOTION_PROPERTY_MAPPING,
        selectDefaults: NOTION_SELECT_DEFAULTS
      });

      const syncResult = await notionClient.syncVideos(
        videos.filter(v => v.transcript),
        { skipDuplicates: true }
      );

      console.log(`  Synced: ${syncResult.successful}  Skipped: ${syncResult.skipped}  Failed: ${syncResult.failed}`);
    }
  } finally {
    await provider.closeSession(session.id);
    console.log('  Session released.');
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

  resetProvider();
}

main().catch(console.error);
