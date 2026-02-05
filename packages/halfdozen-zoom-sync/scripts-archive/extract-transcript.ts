#!/usr/bin/env npx tsx
/**
 * Extract transcript from Zoom Clips by clicking the Transcript tab
 * 
 * This script connects to an active Steel session and:
 * 1. Clicks on the Transcript tab
 * 2. Waits for content to load
 * 3. Extracts the full transcript text
 */
import 'dotenv/config';
import Steel from 'steel-sdk';
import puppeteer, { type Page } from 'puppeteer-core';
import * as fs from 'fs';

// Session ID from watch-session.ts
const SESSION_ID = 'c1f7c96c-20e5-425f-99a5-2342c60d88af';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function extractTranscript(page: Page): Promise<{ transcript: string; segments: any[] }> {
  return await page.evaluate(() => {
    const result = {
      transcript: '',
      segments: [] as any[]
    };
    
    // Try multiple approaches to find transcript content
    
    // 1. Look for transcript container
    const transcriptContainer = document.querySelector('.transcript-container, [class*="transcript"], [data-testid*="transcript"]');
    if (transcriptContainer) {
      result.transcript = transcriptContainer.textContent?.trim() || '';
    }
    
    // 2. Look for timestamped transcript segments
    const segmentElements = document.querySelectorAll('[class*="segment"], [class*="cue"], [class*="caption"]');
    segmentElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text) {
        const timestamp = el.querySelector('[class*="time"]')?.textContent?.trim();
        result.segments.push({
          timestamp: timestamp || null,
          text: text
        });
      }
    });
    
    // 3. Look for any visible text in the active tab panel
    const activePanel = document.querySelector('[role="tabpanel"]:not([hidden]), .tab-panel.active, .zoom-tabs__content');
    if (activePanel && !result.transcript) {
      result.transcript = activePanel.textContent?.trim() || '';
    }
    
    // 4. Fallback: Get all text from the sidebar/detail area
    const sidebar = document.querySelector('.clips-sidebar, .detail-panel, [class*="detail"]');
    if (sidebar && !result.transcript) {
      result.transcript = sidebar.textContent?.trim() || '';
    }
    
    return result;
  });
}

async function main() {
  console.log('\n📝 Extracting Transcript from Zoom Clip\n');
  console.log('=' .repeat(60));
  
  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY! });
  
  console.log('🔗 Connecting to session:', SESSION_ID);
  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${SESSION_ID}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  
  const pages = await browser.pages();
  const page = pages[pages.length - 1];
  
  const currentUrl = page.url();
  console.log('📍 Current URL:', currentUrl);
  
  // Step 1: Find and click the Transcript tab
  console.log('\n--- Step 1: Click Transcript Tab ---\n');
  
  const transcriptTabClicked = await page.evaluate(() => {
    // Find the Transcript tab by text content
    const tabs = document.querySelectorAll('.zoom-tabs__item, [role="tab"]');
    for (const tab of tabs) {
      if (tab.textContent?.trim() === 'Transcript') {
        (tab as HTMLElement).click();
        return true;
      }
    }
    return false;
  });
  
  if (transcriptTabClicked) {
    console.log('✅ Clicked Transcript tab');
    await sleep(2000); // Wait for content to load
  } else {
    console.log('❌ Could not find Transcript tab');
    
    // Let's see what tabs are available
    const availableTabs = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.zoom-tabs__item, [role="tab"]');
      return Array.from(tabs).map(t => ({
        text: t.textContent?.trim(),
        class: t.className,
        ariaSelected: t.getAttribute('aria-selected')
      }));
    });
    console.log('Available tabs:', JSON.stringify(availableTabs, null, 2));
  }
  
  // Step 2: Extract transcript content
  console.log('\n--- Step 2: Extract Transcript Content ---\n');
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'transcript-screenshot.png', fullPage: false });
  console.log('📸 Screenshot saved to transcript-screenshot.png');
  
  // Analyze the DOM for transcript content
  const domAnalysis = await page.evaluate(() => {
    const analysis = {
      activeTab: null as any,
      transcriptElements: [] as any[],
      allTextContent: '',
      htmlStructure: ''
    };
    
    // Find active tab
    const activeTab = document.querySelector('.zoom-tabs__item.is-active, [aria-selected="true"]');
    if (activeTab) {
      analysis.activeTab = {
        text: activeTab.textContent?.trim(),
        class: activeTab.className
      };
    }
    
    // Look for transcript-specific elements
    const possibleTranscript = document.querySelectorAll('[class*="transcript"], [class*="caption"], [class*="subtitle"], [class*="cue"]');
    possibleTranscript.forEach(el => {
      analysis.transcriptElements.push({
        tag: el.tagName,
        class: el.className,
        text: el.textContent?.substring(0, 200)
      });
    });
    
    // Get the content area of the sidebar
    const contentArea = document.querySelector('.clips-sidebar, .detail-sidebar, [class*="sidebar"] > div');
    if (contentArea) {
      analysis.allTextContent = contentArea.textContent?.trim() || '';
    }
    
    // Get HTML structure of the tabbed area
    const tabContent = document.querySelector('.zoom-tabs__content, [class*="tab-content"]');
    if (tabContent) {
      analysis.htmlStructure = tabContent.innerHTML.substring(0, 2000);
    }
    
    return analysis;
  });
  
  console.log('Active tab:', domAnalysis.activeTab);
  console.log('Transcript elements found:', domAnalysis.transcriptElements.length);
  
  // Try to extract the transcript
  const transcriptData = await extractTranscript(page);
  
  console.log('\n--- Transcript Content ---\n');
  if (transcriptData.transcript) {
    console.log('Length:', transcriptData.transcript.length, 'characters');
    console.log('\nPreview (first 500 chars):');
    console.log(transcriptData.transcript.substring(0, 500));
    
    // Save full transcript
    fs.writeFileSync('full-transcript.txt', transcriptData.transcript);
    console.log('\n✅ Full transcript saved to full-transcript.txt');
  } else {
    console.log('❌ No transcript content found');
    console.log('\nDOM content preview:');
    console.log(domAnalysis.allTextContent.substring(0, 1000));
  }
  
  // Save full analysis
  fs.writeFileSync('transcript-analysis.json', JSON.stringify({
    ...domAnalysis,
    extractedTranscript: transcriptData
  }, null, 2));
  console.log('📋 Analysis saved to transcript-analysis.json');
  
  // Get session info for user
  const session = await client.sessions.retrieve(SESSION_ID);
  console.log(`\n🖥️  Live View: ${(session as any).sessionViewerUrl}`);
  console.log('\n✅ Done! Browser still connected for manual inspection.');
  
  // Don't disconnect - let the session continue
}

main().catch(console.error);
