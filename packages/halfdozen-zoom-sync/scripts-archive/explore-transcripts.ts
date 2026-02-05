#!/usr/bin/env npx tsx
/**
 * Actively explore the Zoom Clips UI to discover transcript locations.
 */

import 'dotenv/config';
import puppeteer, { type Page } from 'puppeteer-core';
import * as fs from 'fs';

const SESSION_ID = 'c1f7c96c-20e5-425f-99a5-2342c60d88af';

interface Discovery {
  timestamp: string;
  action: string;
  url: string;
  findings: string[];
  selectors: string[];
  screenshot?: string;
}

const discoveries: Discovery[] = [];

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function discoverUI(page: Page): Promise<Discovery> {
  const url = page.url();
  const findings: string[] = [];
  const selectors: string[] = [];
  
  // Analyze current page
  const analysis = await page.evaluate(() => {
    const result: any = {
      pageTitle: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      // Look for transcript-related elements
      transcriptElements: [],
      tabElements: [],
      buttonElements: [],
      allTextContent: ''
    };
    
    // Find anything transcript-related
    const transcriptKeywords = ['transcript', 'caption', 'subtitle', 'text', 'cc'];
    
    // Check all elements for transcript keywords
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.toLowerCase() || '';
      const className = el.className?.toString?.()?.toLowerCase() || '';
      const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
      const id = el.id?.toLowerCase() || '';
      
      transcriptKeywords.forEach(keyword => {
        if (className.includes(keyword) || ariaLabel.includes(keyword) || id.includes(keyword)) {
          result.transcriptElements.push({
            tag: el.tagName,
            class: el.className?.toString?.()?.slice(0, 100),
            id: el.id,
            ariaLabel: el.getAttribute('aria-label'),
            text: el.textContent?.slice(0, 100)
          });
        }
      });
    });
    
    // Find tabs
    document.querySelectorAll('[role="tab"], [class*="tab"]').forEach(el => {
      result.tabElements.push({
        text: el.textContent?.trim(),
        ariaLabel: el.getAttribute('aria-label'),
        class: el.className?.toString?.()?.slice(0, 100)
      });
    });
    
    // Find buttons
    document.querySelectorAll('button, [role="button"]').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 50) {
        result.buttonElements.push({
          text,
          ariaLabel: el.getAttribute('aria-label'),
          class: el.className?.toString?.()?.slice(0, 100)
        });
      }
    });
    
    return result;
  });
  
  findings.push(`Page: ${analysis.pageTitle}`);
  if (analysis.h1) findings.push(`H1: ${analysis.h1}`);
  
  if (analysis.transcriptElements.length > 0) {
    findings.push(`Found ${analysis.transcriptElements.length} transcript-related elements!`);
    analysis.transcriptElements.forEach((el: any) => {
      selectors.push(`${el.tag}#${el.id || ''}.${el.class?.split(' ')[0] || ''}`);
      findings.push(`  - ${el.tag}: ${el.text?.slice(0, 50)}`);
    });
  }
  
  if (analysis.tabElements.length > 0) {
    findings.push(`Tabs found: ${analysis.tabElements.map((t: any) => t.text).join(', ')}`);
  }
  
  const interestingButtons = analysis.buttonElements.filter((b: any) => 
    b.text?.toLowerCase().includes('transcript') ||
    b.text?.toLowerCase().includes('caption') ||
    b.text?.toLowerCase().includes('download') ||
    b.ariaLabel?.toLowerCase().includes('transcript')
  );
  
  if (interestingButtons.length > 0) {
    findings.push(`Interesting buttons: ${interestingButtons.map((b: any) => b.text || b.ariaLabel).join(', ')}`);
  }
  
  return {
    timestamp: new Date().toISOString(),
    action: 'analyze',
    url,
    findings,
    selectors
  };
}

async function main() {
  console.log('\n🔍 Exploring Zoom Clips UI for Transcripts\n');
  console.log('=' .repeat(60));
  
  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${SESSION_ID}`;
  
  console.log('Connecting to session...');
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const pages = await browser.pages();
  const page = pages[pages.length - 1];
  
  console.log(`Current URL: ${page.url()}\n`);
  
  // Step 1: Analyze current page (clips library)
  console.log('--- Step 1: Analyzing clips library ---\n');
  let discovery = await discoverUI(page);
  discoveries.push(discovery);
  discovery.findings.forEach(f => console.log(f));
  
  // Step 2: Find and list all clip links
  console.log('\n--- Step 2: Finding clip links ---\n');
  const clipLinks = await page.evaluate(() => {
    const links: any[] = [];
    document.querySelectorAll('a[href*="/clips/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && !href.includes('/mine') && !href.includes('/library') && !href.includes('/shared')) {
        links.push({
          href,
          text: a.textContent?.trim()?.slice(0, 50)
        });
      }
    });
    // Dedupe
    return links.filter((l, i, arr) => arr.findIndex(x => x.href === l.href) === i).slice(0, 5);
  });
  
  console.log(`Found ${clipLinks.length} clip links`);
  clipLinks.forEach((l, i) => console.log(`  ${i + 1}. ${l.text || 'Untitled'}: ${l.href}`));
  
  // Step 3: Navigate to first clip
  if (clipLinks.length > 0) {
    console.log('\n--- Step 3: Navigating to first clip ---\n');
    const firstClip = clipLinks[0];
    const clipUrl = firstClip.href.startsWith('http') ? firstClip.href : `https://zoom.us${firstClip.href}`;
    
    console.log(`Going to: ${clipUrl}`);
    await page.goto(clipUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3000);
    
    discovery = await discoverUI(page);
    discoveries.push(discovery);
    console.log('\nPage analysis:');
    discovery.findings.forEach(f => console.log(f));
    
    // Step 4: Look for transcript tab and click it
    console.log('\n--- Step 4: Looking for transcript tab ---\n');
    
    const transcriptTab = await page.evaluate(() => {
      // Look for transcript tab
      const tabs = document.querySelectorAll('[role="tab"], button, [class*="tab"]');
      for (const tab of tabs) {
        const text = tab.textContent?.toLowerCase() || '';
        const label = tab.getAttribute('aria-label')?.toLowerCase() || '';
        if (text.includes('transcript') || label.includes('transcript')) {
          return {
            found: true,
            text: tab.textContent?.trim(),
            selector: tab.className?.toString?.()
          };
        }
      }
      return { found: false };
    });
    
    if (transcriptTab.found) {
      console.log(`✅ Found transcript tab: "${transcriptTab.text}"`);
      console.log('Clicking it...');
      
      await page.evaluate(() => {
        const tabs = document.querySelectorAll('[role="tab"], button, [class*="tab"]');
        for (const tab of tabs) {
          const text = tab.textContent?.toLowerCase() || '';
          if (text.includes('transcript')) {
            (tab as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      
      await sleep(2000);
      
      // Analyze after clicking
      discovery = await discoverUI(page);
      discoveries.push({ ...discovery, action: 'clicked_transcript_tab' });
      console.log('\nAfter clicking transcript tab:');
      discovery.findings.forEach(f => console.log(f));
      
      // Try to get transcript content
      const transcriptContent = await page.evaluate(() => {
        const containers = document.querySelectorAll('[class*="transcript"], [role="tabpanel"], [class*="panel"]');
        for (const c of containers) {
          const text = c.textContent?.trim();
          if (text && text.length > 100) {
            return { found: true, length: text.length, preview: text.slice(0, 500) };
          }
        }
        return { found: false };
      });
      
      if (transcriptContent.found) {
        console.log(`\n✅ TRANSCRIPT FOUND! ${transcriptContent.length} characters`);
        console.log('\nPreview:');
        console.log(transcriptContent.preview);
      }
    } else {
      console.log('❌ No transcript tab found');
      
      // Look for any visible transcript content
      console.log('\nLooking for transcript content anywhere on page...');
      
      const pageText = await page.evaluate(() => {
        // Get all text and look for transcript patterns
        const body = document.body.innerText;
        return body.slice(0, 5000);
      });
      
      console.log('\nPage text sample:');
      console.log(pageText.slice(0, 1000));
    }
    
    // Step 5: Check for download options
    console.log('\n--- Step 5: Looking for download options ---\n');
    
    const downloadOptions = await page.evaluate(() => {
      const options: any[] = [];
      document.querySelectorAll('a, button').forEach(el => {
        const text = (el.textContent || '').toLowerCase();
        const label = el.getAttribute('aria-label')?.toLowerCase() || '';
        if (text.includes('download') || label.includes('download') || 
            text.includes('export') || label.includes('export')) {
          options.push({
            tag: el.tagName,
            text: el.textContent?.trim(),
            href: el.getAttribute('href')
          });
        }
      });
      return options;
    });
    
    if (downloadOptions.length > 0) {
      console.log('Download options found:');
      downloadOptions.forEach(o => console.log(`  - ${o.text}`));
    } else {
      console.log('No download options found on page');
    }
  }
  
  // Save discoveries
  fs.writeFileSync('ui-discoveries.json', JSON.stringify(discoveries, null, 2));
  console.log('\n💾 Saved discoveries to ui-discoveries.json');
  
  console.log('\n✅ Exploration complete. Session still active.');
}

main().catch(console.error);
