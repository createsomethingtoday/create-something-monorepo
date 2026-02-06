/**
 * Review Mode - Record a template review session
 * 
 * Enhanced teaching mode optimized for template reviewers:
 * - Auto-screenshots at each interaction
 * - Dwell time tracking (how long they spend on each panel)
 * - Structured review output (pages checked, SEO reviewed, etc.)
 * - Shareable session link for remote reviewers
 * 
 * Usage:
 *   npx tsx review-mode.ts <webflow-preview-url> [reviewer-name]
 *   
 * Output:
 *   - review-{timestamp}.json - Structured review data
 *   - screenshots/review-{timestamp}/ - Screenshots at each step
 */

import Steel from 'steel-sdk';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';

interface ReviewAction {
  timestamp: number;
  elapsed_ms: number;
  type: 'click' | 'keyboard' | 'panel_open' | 'page_view' | 'scroll';
  position?: { x: number; y: number };
  key?: string;
  panel?: string;
  page_viewed?: string;
  element: {
    selector: string;
    ariaLabel: string;
    text: string;
    dataAutomationId?: string;
  };
  screenshot?: string;
  dwell_time_ms?: number;
}

interface ReviewSession {
  template_url: string;
  template_name: string;
  reviewer: string;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  session_viewer_url: string;
  actions: ReviewAction[];
  summary: {
    panels_visited: string[];
    pages_reviewed: string[];
    total_clicks: number;
    total_time_ms: number;
    avg_dwell_time_ms: number;
  };
}

async function main() {
  const url = process.argv[2];
  const reviewer = process.argv[3] || 'anonymous';
  
  if (!url) {
    console.log('Usage: npx tsx review-mode.ts <webflow-preview-url> [reviewer-name]');
    console.log('');
    console.log('Example:');
    console.log('  npx tsx review-mode.ts "https://preview.webflow.com/preview/my-template?..." "John"');
    process.exit(1);
  }

  const apiKey = process.env.STEEL_API_KEY;
  if (!apiKey) {
    console.error('❌ STEEL_API_KEY required');
    process.exit(1);
  }

  // Extract template name from URL
  const templateName = url.match(/preview\/([^?]+)/)?.[1] || 'unknown';
  const timestamp = Date.now();
  const screenshotDir = `screenshots/review-${timestamp}`;
  
  // Create screenshot directory
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('🔍 TEMPLATE REVIEW MODE');
  console.log('=======================\n');
  console.log(`📋 Template: ${templateName}`);
  console.log(`👤 Reviewer: ${reviewer}`);
  console.log(`📁 Screenshots: ${screenshotDir}/\n`);

  const steel = new Steel({ steelAPIKey: apiKey });
  const session = await steel.sessions.create({ timeout: 900000 });
  
  console.log(`📍 Session: ${session.id}`);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`👁️  SHARE THIS LINK WITH THE REVIEWER:`);
  console.log(`   ${session.sessionViewerUrl}`);
  console.log(`${'='.repeat(60)}\n`);
  console.log('The reviewer can open this in any browser and interact normally.');
  console.log('All actions will be recorded automatically.\n');
  console.log('Press Ctrl+C to end the review session.\n');

  const wsUrl = `wss://connect.steel.dev?apiKey=${apiKey}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Loading template...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate('new Promise(r => setTimeout(r, 3000))');
  console.log('✅ Template loaded\n');

  // Take initial screenshot
  const initialScreenshot = `${screenshotDir}/00-initial.png`;
  await page.screenshot({ path: initialScreenshot, fullPage: false });
  console.log(`📸 Initial screenshot saved`);

  const reviewSession: ReviewSession = {
    template_url: url,
    template_name: templateName,
    reviewer,
    started_at: new Date().toISOString(),
    session_viewer_url: session.sessionViewerUrl,
    actions: [],
    summary: {
      panels_visited: [],
      pages_reviewed: [],
      total_clicks: 0,
      total_time_ms: 0,
      avg_dwell_time_ms: 0
    }
  };

  const startTime = Date.now();
  let lastActionTime = startTime;
  let lastPanel = '';
  let screenshotCount = 0;

  // Inject click recorder
  await page.evaluate(`
    window.__reviewClicks = [];
    
    document.addEventListener('click', (e) => {
      const el = e.target;
      window.__reviewClicks.push({
        timestamp: Date.now(),
        type: 'click',
        x: e.clientX,
        y: e.clientY,
        element: {
          selector: el.id ? '#' + el.id : el.tagName.toLowerCase(),
          ariaLabel: el.getAttribute('aria-label') || '',
          text: (el.textContent || '').trim().slice(0, 100),
          dataAutomationId: el.getAttribute('data-automation-id') || ''
        }
      });
    }, true);
    
    document.addEventListener('keydown', (e) => {
      if (e.key.length === 1 || e.key === 'Escape' || e.key === 'Enter') {
        window.__reviewClicks.push({
          timestamp: Date.now(),
          type: 'keyboard',
          key: e.key,
          modifiers: {
            shift: e.shiftKey,
            meta: e.metaKey,
            ctrl: e.ctrlKey
          }
        });
      }
    }, true);
  `);

  // Poll for actions
  const pollInterval = setInterval(async () => {
    try {
      const clicks = await page.evaluate('window.__reviewClicks.splice(0)') as any[];
      
      for (const click of clicks) {
        const now = Date.now();
        const elapsed = now - startTime;
        const dwellTime = now - lastActionTime;
        lastActionTime = now;
        
        // Detect current panel
        const currentPanel = await page.evaluate(`
          (function() {
            const headers = [];
            document.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="header"]').forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.left > 30 && rect.left < 400 && rect.width > 20 && rect.height > 0) {
                const text = el.textContent?.trim();
                if (text && text.length < 50) headers.push(text);
              }
            });
            return headers[0] || '';
          })()
        `) as string;

        const action: ReviewAction = {
          timestamp: click.timestamp,
          elapsed_ms: elapsed,
          type: click.type,
          position: click.x !== undefined ? { x: click.x, y: click.y } : undefined,
          key: click.key,
          panel: currentPanel || undefined,
          element: click.element || { selector: '', ariaLabel: '', text: '' },
          dwell_time_ms: dwellTime
        };

        // Track panels visited
        if (currentPanel && currentPanel !== lastPanel) {
          if (!reviewSession.summary.panels_visited.includes(currentPanel)) {
            reviewSession.summary.panels_visited.push(currentPanel);
          }
          lastPanel = currentPanel;
          
          // Take screenshot when panel changes
          screenshotCount++;
          const screenshotPath = `${screenshotDir}/${String(screenshotCount).padStart(2, '0')}-${currentPanel.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: false });
          action.screenshot = screenshotPath;
        }

        // Track pages reviewed (from SEO inputs)
        if (click.element?.dataAutomationId?.includes('PageSettingsForm')) {
          const pageMatch = click.element.dataAutomationId.match(/PageSettingsForm-([^-]+)-/);
          if (pageMatch && !reviewSession.summary.pages_reviewed.includes(pageMatch[1])) {
            reviewSession.summary.pages_reviewed.push(pageMatch[1]);
          }
        }

        reviewSession.actions.push(action);
        reviewSession.summary.total_clicks++;

        // Log action
        if (click.type === 'click') {
          const label = click.element?.ariaLabel || click.element?.text?.slice(0, 30) || `(${click.x}, ${click.y})`;
          console.log(`[${Math.round(elapsed/1000)}s] Click: ${label}`);
          if (currentPanel && currentPanel !== lastPanel) {
            console.log(`        → Panel: ${currentPanel}`);
          }
        } else if (click.type === 'keyboard') {
          console.log(`[${Math.round(elapsed/1000)}s] Key: ${click.key}`);
        }
      }
    } catch (err) {
      // Session may have ended
    }
  }, 500);

  // Handle graceful shutdown
  const saveAndExit = async () => {
    clearInterval(pollInterval);
    
    const endTime = Date.now();
    reviewSession.ended_at = new Date().toISOString();
    reviewSession.duration_ms = endTime - startTime;
    reviewSession.summary.total_time_ms = endTime - startTime;
    
    if (reviewSession.actions.length > 0) {
      const totalDwell = reviewSession.actions.reduce((sum, a) => sum + (a.dwell_time_ms || 0), 0);
      reviewSession.summary.avg_dwell_time_ms = Math.round(totalDwell / reviewSession.actions.length);
    }

    // Take final screenshot
    try {
      await page.screenshot({ path: `${screenshotDir}/99-final.png`, fullPage: false });
    } catch {}

    // Save review data
    const outputFile = `review-${timestamp}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(reviewSession, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 REVIEW SESSION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📁 Output: ${outputFile}`);
    console.log(`📸 Screenshots: ${screenshotDir}/`);
    console.log(`\n📊 Summary:`);
    console.log(`   Duration: ${Math.round(reviewSession.duration_ms! / 1000)}s`);
    console.log(`   Total clicks: ${reviewSession.summary.total_clicks}`);
    console.log(`   Panels visited: ${reviewSession.summary.panels_visited.join(', ') || 'none'}`);
    console.log(`   Pages reviewed: ${reviewSession.summary.pages_reviewed.join(', ') || 'none'}`);
    console.log(`   Avg dwell time: ${reviewSession.summary.avg_dwell_time_ms}ms`);

    // Cleanup
    try {
      await browser.close();
      await steel.sessions.release(session.id);
    } catch {}

    process.exit(0);
  };

  process.on('SIGINT', saveAndExit);
  process.on('SIGTERM', saveAndExit);

  // Keep alive
  console.log('📍 Recording... Press Ctrl+C when review is complete.\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
