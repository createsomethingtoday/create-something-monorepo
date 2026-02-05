#!/usr/bin/env npx tsx
/**
 * Watch session and extract data from each clip page visited.
 * Records what you click on and extracts transcripts automatically.
 */

import 'dotenv/config';
import Steel from 'steel-sdk';
import puppeteer, { type Page } from 'puppeteer-core';
import * as fs from 'fs';
import * as readline from 'readline';

const COOKIES_FILE = './cookies.json';

interface ExtractedClip {
  url: string;
  title: string;
  description?: string;
  transcript?: string;
  duration?: string;
  speaker?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  extractedAt: string;
}

const extractedClips: ExtractedClip[] = [];
let lastUrl = '';

async function loadCookies(): Promise<any[]> {
  const raw = fs.readFileSync(COOKIES_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function injectCookies(page: Page, cookies: any[]): Promise<void> {
  const zoomCookies = cookies.filter(c => 
    c.domain?.includes('zoom.us') || c.domain?.includes('zoom.com')
  );
  
  for (const cookie of zoomCookies) {
    try {
      await page.setCookie({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expirationDate || cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite === 'no_restriction' ? 'None' : cookie.sameSite
      });
    } catch (e) {}
  }
}

async function extractClipData(page: Page): Promise<ExtractedClip | null> {
  const url = page.url();
  
  // Only extract from clip detail pages
  if (!url.includes('/clips/share/') && !url.match(/\/clips\/[a-zA-Z0-9_-]{10,}/)) {
    return null;
  }
  
  // Skip if we already extracted this URL
  if (extractedClips.some(c => c.url === url)) {
    return null;
  }
  
  console.log(`\n🎬 Extracting from: ${url}`);
  
  // Wait for page to settle
  await new Promise(r => setTimeout(r, 2000));
  
  const data = await page.evaluate(() => {
    const result: any = {
      title: null,
      description: null,
      transcript: null,
      duration: null,
      speaker: null,
      thumbnailUrl: null,
      videoUrl: null
    };
    
    // Title
    const h1 = document.querySelector('h1');
    if (h1) result.title = h1.textContent?.trim();
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (!result.title && ogTitle) result.title = ogTitle.getAttribute('content');
    
    // Description
    const metaDesc = document.querySelector('meta[property="og:description"], meta[name="description"]');
    if (metaDesc) result.description = metaDesc.getAttribute('content');
    
    // Thumbnail
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) result.thumbnailUrl = ogImage.getAttribute('content');
    
    // Video
    const video = document.querySelector('video');
    if (video) result.videoUrl = video.src || video.querySelector('source')?.src;
    
    // Duration
    const durationEl = document.querySelector('[class*="duration"]');
    if (durationEl) result.duration = durationEl.textContent?.trim();
    
    // Speaker
    const speakerEl = document.querySelector('[class*="owner"], [class*="host"], [class*="speaker"]');
    if (speakerEl) result.speaker = speakerEl.textContent?.trim();
    
    // Transcript - comprehensive search
    const transcriptSelectors = [
      '[class*="transcript"]',
      '[data-testid="transcript"]',
      '.transcript-container',
      '#transcript',
      '[class*="caption"]',
      '[role="tabpanel"]'
    ];
    
    for (const sel of transcriptSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > 50) {
        result.transcript = el.textContent.trim();
        break;
      }
    }
    
    return result;
  });
  
  const clip: ExtractedClip = {
    url,
    title: data.title || 'Untitled',
    description: data.description,
    transcript: data.transcript,
    duration: data.duration,
    speaker: data.speaker,
    thumbnailUrl: data.thumbnailUrl,
    videoUrl: data.videoUrl,
    extractedAt: new Date().toISOString()
  };
  
  return clip;
}

async function main() {
  console.log('\n👁️  Watch Mode - Recording Your Navigation\n');
  console.log('=' .repeat(60));
  console.log('I will automatically extract data from each clip you visit.');
  console.log('Navigate to your clips in the Live View.');
  console.log('Press Ctrl+C when done.\n');
  
  const cookies = await loadCookies();
  console.log(`✓ Loaded ${cookies.length} cookies`);
  
  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY! });
  
  console.log('📡 Creating session...');
  const session = await client.sessions.create({ timeout: 3600000 });
  
  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set up cookies
  await page.goto('https://zoom.us', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await injectCookies(page, cookies);
  
  // Go to clips library
  await page.goto('https://zoom.us/clips/mine', { waitUntil: 'networkidle2', timeout: 60000 });
  
  const liveViewUrl = (session as any).sessionViewerUrl || `https://app.steel.dev/sessions/${session.id}`;
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ SESSION READY');
  console.log('=' .repeat(60));
  console.log(`\n🔗 Live View: ${liveViewUrl}\n`);
  console.log('Navigate to clips - I\'ll extract automatically!\n');
  console.log('=' .repeat(60));
  
  // Poll for URL changes and extract
  const pollInterval = setInterval(async () => {
    try {
      const currentUrl = page.url();
      
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log(`📍 Navigated to: ${currentUrl}`);
        
        const clip = await extractClipData(page);
        if (clip) {
          extractedClips.push(clip);
          console.log(`   ✅ Extracted: "${clip.title}"`);
          console.log(`   📝 Transcript: ${clip.transcript ? `${clip.transcript.length} chars` : 'Not found'}`);
          console.log(`   📊 Total clips: ${extractedClips.length}`);
          
          // Save after each extraction
          fs.writeFileSync('extracted-clips.json', JSON.stringify(extractedClips, null, 2));
        }
      }
    } catch (e) {
      // Page might be navigating
    }
  }, 2000);
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Stopping...');
    clearInterval(pollInterval);
    
    console.log(`\n📊 EXTRACTION SUMMARY`);
    console.log('=' .repeat(60));
    console.log(`Total clips extracted: ${extractedClips.length}\n`);
    
    extractedClips.forEach((clip, i) => {
      console.log(`${i + 1}. ${clip.title}`);
      console.log(`   URL: ${clip.url}`);
      console.log(`   Transcript: ${clip.transcript ? `${clip.transcript.length} chars` : 'None'}`);
    });
    
    if (extractedClips.length > 0) {
      fs.writeFileSync('extracted-clips.json', JSON.stringify(extractedClips, null, 2));
      console.log(`\n💾 Saved to extracted-clips.json`);
    }
    
    await browser.close();
    await client.sessions.release(session.id);
    console.log('✅ Session closed.');
    process.exit(0);
  });
  
  // Keep alive
  await new Promise(() => {});
}

main().catch(console.error);
