#!/usr/bin/env npx tsx
/**
 * Extract transcripts from an active Steel session.
 * Connects to existing session and extracts data.
 */

import 'dotenv/config';
import Steel from 'steel-sdk';
import puppeteer from 'puppeteer-core';

const SESSION_ID = '68d9cbe3-f264-4052-aa4d-b95820cf7cfc';

async function main() {
  console.log('\n📥 Extracting from Steel Session\n');
  console.log('=' .repeat(60));
  
  if (!process.env.STEEL_API_KEY) {
    console.error('❌ STEEL_API_KEY not found');
    process.exit(1);
  }

  try {
    // Connect to existing session
    const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${SESSION_ID}`;
    console.log('Connecting to session...');
    
    const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const pages = await browser.pages();
    
    console.log(`Found ${pages.length} page(s)\n`);
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const url = page.url();
      const title = await page.title();
      
      console.log(`\n--- Page ${i + 1} ---`);
      console.log(`Title: ${title}`);
      console.log(`URL: ${url}`);
      
      // Check if this is a clip page
      if (url.includes('/clips/')) {
        console.log('\n🎬 Clip page detected! Extracting...\n');
        
        // Try to extract transcript
        const data = await page.evaluate(() => {
          const result: any = {
            title: null,
            description: null,
            transcript: null,
            duration: null,
            speaker: null
          };
          
          // Title
          const h1 = document.querySelector('h1');
          if (h1) result.title = h1.textContent?.trim();
          
          // Description from meta
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) result.description = metaDesc.getAttribute('content');
          
          // Look for transcript content
          const transcriptSelectors = [
            '[class*="transcript"]',
            '[data-testid="transcript"]',
            '.transcript-container',
            '#transcript',
            '[class*="caption"]'
          ];
          
          for (const sel of transcriptSelectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent) {
              result.transcript = el.textContent.trim();
              result.transcriptSelector = sel;
              break;
            }
          }
          
          // Duration
          const durationEl = document.querySelector('[class*="duration"]');
          if (durationEl) result.duration = durationEl.textContent?.trim();
          
          // Speaker
          const speakerEl = document.querySelector('[class*="owner"], [class*="host"], [class*="speaker"]');
          if (speakerEl) result.speaker = speakerEl.textContent?.trim();
          
          return result;
        });
        
        console.log('Extracted data:');
        console.log(JSON.stringify(data, null, 2));
      }
    }
    
    // Check for downloads - Steel may expose download URLs
    console.log('\n--- Checking for downloads ---');
    
    // Try to find download links or recent activity
    const mainPage = pages[pages.length - 1];
    const downloads = await mainPage.evaluate(() => {
      // Look for any download links or transcript files
      const links = Array.from(document.querySelectorAll('a[download], a[href*="transcript"], a[href*="download"]'));
      return links.map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent?.trim()
      }));
    });
    
    if (downloads.length > 0) {
      console.log('Found download links:');
      downloads.forEach(d => console.log(`  - ${d.text}: ${d.href}`));
    } else {
      console.log('No download links found on current page.');
    }
    
    // Don't disconnect - leave session open
    console.log('\n✅ Extraction complete. Session still active.');
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  }
}

main();
