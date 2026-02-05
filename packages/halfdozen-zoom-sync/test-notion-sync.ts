#!/usr/bin/env npx tsx
/**
 * Test Notion Integration
 * 
 * Tests syncing an extracted Zoom Clip transcript to Notion,
 * using the toggle block chunking algorithm for long transcripts.
 * 
 * Usage:
 *   npx tsx test-notion-sync.ts
 */
import 'dotenv/config';
import * as fs from 'fs';
import { ZoomClipsNotionClient, chunkTranscript } from './src/notion/client.js';
import type { ClipData } from './src/types.js';

// =============================================================================
// Configuration
// =============================================================================

// Database ID from URL: https://www.notion.so/halfdozen/27a019187ac580b797fec563c98afbbc
const DATABASE_ID = '27a019187ac580b797fec563c98afbbc';
const TRANSCRIPT_FILE = 'full-transcript.txt';

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('\n🔗 Test Notion Integration\n');
  console.log('=' .repeat(60));

  // Check environment
  if (!process.env.NOTION_API_KEY) {
    console.error('❌ NOTION_API_KEY not set in environment');
    console.log('   Set it in .env file or environment');
    process.exit(1);
  }

  // Load extracted transcript
  if (!fs.existsSync(TRANSCRIPT_FILE)) {
    console.error(`❌ Transcript file not found: ${TRANSCRIPT_FILE}`);
    console.log('   Run extract-transcript.ts first');
    process.exit(1);
  }

  const transcript = fs.readFileSync(TRANSCRIPT_FILE, 'utf-8');
  console.log(`📝 Loaded transcript: ${transcript.length} characters`);

  // Test chunking algorithm
  console.log('\n--- Testing Chunk Algorithm ---');
  const chunks = chunkTranscript(transcript, 1900);
  console.log(`📦 Split into ${chunks.length} chunks`);
  chunks.forEach((chunk, i) => {
    console.log(`   Chunk ${i + 1}: ${chunk.length} chars`);
  });

  // Create test ClipData
  // Using timestamp suffix to create unique URL for testing (remove for production)
  const testUrlSuffix = process.argv.includes('--new') ? `?test=${Date.now()}` : '';
  const clipData: ClipData = {
    url: `https://zoom.us/clips/share/R_-DeCFnQge7c6-LvmsmrQ${testUrlSuffix}`,
    title: 'Partnerships Workflow and Engagement Management System',
    description: 'I demonstrated the complete partnerships workflow from top to bottom. I explained how engagements connect partners to events and trigger automated task creation. I showed how data flows between internal databases and client-facing portals using access permissions based on engagement relationships.',
    speaker: 'Danny Morgan',
    duration: '13:42',
    createdAt: '4 hours ago',  // From Zoom UI - will be parsed to date
    transcript: transcript,
    scrapedAt: new Date().toISOString(),
    extractionMethod: 'steel'
  };
  
  if (testUrlSuffix) {
    console.log('🧪 Testing with unique URL suffix (--new flag)');
  }

  // Initialize Notion client with custom property mapping for this database
  // Database schema (from check-schema.ts):
  //   Item: title
  //   Source URL: url
  //   Owner: people (can't use - requires Notion user IDs)
  //   Attendees: rich_text (can use for speaker)
  //   Type: select
  //   Source: select (can't use for rich text)
  //   Status: select
  //   Date: date
  //   Created: created_time (auto)
  //   Weight: number
  //   Created By: created_by (auto)
  const propertyMapping = {
    title: 'Item',              // Title property
    url: 'Source URL',          // URL property for duplicate detection
    speaker: 'Attendees',       // Rich text - speaker name (closest match)
    date: 'Date',               // Date property - when clip was created
    status: 'Status',           // Select property
    source: 'Source',           // Select property
    type: 'Type',               // Select property
    // Explicitly disable properties that don't exist in this database
    description: undefined,     // No rich_text field - added to page body instead
    duration: undefined,        // No matching property
    thumbnailUrl: undefined,    // No matching property
    videoUrl: undefined,        // No matching property
    scrapedAt: undefined,       // Using 'date' instead
    transcript: undefined,      // Added to page body as toggle block
  };

  // Default values for select properties
  const selectDefaults = {
    status: 'Active',
    source: 'Zoom',
    type: 'Clip'
  };

  console.log('\n--- Syncing to Notion ---');
  const client = new ZoomClipsNotionClient({
    defaultDatabaseId: DATABASE_ID,
    propertyMapping: propertyMapping,  // Includes url: 'Source URL' for duplicate checking
    selectDefaults: selectDefaults     // Status: Active, Source: Zoom, Type: Clip
  });
  
  console.log(`   Using '${propertyMapping.url}' property for duplicate detection`);
  console.log(`   Select defaults: Status=${selectDefaults.status}, Source=${selectDefaults.source}, Type=${selectDefaults.type}`);

  // Check database schema
  console.log('📊 Checking database schema...');
  const schema = await client.getDatabaseSchema();
  if (schema) {
    console.log(`   Database: ${schema.title}`);
    console.log(`   Properties: ${Object.keys(schema.properties).join(', ')}`);
    console.log('\n   Property mapping:');
    console.log(`     title -> ${propertyMapping.title}`);
    console.log(`     url -> ${propertyMapping.url}`);
    console.log(`     description -> ${propertyMapping.description}`);
    console.log(`     speaker -> ${propertyMapping.speaker}`);
    console.log(`     transcript -> Page body (toggle block)`);
  } else {
    console.error('❌ Could not retrieve database schema');
    console.log('   Make sure the Notion integration has access to this database');
    process.exit(1);
  }

  // Check if clip already exists
  console.log('\n🔍 Checking if clip already exists...');
  const exists = await client.clipExists(clipData.url);
  if (exists) {
    console.log('⚠️  Clip already exists in database. Skipping to avoid duplicate.');
    console.log('   Delete the existing entry if you want to re-sync.');
    return;
  }

  // Sync the clip
  console.log('\n📤 Syncing clip to Notion...');
  const result = await client.syncClip(clipData, undefined, propertyMapping);

  if (result.success) {
    console.log('✅ Sync successful!');
    console.log(`   Page ID: ${result.pageId}`);
    console.log(`   Page URL: ${result.pageUrl}`);
    
    // Show what was created
    console.log('\n📋 Created in Notion:');
    console.log('   ├── Item (title): ' + clipData.title);
    console.log('   ├── Source URL: ' + clipData.url);
    console.log('   ├── Attendees (speaker): ' + clipData.speaker);
    console.log('   ├── Date: ' + clipData.createdAt + ' (parsed to today\'s date)');
    console.log('   ├── Status: ' + selectDefaults.status);
    console.log('   ├── Source: ' + selectDefaults.source);
    console.log('   ├── Type: ' + selectDefaults.type);
    console.log('   └── Transcript: ' + chunks.length + ' paragraphs in collapsible toggle');
  } else {
    console.error('❌ Sync failed:', result.error);
    
    // Common errors and fixes
    if (result.error?.includes('validation_error')) {
      console.log('\n💡 Possible fixes:');
      console.log('   - Check that the database has the expected properties (Name, URL, Description, etc.)');
      console.log('   - The integration may need different property names');
    }
    if (result.error?.includes('unauthorized')) {
      console.log('\n💡 Possible fixes:');
      console.log('   - Make sure the Notion integration is connected to the database');
      console.log('   - Go to Notion > Database > ... > Add connections > Select your integration');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete!');
}

main().catch(console.error);
