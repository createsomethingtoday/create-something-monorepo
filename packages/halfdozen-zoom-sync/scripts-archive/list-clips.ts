#!/usr/bin/env npx tsx
/**
 * List clips from the library and extract from each
 */

import 'dotenv/config';
import puppeteer from 'puppeteer-core';
import * as fs from 'fs';

const SESSION_ID = '68d9cbe3-f264-4052-aa4d-b95820cf7cfc';

interface ClipInfo {
  title: string;
  url: string;
  duration?: string;
  date?: string;
}

interface ExtractedClip {
  url: string;
  title: string;
  description?: string;
  transcript?: string;
  duration?: string;
  speaker?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
}

async function main() {
  console.log('\n📋 Listing Zoom Clips\n');
  console.log('=' .repeat(60));
  
  if (!process.env.STEEL_API_KEY) {
    console.error('❌ STEEL_API_KEY not found');
    process.exit(1);
  }

  try {
    const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${SESSION_ID}`;
    const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    
    const pages = await browser.pages();
    const page = pages[pages.length - 1];
    
    // Make sure we're on the clips library
    const currentUrl = page.url();
    if (!currentUrl.includes('/clips/')) {
      console.log('Navigating to clips library...');
      await page.goto('https://zoom.us/clips/mine', { waitUntil: 'networkidle2', timeout: 30000 });
    }
    
    // Wait for clips to load
    await page.waitForSelector('a[href*="/clips/"]', { timeout: 10000 }).catch(() => {});
    
    // List all clip links
    const clips = await page.evaluate(() => {
      const clipLinks = Array.from(document.querySelectorAll('a[href*="/clips/"]'));
      
      return clipLinks
        .filter(a => {
          const href = a.getAttribute('href') || '';
          // Filter to actual clip detail pages, not navigation
          return href.includes('/clips/') && !href.includes('/mine') && !href.includes('/library');
        })
        .map(a => {
          const href = a.getAttribute('href') || '';
          const fullUrl = href.startsWith('http') ? href : `https://zoom.us${href}`;
          
          // Try to get title from the link or nearby elements
          let title = a.textContent?.trim() || '';
          if (!title || title.length < 3) {
            // Look for title in parent/sibling elements
            const parent = a.closest('[class*="clip"], [class*="item"], tr, li');
            if (parent) {
              const titleEl = parent.querySelector('[class*="title"], h3, h4, strong');
              if (titleEl) title = titleEl.textContent?.trim() || '';
            }
          }
          
          // Try to get duration
          let duration = '';
          const parent = a.closest('[class*="clip"], [class*="item"], tr, li');
          if (parent) {
            const durationEl = parent.querySelector('[class*="duration"], [class*="time"]');
            if (durationEl) duration = durationEl.textContent?.trim() || '';
          }
          
          return { title: title || 'Untitled', url: fullUrl, duration };
        })
        .filter((clip, index, self) => 
          // Remove duplicates by URL
          self.findIndex(c => c.url === clip.url) === index
        );
    });
    
    console.log(`\nFound ${clips.length} clips:\n`);
    
    clips.forEach((clip, i) => {
      console.log(`${i + 1}. ${clip.title}`);
      console.log(`   URL: ${clip.url}`);
      if (clip.duration) console.log(`   Duration: ${clip.duration}`);
      console.log('');
    });
    
    // Save clips list
    fs.writeFileSync('clips-list.json', JSON.stringify(clips, null, 2));
    console.log('Saved clips list to clips-list.json');
    
    // Ask which to extract
    if (clips.length > 0) {
      console.log('\n--- Extracting from first clip ---\n');
      
      const firstClip = clips[0];
      console.log(`Navigating to: ${firstClip.url}`);
      
      await page.goto(firstClip.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for content to load
      await new Promise(r => setTimeout(r, 3000));
      
      // Extract detailed data
      const extracted = await page.evaluate(() => {
        const data: any = {
          title: null,
          description: null,
          transcript: null,
          duration: null,
          speaker: null,
          thumbnailUrl: null,
          videoUrl: null
        };
        
        // Title - try multiple sources
        const h1 = document.querySelector('h1');
        if (h1) data.title = h1.textContent?.trim();
        
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (!data.title && ogTitle) data.title = ogTitle.getAttribute('content');
        
        // Description
        const metaDesc = document.querySelector('meta[property="og:description"], meta[name="description"]');
        if (metaDesc) data.description = metaDesc.getAttribute('content');
        
        // Thumbnail
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) data.thumbnailUrl = ogImage.getAttribute('content');
        
        // Video URL
        const video = document.querySelector('video');
        if (video) {
          data.videoUrl = video.src || video.querySelector('source')?.src;
        }
        
        // Duration
        const durationEl = document.querySelector('[class*="duration"]');
        if (durationEl) data.duration = durationEl.textContent?.trim();
        
        // Speaker/Owner
        const speakerEl = document.querySelector('[class*="owner"], [class*="host"], [class*="speaker"], [class*="author"]');
        if (speakerEl) data.speaker = speakerEl.textContent?.trim();
        
        // Transcript - try multiple approaches
        const transcriptSelectors = [
          '[class*="transcript"]',
          '[data-testid="transcript"]',
          '.transcript-container',
          '#transcript',
          '[role="tabpanel"]'
        ];
        
        for (const sel of transcriptSelectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.trim().length > 50) {
            data.transcript = el.textContent.trim();
            data.transcriptSource = sel;
            break;
          }
        }
        
        return data;
      });
      
      console.log('\nExtracted data:');
      console.log(`Title: ${extracted.title}`);
      console.log(`Description: ${extracted.description?.slice(0, 100)}...`);
      console.log(`Duration: ${extracted.duration}`);
      console.log(`Speaker: ${extracted.speaker}`);
      console.log(`Thumbnail: ${extracted.thumbnailUrl ? 'Found' : 'Not found'}`);
      console.log(`Video URL: ${extracted.videoUrl ? 'Found' : 'Not found'}`);
      console.log(`Transcript: ${extracted.transcript ? `${extracted.transcript.length} chars` : 'Not found'}`);
      
      if (extracted.transcript) {
        console.log('\n--- Transcript Preview ---');
        console.log(extracted.transcript.slice(0, 500) + '...');
      }
      
      // Save extracted data
      const output = { ...firstClip, ...extracted, extractedAt: new Date().toISOString() };
      fs.writeFileSync('extracted-clip.json', JSON.stringify(output, null, 2));
      console.log('\nSaved to extracted-clip.json');
    }
    
    console.log('\n✅ Done. Session still active.');
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  }
}

main();
