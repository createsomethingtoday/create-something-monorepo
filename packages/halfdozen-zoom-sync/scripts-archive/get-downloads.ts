#!/usr/bin/env npx tsx
/**
 * Try to access downloaded files from Steel session via CDP
 */

import 'dotenv/config';
import puppeteer from 'puppeteer-core';

const SESSION_ID = '68d9cbe3-f264-4052-aa4d-b95820cf7cfc';

async function main() {
  console.log('\n📂 Checking Steel Downloads\n');
  
  if (!process.env.STEEL_API_KEY) {
    console.error('❌ STEEL_API_KEY not found');
    process.exit(1);
  }

  try {
    const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${SESSION_ID}`;
    const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    
    const pages = await browser.pages();
    const page = pages[pages.length - 1];
    
    // Navigate to chrome://downloads
    console.log('Navigating to chrome://downloads...');
    
    try {
      await page.goto('chrome://downloads/', { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Extract download items
      const downloads = await page.evaluate(() => {
        // Chrome downloads page uses shadow DOM
        const manager = document.querySelector('downloads-manager');
        if (!manager || !manager.shadowRoot) return [];
        
        const items = manager.shadowRoot.querySelectorAll('downloads-item');
        return Array.from(items).map((item: any) => {
          const shadow = item.shadowRoot;
          if (!shadow) return null;
          
          const name = shadow.querySelector('#name')?.textContent;
          const url = shadow.querySelector('#url')?.textContent;
          const status = shadow.querySelector('#description')?.textContent;
          
          return { name, url, status };
        }).filter(Boolean);
      });
      
      console.log('\nDownloaded files:');
      if (downloads.length > 0) {
        downloads.forEach((d: any, i: number) => {
          console.log(`${i + 1}. ${d.name}`);
          console.log(`   Status: ${d.status}`);
        });
      } else {
        console.log('No downloads found or unable to access.');
      }
      
    } catch (e) {
      console.log('Cannot access chrome://downloads directly.');
      console.log('Trying alternative approach...\n');
      
      // Try file:// access to typical downloads folder
      try {
        await page.goto('file:///home/user/Downloads/', { waitUntil: 'networkidle2', timeout: 10000 });
        const content = await page.content();
        console.log('Downloads directory content:');
        console.log(content.slice(0, 2000));
      } catch (e2) {
        console.log('Cannot access downloads folder directly.');
      }
    }
    
    // Go back to Zoom
    await page.goto('https://zoom.us/clips/mine', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('\n✅ Returned to clips page.');
    
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  }
}

main();
