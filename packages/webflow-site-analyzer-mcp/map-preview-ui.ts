/**
 * Map ALL access points in Webflow Preview mode
 * 
 * Scans the entire UI to find every interactive element
 */

import Steel from 'steel-sdk';
import puppeteer from 'puppeteer-core';
import * as fs from 'fs';

const WEBFLOW_URL = 'https://preview.webflow.com/preview/woven-wear?utm_medium=preview_link&utm_source=designer&utm_content=woven-wear&preview=cfce548695005e6704b16f7e3216b6f1&workflow=preview';

interface AccessPoint {
  name: string;
  area: 'top-left' | 'top-center' | 'top-right' | 'left-panel' | 'canvas' | 'bottom' | 'popup';
  type: 'tab' | 'button' | 'icon' | 'toggle' | 'dropdown' | 'link' | 'keyboard';
  position: { x: number; y: number };
  action: string;
  opensPanel?: string;
}

async function main() {
  const apiKey = process.env.STEEL_API_KEY;
  if (!apiKey) {
    console.error('❌ STEEL_API_KEY required');
    process.exit(1);
  }

  console.log('🚀 Starting Steel session...');
  const steel = new Steel({ steelAPIKey: apiKey });
  const session = await steel.sessions.create({ timeout: 900000 });
  
  console.log(`📍 Session: ${session.id}`);
  console.log(`👁️  Live view: ${session.sessionViewerUrl}`);

  const wsUrl = `wss://connect.steel.dev?apiKey=${apiKey}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Navigating to Webflow Preview...');
  await page.goto(WEBFLOW_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate('new Promise(r => setTimeout(r, 5000))');

  // Close the blue popup first
  console.log('📍 Closing initial popup...');
  await page.keyboard.press('Escape');
  await page.evaluate('new Promise(r => setTimeout(r, 500))');
  
  // Try clicking the X on the popup using evaluate
  await page.evaluate(`
    (function() {
      const btns = document.querySelectorAll('[aria-label="Close"], [class*="close"]');
      for (const btn of btns) {
        if (btn.getBoundingClientRect().width > 0) {
          btn.click();
          return;
        }
      }
    })()
  `);
  await page.evaluate('new Promise(r => setTimeout(r, 500))');

  const accessPoints: AccessPoint[] = [];

  // =============================================================================
  // 1. Scan ALL interactive elements
  // =============================================================================
  console.log('\n📍 Scanning all interactive elements...\n');
  
  const allElements = await page.evaluate(`
    (function() {
      const results = [];
      const seen = new Set();
      
      // Find all potentially interactive elements
      const selectors = [
        'button', 
        '[role="button"]', 
        '[role="tab"]',
        '[role="menuitem"]',
        'a[href]',
        '[tabindex="0"]',
        '[onclick]',
        'input',
        'select',
        '[class*="toggle"]',
        '[class*="btn"]',
        '[class*="icon"]',
        '[aria-label]',
        '[data-automation-id]'
      ];
      
      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 5 || rect.height < 5) return;
          if (rect.left < 0 || rect.top < 0) return;
          
          // Skip elements inside the iframe (the actual site preview)
          if (el.closest('#site-iframe-next')) return;
          if (el.closest('iframe')) return;
          
          const key = Math.round(rect.left) + ',' + Math.round(rect.top);
          if (seen.has(key)) return;
          seen.add(key);
          
          const text = el.textContent?.trim().slice(0, 50) || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          const title = el.getAttribute('title') || '';
          const dataId = el.getAttribute('data-automation-id') || '';
          
          results.push({
            tag: el.tagName,
            text,
            ariaLabel,
            title,
            dataId,
            className: (el.className?.toString() || '').slice(0, 100),
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        });
      }
      
      return results.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
    })()
  `) as any[];

  console.log(`   Found ${allElements.length} interactive elements\n`);
  
  // Group by area
  const areas = {
    'top-bar': allElements.filter(e => e.y < 70),
    'left-side': allElements.filter(e => e.y >= 70 && e.x < 200),
    'right-side': allElements.filter(e => e.y >= 70 && e.x > 1700),
    'bottom': allElements.filter(e => e.y > 900),
    'center': allElements.filter(e => e.y >= 70 && e.y <= 900 && e.x >= 200 && e.x <= 1700)
  };

  // =============================================================================
  // 2. Process TOP BAR
  // =============================================================================
  console.log('📍 TOP BAR ELEMENTS:');
  for (const el of areas['top-bar']) {
    const label = el.ariaLabel || el.text || el.title || el.dataId || '(unnamed)';
    console.log(`   • "${label}" @ (${el.x}, ${el.y}) [${el.tag}]`);
    
    let area: AccessPoint['area'] = 'top-center';
    if (el.x < 300) area = 'top-left';
    else if (el.x > 1600) area = 'top-right';
    
    accessPoints.push({
      name: label,
      area,
      type: el.tag === 'BUTTON' ? 'button' : 'tab',
      position: { x: el.x + el.width/2, y: el.y + el.height/2 },
      action: `click @ (${el.x + el.width/2}, ${el.y + el.height/2})`
    });
  }

  // =============================================================================
  // 3. Process LEFT SIDE
  // =============================================================================
  console.log('\n📍 LEFT SIDE ELEMENTS:');
  for (const el of areas['left-side']) {
    const label = el.ariaLabel || el.text || el.title || el.dataId || '(unnamed)';
    console.log(`   • "${label}" @ (${el.x}, ${el.y})`);
    
    accessPoints.push({
      name: label,
      area: 'left-panel',
      type: 'button',
      position: { x: el.x + el.width/2, y: el.y + el.height/2 },
      action: `click @ (${el.x + el.width/2}, ${el.y + el.height/2})`
    });
  }

  // =============================================================================
  // 4. Process RIGHT SIDE
  // =============================================================================
  console.log('\n📍 RIGHT SIDE ELEMENTS:');
  for (const el of areas['right-side']) {
    const label = el.ariaLabel || el.text || el.title || el.dataId || '(unnamed)';
    console.log(`   • "${label}" @ (${el.x}, ${el.y})`);
    
    accessPoints.push({
      name: label,
      area: 'top-right',
      type: 'button',
      position: { x: el.x + el.width/2, y: el.y + el.height/2 },
      action: `click @ (${el.x + el.width/2}, ${el.y + el.height/2})`
    });
  }

  // =============================================================================
  // 5. Process BOTTOM
  // =============================================================================
  console.log('\n📍 BOTTOM ELEMENTS:');
  for (const el of areas['bottom']) {
    const label = el.ariaLabel || el.text || el.title || el.dataId || '(unnamed)';
    console.log(`   • "${label}" @ (${el.x}, ${el.y})`);
    
    accessPoints.push({
      name: label,
      area: 'bottom',
      type: 'link',
      position: { x: el.x + el.width/2, y: el.y + el.height/2 },
      action: `click @ (${el.x + el.width/2}, ${el.y + el.height/2})`
    });
  }

  // =============================================================================
  // 6. Click each TAB and see what panels open
  // =============================================================================
  console.log('\n📍 Testing TAB clicks...\n');
  
  const tabs = ['Design', 'CMS', 'Insights'];
  for (const tabName of tabs) {
    console.log(`   Clicking "${tabName}" tab...`);
    
    // Find and click the tab
    const tabEl = areas['top-bar'].find(e => e.text?.includes(tabName) || e.ariaLabel?.includes(tabName));
    if (tabEl) {
      await page.mouse.click(tabEl.x + tabEl.width/2, tabEl.y + tabEl.height/2);
      await page.evaluate('new Promise(r => setTimeout(r, 1500))');
      
      // Get panel content
      const panelContent = await page.evaluate(`
        (function() {
          const items = [];
          // Look for panel that appeared (usually left side, 50-400px)
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.left > 30 && rect.left < 400 && rect.top > 60 && rect.top < 700 && rect.width > 30) {
              const text = el.textContent?.trim();
              if (text && text.length > 1 && text.length < 60) {
                // Check if it's a heading or interactive element
                if (el.tagName.match(/^H[1-6]$/) || 
                    el.tagName === 'BUTTON' ||
                    el.getAttribute('role') === 'tab' ||
                    el.getAttribute('role') === 'button' ||
                    el.className?.toString().includes('item') ||
                    el.className?.toString().includes('title')) {
                  if (!items.includes(text)) items.push(text);
                }
              }
            }
          });
          return items.slice(0, 15);
        })()
      `) as string[];
      
      if (panelContent.length > 0) {
        console.log(`      Panel items: ${panelContent.join(' | ')}`);
        
        // Update the access point
        const ap = accessPoints.find(a => a.name.includes(tabName));
        if (ap) ap.opensPanel = panelContent.slice(0, 5).join(', ');
      }
      
      // Take screenshot of each panel
      const screenshot = await page.screenshot({ fullPage: false });
      fs.writeFileSync(`panel-${tabName.toLowerCase()}.png`, screenshot);
      console.log(`      Screenshot: panel-${tabName.toLowerCase()}.png`);
    }
    
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }

  // =============================================================================
  // 7. Test keyboard shortcuts with panel detection
  // =============================================================================
  console.log('\n📍 Testing keyboard shortcuts with panel detection...\n');
  
  const shortcuts = [
    { key: 'p', name: 'Pages' },
    { key: 'g', name: 'Style Selectors' },
    { key: 'j', name: 'Assets', shift: true },
    { key: 'v', name: 'Variables' },
    { key: 'u', name: 'Audits' },
    { key: 'a', name: 'Add/Components', shift: true },
    { key: 'l', name: 'Libraries', shift: true },
    { key: 'x', name: 'Interactions' },
    { key: 'z', name: 'Navigator' },
    { key: 'h', name: 'Interactions Alt' },
    { key: 'd', name: 'Style Panel' },
    { key: 's', name: 'Settings' },
    { key: 'e', name: 'Navigator Alt' },
    { key: 'n', name: 'Notes' },
    { key: 'f', name: 'Find', meta: true },
    { key: 'k', name: 'Link', meta: true },
  ];
  
  for (const shortcut of shortcuts) {
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    
    // Press shortcut
    if (shortcut.meta) {
      await page.keyboard.down('Meta');
    }
    if (shortcut.shift) {
      await page.keyboard.down('Shift');
    }
    await page.keyboard.press(shortcut.key);
    if (shortcut.shift) {
      await page.keyboard.up('Shift');
    }
    if (shortcut.meta) {
      await page.keyboard.up('Meta');
    }
    
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    // Check what opened
    const result = await page.evaluate(`
      (function() {
        // Look for any panel header
        const headers = [];
        document.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="header"], [class*="panel"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.left > 30 && rect.left < 400 && rect.width > 20) {
            const text = el.textContent?.trim();
            if (text && text.length < 40 && !headers.includes(text)) {
              headers.push(text);
            }
          }
        });
        return headers[0] || '';
      })()
    `) as string;
    
    const prefix = (shortcut.meta ? '⌘+' : '') + (shortcut.shift ? 'Shift+' : '');
    if (result) {
      console.log(`   ✅ ${prefix}${shortcut.key.toUpperCase()}: ${result}`);
      accessPoints.push({
        name: result,
        area: 'left-panel',
        type: 'keyboard',
        position: { x: 0, y: 0 },
        action: `${prefix}${shortcut.key.toUpperCase()}`
      });
    } else {
      console.log(`   ❌ ${prefix}${shortcut.key.toUpperCase()}: (no panel)`);
    }
    
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 150))');
  }

  // =============================================================================
  // FINAL SUMMARY
  // =============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 WEBFLOW PREVIEW - COMPLETE ACCESS POINT MAP');
  console.log('='.repeat(70));

  const byArea: Record<string, AccessPoint[]> = {};
  for (const ap of accessPoints) {
    if (!byArea[ap.area]) byArea[ap.area] = [];
    byArea[ap.area].push(ap);
  }

  for (const [area, points] of Object.entries(byArea)) {
    console.log(`\n📍 ${area.toUpperCase().replace('-', ' ')}:`);
    for (const p of points) {
      console.log(`   • ${p.name}`);
      console.log(`     Action: ${p.action}`);
      if (p.opensPanel) {
        console.log(`     Opens: ${p.opensPanel}`);
      }
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
