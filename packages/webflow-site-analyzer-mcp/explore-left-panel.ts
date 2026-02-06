/**
 * Explore Webflow Designer Left Panel
 * 
 * Systematically discovers all access points in the left panel,
 * including hover-triggered meta navigation.
 */

import Steel from 'steel-sdk';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const WEBFLOW_URL = 'https://preview.webflow.com/preview/woven-wear?utm_medium=preview_link&utm_source=designer&utm_content=woven-wear&preview=cfce548695005e6704b16f7e3216b6f1&workflow=preview';

interface AccessPoint {
  name: string;
  type: 'icon' | 'button' | 'tab' | 'hover-menu' | 'keyboard';
  trigger: string;  // How to access it
  ariaLabel?: string;
  shortcut?: string;
  children?: AccessPoint[];
}

async function main() {
  const apiKey = process.env.STEEL_API_KEY;
  if (!apiKey) {
    console.error('❌ STEEL_API_KEY required');
    process.exit(1);
  }

  console.log('🚀 Starting Steel session...');
  const steel = new Steel({ steelAPIKey: apiKey });
  
  const session = await steel.sessions.create({
    timeout: 900000  // 15 min
  });
  
  console.log(`📍 Session: ${session.id}`);
  console.log(`👁️  Live view: ${session.sessionViewerUrl}`);
  console.log('');

  const wsUrl = `wss://connect.steel.dev?apiKey=${apiKey}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Navigating to Webflow Designer...');
  await page.goto(WEBFLOW_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate('new Promise(r => setTimeout(r, 5000))');

  const accessPoints: AccessPoint[] = [];

  // =============================================================================
  // 1. Discover all buttons with aria-labels in the left sidebar
  // =============================================================================
  console.log('\n📍 Scanning left panel buttons...');
  
  const leftPanelButtons = await page.evaluate(`
    (function() {
      const results = [];
      
      // Look for buttons in the left area (typically first 100px)
      document.querySelectorAll('button, [role="button"], [tabindex="0"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.left < 150 && rect.width > 0 && rect.height > 0) {
          results.push({
            tag: el.tagName,
            ariaLabel: el.getAttribute('aria-label') || '',
            title: el.getAttribute('title') || '',
            text: el.textContent?.trim().slice(0, 50) || '',
            className: el.className?.toString().slice(0, 100) || '',
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        }
      });
      
      return results;
    })()
  `) as any[];

  console.log(`   Found ${leftPanelButtons.length} interactive elements`);
  for (const btn of leftPanelButtons) {
    const label = btn.ariaLabel || btn.title || btn.text || '(unnamed)';
    console.log(`   - ${label} @ (${btn.x}, ${btn.y})`);
    accessPoints.push({
      name: label,
      type: 'button',
      trigger: `click @ (${btn.x + btn.width/2}, ${btn.y + btn.height/2})`,
      ariaLabel: btn.ariaLabel
    });
  }

  // =============================================================================
  // 2. Discover icons in the vertical toolbar
  // =============================================================================
  console.log('\n📍 Scanning vertical toolbar icons...');
  
  const toolbarIcons = await page.evaluate(`
    (function() {
      const results = [];
      
      // Icons are often SVGs or elements with specific data attributes
      document.querySelectorAll('svg, [data-automation-id], [data-testid]').forEach(el => {
        const rect = el.getBoundingClientRect();
        // Left toolbar is usually very narrow (< 60px from left edge)
        if (rect.left < 60 && rect.width > 10 && rect.height > 10) {
          const parent = el.closest('button, [role="button"], a, [tabindex]');
          results.push({
            type: 'icon',
            ariaLabel: parent?.getAttribute('aria-label') || el.getAttribute('aria-label') || '',
            title: parent?.getAttribute('title') || el.getAttribute('title') || '',
            dataId: el.getAttribute('data-automation-id') || el.getAttribute('data-testid') || '',
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        }
      });
      
      // Dedupe by position
      const seen = new Set();
      return results.filter(r => {
        const key = r.x + ',' + r.y;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    })()
  `) as any[];

  console.log(`   Found ${toolbarIcons.length} toolbar icons`);
  for (const icon of toolbarIcons) {
    const label = icon.ariaLabel || icon.title || icon.dataId || '(icon)';
    console.log(`   - ${label} @ (${icon.x}, ${icon.y})`);
  }

  // =============================================================================
  // 3. Hover over left edge to discover hidden menus
  // =============================================================================
  console.log('\n📍 Probing for hover-triggered menus...');
  
  // Move mouse along the left edge at different heights
  const hoverPositions = [100, 200, 300, 400, 500, 600, 700];
  
  for (const y of hoverPositions) {
    await page.mouse.move(30, y);
    await page.evaluate('new Promise(r => setTimeout(r, 500))');
    
    // Check if any new elements appeared
    const newElements = await page.evaluate(`
      (function() {
        const results = [];
        document.querySelectorAll('[class*="tooltip"], [class*="popover"], [class*="menu"], [role="menu"], [role="tooltip"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            results.push({
              text: el.textContent?.trim().slice(0, 100) || '',
              className: el.className?.toString().slice(0, 50) || '',
              x: Math.round(rect.left),
              y: Math.round(rect.top)
            });
          }
        });
        return results;
      })()
    `) as any[];
    
    if (newElements.length > 0) {
      console.log(`   Hover @ y=${y} revealed: ${newElements.map(e => e.text || e.className).join(', ')}`);
    }
  }

  // =============================================================================
  // 4. Check known keyboard shortcuts
  // =============================================================================
  console.log('\n📍 Testing keyboard shortcuts...');
  
  const shortcuts = [
    { key: 'p', name: 'Pages Panel' },
    { key: 'g', name: 'Style Selector' },
    { key: 'h', name: 'Interactions' },
    { key: 'j', name: 'Assets' },
    { key: 'a', name: 'Add Elements', shift: true },
    { key: 'e', name: 'Navigator' },
    { key: 'd', name: 'Style Panel' },
    { key: 's', name: 'Settings' },
    { key: 'z', name: 'Undo', meta: true },
    { key: '/', name: 'Quick Find', meta: true },
  ];

  for (const shortcut of shortcuts) {
    console.log(`   ⌨️  ${shortcut.shift ? 'Shift+' : ''}${shortcut.meta ? '⌘+' : ''}${shortcut.key.toUpperCase()} → ${shortcut.name}`);
    accessPoints.push({
      name: shortcut.name,
      type: 'keyboard',
      trigger: `${shortcut.shift ? 'Shift+' : ''}${shortcut.meta ? 'Cmd+' : ''}${shortcut.key}`,
      shortcut: shortcut.key
    });
  }

  // =============================================================================
  // 5. Deep scan: Click each left panel icon and record what opens
  // =============================================================================
  console.log('\n📍 Deep scan: clicking left panel icons...');
  
  // Get fresh list of clickable elements in left toolbar
  const clickTargets = await page.evaluate(`
    (function() {
      const results = [];
      document.querySelectorAll('button, [role="button"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        // Very left edge - the main toolbar
        if (rect.left < 50 && rect.width > 15 && rect.height > 15 && rect.top > 50) {
          results.push({
            ariaLabel: el.getAttribute('aria-label') || '',
            x: Math.round(rect.left + rect.width/2),
            y: Math.round(rect.top + rect.height/2)
          });
        }
      });
      return results;
    })()
  `) as any[];

  for (const target of clickTargets.slice(0, 10)) {  // Limit to first 10
    console.log(`\n   Clicking @ (${target.x}, ${target.y}) - ${target.ariaLabel || 'unknown'}...`);
    
    await page.mouse.click(target.x, target.y);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    // See what panel opened
    const panelText = await page.evaluate(`
      (function() {
        // Look for panel headers or titles
        const headers = [];
        document.querySelectorAll('h1, h2, h3, h4, [class*="header"], [class*="title"], [class*="panel"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          // Panels usually appear to the right of the toolbar
          if (rect.left > 40 && rect.left < 400 && rect.width > 50) {
            const text = el.textContent?.trim();
            if (text && text.length < 50 && text.length > 1) {
              headers.push(text);
            }
          }
        });
        return [...new Set(headers)].slice(0, 5);
      })()
    `) as string[];
    
    if (panelText.length > 0) {
      console.log(`   → Opened: ${panelText.join(', ')}`);
    }
    
    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }

  // =============================================================================
  // 6. Scan top tabs (Design, CMS, Insights, etc.)
  // =============================================================================
  console.log('\n📍 Scanning top navigation tabs...');
  
  const topTabs = await page.evaluate(`
    (function() {
      const results = [];
      document.querySelectorAll('button, [role="tab"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        // Top area, likely tabs
        if (rect.top < 60 && rect.height > 20 && rect.width > 40) {
          const text = el.textContent?.trim();
          if (text && text.length < 30) {
            results.push({
              text,
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              ariaLabel: el.getAttribute('aria-label') || ''
            });
          }
        }
      });
      return results;
    })()
  `) as any[];

  console.log(`   Found ${topTabs.length} top tabs:`);
  for (const tab of topTabs) {
    console.log(`   - "${tab.text}" @ (${tab.x}, ${tab.y})`);
    accessPoints.push({
      name: tab.text,
      type: 'tab',
      trigger: `click @ (${tab.x}, ${tab.y})`
    });
  }

  // =============================================================================
  // Summary
  // =============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 ACCESS POINTS SUMMARY');
  console.log('='.repeat(60));
  
  const byType: Record<string, AccessPoint[]> = {};
  for (const ap of accessPoints) {
    if (!byType[ap.type]) byType[ap.type] = [];
    byType[ap.type].push(ap);
  }
  
  for (const [type, points] of Object.entries(byType)) {
    console.log(`\n${type.toUpperCase()} (${points.length}):`);
    for (const p of points) {
      console.log(`  • ${p.name}`);
      console.log(`    Trigger: ${p.trigger}`);
    }
  }

  // Cleanup
  console.log('\n🧹 Closing session...');
  await browser.close();
  try {
    await steel.sessions.release(session.id);
  } catch {}
  
  console.log('✅ Done!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
