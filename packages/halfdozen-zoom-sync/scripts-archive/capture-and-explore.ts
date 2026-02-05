#!/usr/bin/env npx tsx
/**
 * Capture session context and explore UI for transcripts.
 * Uses Steel's Session Context API for better auth persistence.
 */

import 'dotenv/config';
import Steel from 'steel-sdk';
import puppeteer, { type Page } from 'puppeteer-core';
import * as fs from 'fs';

const SESSION_ID = 'c1f7c96c-20e5-425f-99a5-2342c60d88af';

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('\n🔐 Capturing Session Context & Exploring UI\n');
  console.log('=' .repeat(60));
  
  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY! });
  
  // Step 1: Capture session context for future use
  console.log('📸 Capturing session context...');
  try {
    const sessionContext = await client.sessions.context(SESSION_ID);
    fs.writeFileSync('session-context.json', JSON.stringify(sessionContext, null, 2));
    console.log('✅ Session context saved to session-context.json');
    console.log(`   (Use this instead of cookies for future sessions)\n`);
  } catch (e) {
    console.log('⚠️  Could not capture context:', (e as Error).message);
  }
  
  // Step 2: Connect to session
  console.log('🔗 Connecting to session...');
  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${SESSION_ID}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const pages = await browser.pages();
  const page = pages[pages.length - 1];
  
  console.log(`Current URL: ${page.url()}\n`);
  
  // Step 3: Go to clips library if not there
  if (!page.url().includes('/clips/')) {
    console.log('Navigating to clips library...');
    await page.goto('https://zoom.us/clips/mine', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2000);
  }
  
  // Step 4: Find all clips
  console.log('--- Finding Clips ---\n');
  const clipLinks = await page.evaluate(() => {
    const links: any[] = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent?.trim() || '';
      // Look for clip detail links
      if (href.includes('/clips/') && !href.includes('/mine') && !href.includes('/library') && !href.includes('/shared')) {
        if (!links.some(l => l.href === href)) {
          links.push({ href, text: text.slice(0, 60) });
        }
      }
    });
    return links.slice(0, 10);
  });
  
  console.log(`Found ${clipLinks.length} clips:`);
  clipLinks.forEach((l, i) => console.log(`  ${i + 1}. ${l.text || 'Untitled'}`));
  
  if (clipLinks.length === 0) {
    console.log('\nNo clips found. Let me check the page structure...');
    const pageContent = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    console.log('\nPage content preview:');
    console.log(pageContent);
    return;
  }
  
  // Step 5: Navigate to first clip and explore
  console.log('\n--- Exploring First Clip ---\n');
  const firstClip = clipLinks[0];
  const clipUrl = firstClip.href.startsWith('http') ? firstClip.href : `https://zoom.us${firstClip.href}`;
  
  console.log(`Going to: ${clipUrl}`);
  await page.goto(clipUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);
  
  // Step 6: Analyze the clip page thoroughly
  console.log('\n--- Page Analysis ---\n');
  
  const analysis = await page.evaluate(() => {
    const result: any = {
      title: document.querySelector('h1')?.textContent?.trim(),
      url: window.location.href,
      tabs: [],
      buttons: [],
      transcriptElements: [],
      downloadLinks: [],
      allText: ''
    };
    
    // Find all tabs
    document.querySelectorAll('[role="tab"], [class*="tab"], button').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 30) {
        result.tabs.push({
          text,
          class: el.className?.toString?.()?.slice(0, 50),
          ariaSelected: el.getAttribute('aria-selected')
        });
      }
    });
    
    // Find transcript-related elements
    const keywords = ['transcript', 'caption', 'subtitle', 'cc', 'text'];
    document.querySelectorAll('*').forEach(el => {
      const className = (el.className?.toString?.() || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      
      keywords.forEach(kw => {
        if (className.includes(kw) || id.includes(kw) || ariaLabel.includes(kw)) {
          result.transcriptElements.push({
            tag: el.tagName,
            class: el.className?.toString?.()?.slice(0, 80),
            id: el.id,
            ariaLabel: el.getAttribute('aria-label'),
            textLength: el.textContent?.length || 0,
            textPreview: el.textContent?.trim()?.slice(0, 100)
          });
        }
      });
    });
    
    // Find download links
    document.querySelectorAll('a, button').forEach(el => {
      const text = (el.textContent || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      if (text.includes('download') || text.includes('export') || 
          ariaLabel.includes('download') || ariaLabel.includes('export')) {
        result.downloadLinks.push({
          tag: el.tagName,
          text: el.textContent?.trim(),
          href: el.getAttribute('href')
        });
      }
    });
    
    return result;
  });
  
  console.log(`Title: ${analysis.title}`);
  console.log(`URL: ${analysis.url}`);
  
  console.log(`\nTabs found (${analysis.tabs.length}):`);
  analysis.tabs.slice(0, 10).forEach((t: any) => {
    console.log(`  - "${t.text}" ${t.ariaSelected === 'true' ? '(selected)' : ''}`);
  });
  
  console.log(`\nTranscript-related elements (${analysis.transcriptElements.length}):`);
  analysis.transcriptElements.slice(0, 10).forEach((t: any) => {
    console.log(`  - ${t.tag} #${t.id || ''} .${t.class?.split(' ')[0] || ''}`);
    console.log(`    aria-label: ${t.ariaLabel || 'none'}`);
    console.log(`    text length: ${t.textLength}, preview: "${t.textPreview || 'empty'}"`);
  });
  
  console.log(`\nDownload options (${analysis.downloadLinks.length}):`);
  analysis.downloadLinks.forEach((d: any) => console.log(`  - ${d.text}`));
  
  // Step 7: Try clicking on transcript tab if found
  const transcriptTab = analysis.tabs.find((t: any) => 
    t.text?.toLowerCase().includes('transcript')
  );
  
  if (transcriptTab) {
    console.log(`\n--- Clicking Transcript Tab: "${transcriptTab.text}" ---\n`);
    
    await page.evaluate((tabText: string) => {
      const tabs = document.querySelectorAll('[role="tab"], [class*="tab"], button');
      for (const tab of tabs) {
        if (tab.textContent?.trim().toLowerCase().includes('transcript')) {
          (tab as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, transcriptTab.text);
    
    await sleep(2000);
    
    // Check what appeared
    const afterClick = await page.evaluate(() => {
      // Look for transcript content
      const containers = document.querySelectorAll('[class*="transcript"], [role="tabpanel"], [class*="panel"]');
      const results: any[] = [];
      
      containers.forEach(c => {
        const text = c.textContent?.trim();
        if (text && text.length > 50) {
          results.push({
            class: c.className?.toString?.()?.slice(0, 80),
            textLength: text.length,
            preview: text.slice(0, 300)
          });
        }
      });
      
      return results;
    });
    
    if (afterClick.length > 0) {
      console.log('✅ TRANSCRIPT CONTENT FOUND!\n');
      afterClick.forEach((c: any, i: number) => {
        console.log(`Container ${i + 1}: ${c.textLength} characters`);
        console.log(`Class: ${c.class}`);
        console.log(`Preview:\n${c.preview}\n`);
      });
      
      // Extract full transcript
      const fullTranscript = await page.evaluate(() => {
        const containers = document.querySelectorAll('[class*="transcript"], [role="tabpanel"]');
        for (const c of containers) {
          const text = c.textContent?.trim();
          if (text && text.length > 100) {
            return text;
          }
        }
        return null;
      });
      
      if (fullTranscript) {
        fs.writeFileSync('extracted-transcript.txt', fullTranscript);
        console.log(`💾 Full transcript saved to extracted-transcript.txt (${fullTranscript.length} chars)`);
      }
    } else {
      console.log('❌ No transcript content appeared after clicking tab');
    }
  } else {
    console.log('\n⚠️  No transcript tab found. Looking for other ways to access transcripts...');
    
    // Check for three-dot menu or more options
    const moreOptions = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      const options: string[] = [];
      buttons.forEach(b => {
        const label = b.getAttribute('aria-label') || b.textContent?.trim() || '';
        if (label.toLowerCase().includes('more') || label.toLowerCase().includes('menu') || label === '...') {
          options.push(label);
        }
      });
      return options;
    });
    
    if (moreOptions.length > 0) {
      console.log(`Found menu buttons: ${moreOptions.join(', ')}`);
    }
  }
  
  // Save full analysis
  fs.writeFileSync('ui-analysis.json', JSON.stringify(analysis, null, 2));
  console.log('\n💾 Full analysis saved to ui-analysis.json');
  
  console.log('\n✅ Exploration complete. Session still active.');
  console.log(`\nLive View: https://app.steel.dev/sessions/${SESSION_ID}`);
}

main().catch(console.error);
