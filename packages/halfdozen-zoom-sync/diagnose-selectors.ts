#!/usr/bin/env npx tsx
/**
 * Diagnose Zoom Clips DOM structure to find correct selectors
 * 
 * Usage: npx tsx diagnose-selectors.ts [clip-url]
 */
import 'dotenv/config';
import Steel from 'steel-sdk';
import puppeteer from 'puppeteer-core';
import * as fs from 'fs';

const SESSION_CONTEXT_FILE = 'session-context.json';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Default test URL
const DEFAULT_URL = 'https://zoom.us/clips/share/R_-DeCFnQge7c6-LvmsmrQ';

async function main() {
  const clipUrl = process.argv[2] || DEFAULT_URL;
  console.log('\n🔍 Diagnosing Zoom Clips DOM Structure\n');
  console.log('='.repeat(60));
  console.log(`📍 URL: ${clipUrl}\n`);

  // Load session context
  const sessionContext = JSON.parse(fs.readFileSync(SESSION_CONTEXT_FILE, 'utf-8'));
  console.log(`✅ Loaded session context with ${sessionContext.cookies.length} cookies`);

  const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY! });

  console.log('\n🚀 Creating Steel session...');
  const session = await client.sessions.create({
    timeout: 5 * 60 * 1000,
    sessionContext
  });

  console.log(`✅ Session: ${session.id}`);
  console.log(`🖥️  Live View: ${(session as any).sessionViewerUrl}\n`);

  const wsUrl = `wss://connect.steel.dev?apiKey=${process.env.STEEL_API_KEY}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  try {
    console.log('📂 Navigating to clip page...');
    await page.goto(clipUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    console.log('\n' + '='.repeat(60));
    console.log('📋 DOM ANALYSIS');
    console.log('='.repeat(60));

    // Comprehensive DOM analysis
    const analysis = await page.evaluate(() => {
      const results: Record<string, any> = {};

      // 1. TITLE CANDIDATES
      results.titles = {
        h1: document.querySelector('h1')?.textContent?.trim(),
        documentTitle: document.title,
        ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
        // Look for clip-specific title elements
        clipTitle: document.querySelector('[class*="clip-title"], [class*="ClipTitle"]')?.textContent?.trim(),
        detailTitle: document.querySelector('.detail-title, [class*="detail"] h1, [class*="detail"] [class*="title"]')?.textContent?.trim(),
        // Find the largest text element in the page
        allH1s: Array.from(document.querySelectorAll('h1')).map(el => ({
          text: el.textContent?.trim(),
          className: el.className
        })),
        allH2s: Array.from(document.querySelectorAll('h2')).map(el => ({
          text: el.textContent?.trim().substring(0, 100),
          className: el.className
        }))
      };

      // 2. DATE CANDIDATES  
      results.dates = {
        timeElements: Array.from(document.querySelectorAll('time')).map(el => ({
          text: el.textContent?.trim(),
          datetime: el.getAttribute('datetime'),
          className: el.className
        })),
        dateClasses: Array.from(document.querySelectorAll('[class*="date"], [class*="Date"], [class*="time"], [class*="Time"]')).map(el => ({
          text: el.textContent?.trim()?.substring(0, 50),
          className: el.className,
          tag: el.tagName
        })).slice(0, 10),
        relativeTime: Array.from(document.querySelectorAll('[class*="ago"], [class*="created"]')).map(el => ({
          text: el.textContent?.trim(),
          className: el.className
        }))
      };

      // 3. TAB SYSTEM
      results.tabs = {
        zoomTabs: Array.from(document.querySelectorAll('.zoom-tabs__item')).map(el => ({
          text: el.textContent?.trim(),
          isActive: el.classList.contains('is-active'),
          ariaSelected: el.getAttribute('aria-selected')
        })),
        roleTabs: Array.from(document.querySelectorAll('[role="tab"]')).map(el => ({
          text: el.textContent?.trim(),
          isSelected: el.getAttribute('aria-selected'),
          className: el.className
        }))
      };

      // 4. TAB CONTENT AREAS
      results.tabContent = {
        tabPanels: Array.from(document.querySelectorAll('[role="tabpanel"], .zoom-tabs__content')).map((el, i) => ({
          index: i,
          id: el.id,
          className: el.className,
          textPreview: el.textContent?.trim()?.substring(0, 200)
        }))
      };

      // 5. TRANSCRIPT-SPECIFIC ELEMENTS
      results.transcript = {
        transcriptElements: Array.from(document.querySelectorAll('[class*="transcript"], [class*="Transcript"]')).map(el => ({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          textLength: el.textContent?.length || 0,
          textPreview: el.textContent?.trim()?.substring(0, 100)
        })),
        // Look for timestamped content
        timestampedText: (() => {
          const body = document.body.innerText;
          const matches = body.match(/\d{2}:\d{2}[^0-9]/g);
          return matches ? matches.slice(0, 10) : [];
        })(),
        // Look for segments
        segments: Array.from(document.querySelectorAll('[class*="segment"], [class*="cue"], [class*="caption-line"]')).length
      };

      // 6. SUMMARY SECTION
      results.summary = {
        summaryText: document.querySelector('.summary-text')?.textContent?.trim()?.substring(0, 200),
        summaryContainer: document.querySelector('.summary-text')?.parentElement?.className
      };

      // 7. METADATA SECTION
      results.metadata = {
        speaker: (() => {
          const candidates = ['[class*="owner"]', '[class*="host"]', '[class*="speaker"]', '[class*="author"]', '[class*="user-name"]'];
          for (const sel of candidates) {
            const el = document.querySelector(sel);
            if (el) return { selector: sel, text: el.textContent?.trim() };
          }
          return null;
        })(),
        views: document.querySelector('[class*="play"], [class*="view"]')?.textContent?.trim(),
        duration: document.querySelector('[class*="duration"]')?.textContent?.trim()
      };

      // 8. SIDEBAR/DETAIL AREA
      results.sidebar = {
        detailSidebar: document.querySelector('.detail-sidebar')?.textContent?.trim()?.substring(0, 300),
        rightSide: Array.from(document.querySelectorAll('[class*="sidebar"], [class*="detail"]')).map(el => ({
          className: el.className,
          textLength: el.textContent?.length || 0
        })).slice(0, 5)
      };

      return results;
    });

    // Print analysis
    console.log('\n📝 TITLE CANDIDATES:');
    console.log(JSON.stringify(analysis.titles, null, 2));

    console.log('\n📅 DATE CANDIDATES:');
    console.log(JSON.stringify(analysis.dates, null, 2));

    console.log('\n🗂️ TAB SYSTEM:');
    console.log(JSON.stringify(analysis.tabs, null, 2));

    console.log('\n📄 TAB CONTENT:');
    console.log(JSON.stringify(analysis.tabContent, null, 2));

    console.log('\n📜 TRANSCRIPT ELEMENTS:');
    console.log(JSON.stringify(analysis.transcript, null, 2));

    console.log('\n💡 SUMMARY:');
    console.log(JSON.stringify(analysis.summary, null, 2));

    console.log('\n👤 METADATA:');
    console.log(JSON.stringify(analysis.metadata, null, 2));

    // Now click the Transcript tab and re-analyze
    console.log('\n' + '='.repeat(60));
    console.log('🖱️ CLICKING TRANSCRIPT TAB...');
    console.log('='.repeat(60));

    const clicked = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.zoom-tabs__item, [role="tab"]');
      for (const tab of tabs) {
        if (tab.textContent?.trim() === 'Transcript') {
          (tab as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    console.log(`Tab clicked: ${clicked}`);
    await sleep(3000);

    // Re-analyze after clicking
    const afterClick = await page.evaluate(() => {
      const results: Record<string, any> = {};

      // Check which tab is now active
      results.activeTab = (() => {
        const active = document.querySelector('.zoom-tabs__item.is-active, [role="tab"][aria-selected="true"]');
        return active?.textContent?.trim();
      })();

      // Get transcript content area
      results.transcriptContent = {
        // Look for active panel
        activePanel: document.querySelector('[role="tabpanel"]:not([hidden]), .zoom-tabs__content--active')?.textContent?.trim()?.substring(0, 500),
        // All visible text with timestamps
        timestampedContent: (() => {
          const body = document.body.innerText;
          const pattern = /(\d{2}:\d{2}[^\d]+)/g;
          const matches = body.match(pattern);
          return matches?.slice(0, 20) || [];
        })(),
        // Specific transcript container
        transcriptContainer: document.querySelector('[class*="transcript-content"], [class*="TranscriptContent"]')?.textContent?.trim()?.substring(0, 500),
        // Detail sidebar content
        detailContent: document.querySelector('.detail-sidebar')?.textContent?.trim()?.substring(0, 1000)
      };

      // Look for individual transcript segments/lines
      results.segments = Array.from(document.querySelectorAll('[class*="transcript"] [class*="item"], [class*="transcript"] li, [class*="transcript"] p, [class*="caption"]')).map(el => ({
        text: el.textContent?.trim()?.substring(0, 100),
        className: el.className
      })).slice(0, 10);

      return results;
    });

    console.log('\n✅ AFTER CLICKING TRANSCRIPT TAB:');
    console.log(`Active tab: ${afterClick.activeTab}`);
    console.log('\nTranscript content area:');
    console.log(JSON.stringify(afterClick.transcriptContent, null, 2));
    console.log('\nSegments found:');
    console.log(JSON.stringify(afterClick.segments, null, 2));

    // Save full analysis
    fs.writeFileSync('dom-analysis.json', JSON.stringify({ before: analysis, after: afterClick }, null, 2));
    console.log('\n📁 Full analysis saved to: dom-analysis.json');

  } finally {
    console.log('\n🔓 Releasing session...');
    await client.sessions.release(session.id);
    console.log('✅ Done!');
  }
}

main().catch(console.error);
