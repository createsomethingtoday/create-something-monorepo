/**
 * Grid-based scan of Webflow Designer left edge
 * 
 * Systematically scans every 30px down the left edge to find all toolbar icons
 */

import Steel from 'steel-sdk';
import puppeteer from 'puppeteer-core';
import * as fs from 'fs';

const WEBFLOW_URL = 'https://preview.webflow.com/preview/woven-wear?utm_medium=preview_link&utm_source=designer&utm_content=woven-wear&preview=cfce548695005e6704b16f7e3216b6f1&workflow=preview';

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
  console.log('');

  const wsUrl = `wss://connect.steel.dev?apiKey=${apiKey}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Navigating to Webflow Designer...');
  await page.goto(WEBFLOW_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate('new Promise(r => setTimeout(r, 5000))');

  // Take screenshot
  const screenshot = await page.screenshot({ fullPage: false });
  fs.writeFileSync('webflow-designer-scan.png', screenshot);
  console.log('📸 Screenshot saved to webflow-designer-scan.png');

  // =============================================================================
  // Grid scan: Check every 25px down the left edge from y=80 to y=800
  // =============================================================================
  console.log('\n📍 Grid scanning left edge (x=20)...\n');
  
  const discoveries: { y: number; tooltip: string; cursor: string; clickResult: string }[] = [];
  
  for (let y = 80; y <= 850; y += 25) {
    const x = 20;  // Left edge
    
    // Move to position
    await page.mouse.move(x, y);
    await page.evaluate('new Promise(r => setTimeout(r, 600))');
    
    // Get element info and any tooltip
    const info = await page.evaluate(`
      (function() {
        const el = document.elementFromPoint(${x}, ${y});
        if (!el) return { tag: 'none', cursor: 'default', tooltip: '' };
        
        const computed = window.getComputedStyle(el);
        
        // Check for tooltip anywhere
        let tooltip = '';
        document.querySelectorAll('[role="tooltip"], [class*="tooltip"], [class*="Tooltip"], [data-tippy-root]').forEach(t => {
          const rect = t.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            tooltip = t.textContent?.trim() || '';
          }
        });
        
        return {
          tag: el.tagName,
          className: (el.className?.toString() || '').slice(0, 50),
          ariaLabel: el.getAttribute('aria-label') || '',
          cursor: computed.cursor,
          tooltip,
          isClickable: computed.cursor === 'pointer' || el.tagName === 'BUTTON'
        };
      })()
    `) as any;
    
    if (info.tooltip || info.cursor === 'pointer' || info.ariaLabel) {
      console.log(`   y=${y}: ${info.tooltip || info.ariaLabel || '(clickable)'} [${info.cursor}]`);
      discoveries.push({ y, tooltip: info.tooltip || info.ariaLabel, cursor: info.cursor, clickResult: '' });
    }
  }

  // =============================================================================
  // Click on each discovered position
  // =============================================================================
  console.log('\n📍 Clicking on discovered positions...\n');
  
  for (const disc of discoveries) {
    console.log(`   Clicking y=${disc.y} (${disc.tooltip || 'unknown'})...`);
    
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    
    await page.mouse.click(20, disc.y);
    await page.evaluate('new Promise(r => setTimeout(r, 1200))');
    
    // Check what opened
    const result = await page.evaluate(`
      (function() {
        // Get all visible text in the left panel area (50-350px)
        const texts = [];
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.left > 35 && rect.left < 380 && rect.top > 60 && rect.top < 700) {
            const text = el.textContent?.trim();
            if (text && text.length > 1 && text.length < 40) {
              // Check if it's a heading or prominent text
              if (el.tagName.match(/^H[1-6]$/) || 
                  el.className?.toString().includes('title') ||
                  el.className?.toString().includes('header') ||
                  el.getAttribute('role') === 'heading') {
                if (!texts.includes(text)) texts.push(text);
              }
            }
          }
        });
        return texts.slice(0, 5).join(', ');
      })()
    `) as string;
    
    disc.clickResult = result;
    
    if (result) {
      console.log(`      → ${result}`);
    }
    
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
  }

  // =============================================================================
  // Test ALL keyboard shortcuts comprehensively
  // =============================================================================
  console.log('\n📍 Comprehensive keyboard shortcut test...\n');
  
  const shortcuts: { key: string; shift?: boolean; result?: string }[] = [];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  
  for (const key of alphabet) {
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    
    await page.keyboard.press(key);
    await page.evaluate('new Promise(r => setTimeout(r, 800))');
    
    const result = await page.evaluate(`
      (function() {
        // Check for any new panel
        const panels = [];
        document.querySelectorAll('[class*="panel"], [class*="Panel"], [role="dialog"], [role="menu"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 100 && rect.left < 400) {
            // Find the first heading-like text
            const heading = el.querySelector('h1, h2, h3, h4, [class*="title"], [class*="header"]');
            if (heading) {
              panels.push(heading.textContent?.trim() || '');
            } else {
              // Get first significant text
              const text = el.textContent?.trim().slice(0, 30);
              if (text) panels.push(text);
            }
          }
        });
        return panels[0] || '';
      })()
    `) as string;
    
    if (result) {
      console.log(`   ${key.toUpperCase()}: ${result}`);
      shortcuts.push({ key, result });
    }
    
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 150))');
  }
  
  // Test Shift+ variants
  console.log('\n   Testing Shift+ variants...');
  for (const key of alphabet) {
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    
    await page.keyboard.down('Shift');
    await page.keyboard.press(key);
    await page.keyboard.up('Shift');
    await page.evaluate('new Promise(r => setTimeout(r, 800))');
    
    const result = await page.evaluate(`
      (function() {
        const panels = [];
        document.querySelectorAll('[class*="panel"], [class*="Panel"], [role="dialog"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 100 && rect.left < 400) {
            const heading = el.querySelector('h1, h2, h3, h4, [class*="title"]');
            if (heading) panels.push(heading.textContent?.trim() || '');
          }
        });
        return panels[0] || '';
      })()
    `) as string;
    
    if (result) {
      console.log(`   Shift+${key.toUpperCase()}: ${result}`);
      shortcuts.push({ key, shift: true, result });
    }
    
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 150))');
  }

  // =============================================================================
  // Summary
  // =============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 WEBFLOW DESIGNER ACCESS POINTS - COMPREHENSIVE');
  console.log('='.repeat(70));
  
  console.log('\n🖱️  LEFT EDGE HOVER/CLICK POINTS:');
  for (const d of discoveries) {
    console.log(`   • y=${d.y}: ${d.tooltip || '(unnamed)'}`);
    if (d.clickResult) {
      console.log(`     Opens: ${d.clickResult}`);
    }
  }
  
  console.log('\n⌨️  WORKING KEYBOARD SHORTCUTS:');
  for (const s of shortcuts) {
    const prefix = s.shift ? 'Shift+' : '';
    console.log(`   • ${prefix}${s.key.toUpperCase()}: ${s.result}`);
  }
  
  console.log('\n📋 KNOWN ACCESS METHODS:');
  console.log('   TOP TABS (click):');
  console.log('     • Design - Main design mode');
  console.log('     • CMS - Collection management');
  console.log('     • Insights - Site audits');
  console.log('   RIGHT SIDE:');
  console.log('     • Share - Share preview link');
  console.log('     • Publish - Deploy to production');

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
