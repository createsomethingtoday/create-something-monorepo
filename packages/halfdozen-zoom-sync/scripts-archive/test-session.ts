#!/usr/bin/env npx ts-node
/**
 * Test script to create a Steel session for Zoom Clips extraction.
 * 
 * Usage:
 *   npx ts-node test-session.ts
 * 
 * This will:
 * 1. Create a Steel browser session
 * 2. Navigate to Zoom login page
 * 3. Output the Live View URL for human interaction
 * 4. Wait for you to log in and navigate to a clip
 * 5. Run UI diagnostics and extraction
 */

import 'dotenv/config';
import { getZoomClipsProvider } from './dist/providers/steel.js';
import { diagnoseUI, formatUIReport } from './dist/extractors/zoom-clip.js';
import * as readline from 'readline';

// Try zoom.com - different login flow
const ZOOM_COM_URL = 'https://www.zoom.com/';
const ZOOM_CLIPS_URL = 'https://zoom.us/clips/share/q5Gcj9YHRguEHYFA0PA_3Q';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n🚀 Starting Zoom Clips Test Session\n');
  console.log('=' .repeat(60));
  
  // Check for API key
  if (!process.env.STEEL_API_KEY) {
    console.error('❌ STEEL_API_KEY not found in environment');
    console.error('   Set it in .env file or export STEEL_API_KEY=...');
    process.exit(1);
  }
  
  console.log('✓ Steel API key found');
  
  try {
    const provider = getZoomClipsProvider();
    
    // Create session starting at zoom.com
    console.log('\n📡 Creating Steel browser session...');
    const session = await provider.createSession(ZOOM_COM_URL);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ SESSION CREATED');
    console.log('=' .repeat(60));
    console.log(`\n🔗 Live View URL:\n   ${session.liveViewUrl}\n`);
    console.log('📋 INSTRUCTIONS:');
    console.log('   1. Open the Live View URL in your browser');
    console.log('   2. Log in with your Zoom credentials');
    console.log('   3. Navigate to your Zoom Clip');
    console.log('   4. Expand the transcript if available');
    console.log('   5. Come back here and press Enter\n');
    console.log('=' .repeat(60));
    
    await prompt('\nPress Enter when you have logged in and are viewing the clip...');
    
    // Run UI diagnostics
    console.log('\n🔍 Running UI diagnostics...\n');
    
    const sessionData = await provider.getSession(session.id);
    if (!sessionData) {
      console.error('❌ Session not found');
      process.exit(1);
    }
    
    const currentUrl = sessionData.page.url();
    console.log(`Current URL: ${currentUrl}\n`);
    
    const report = await diagnoseUI(sessionData.page, currentUrl);
    console.log(formatUIReport(report));
    
    // Ask if they want to extract
    const doExtract = await prompt('\nExtract clip data? (y/n): ');
    
    if (doExtract.toLowerCase() === 'y') {
      console.log('\n📥 Extracting clip data...\n');
      
      provider.markSessionReady(session.id);
      const clip = await provider.extractClip(session.id);
      
      console.log('=' .repeat(60));
      console.log('EXTRACTED DATA');
      console.log('=' .repeat(60));
      console.log(`Title: ${clip.title}`);
      console.log(`Speaker: ${clip.speaker || 'Not found'}`);
      console.log(`Duration: ${clip.duration || 'Not found'}`);
      console.log(`Description: ${clip.description?.slice(0, 100) || 'Not found'}...`);
      console.log(`Transcript: ${clip.transcript ? `${clip.transcript.length} chars` : 'Not found'}`);
      console.log(`Video URL: ${clip.videoUrl ? 'Found' : 'Not found'}`);
      console.log(`Thumbnail: ${clip.thumbnailUrl ? 'Found' : 'Not found'}`);
      
      if (clip.transcript) {
        console.log('\n--- Transcript Preview (first 500 chars) ---');
        console.log(clip.transcript.slice(0, 500));
        console.log('...\n');
      }
    }
    
    // Close session
    console.log('\n🔒 Closing session...');
    const recording = await provider.closeSession(session.id);
    
    console.log(`\n✅ Session closed`);
    if (recording.recordingUrl) {
      console.log(`📹 Recording: ${recording.recordingUrl}`);
    }
    console.log(`⏱️  Duration: ${Math.round(recording.durationMs / 1000)}s`);
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
