/**
 * Deep exploration of Webflow Designer left vertical toolbar
 * 
 * Hovers over each icon to reveal tooltips and clicks to see what opens
 */

import Steel from 'steel-sdk';
import puppeteer from 'puppeteer-core';
import * as fs from 'fs';

const WEBFLOW_URL = 'https://preview.webflow.com/preview/woven-wear?utm_medium=preview_link&utm_source=designer&utm_content=woven-wear&preview=cfce548695005e6704b16f7e3216b6f1&workflow=preview';

interface ToolbarItem {
  name: string;
  shortcut?: string;
  position: { x: number; y: number };
  panelOpens?: string;
  hasSubmenu?: boolean;
  submenuItems?: string[];
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
  console.log('');

  const wsUrl = `wss://connect.steel.dev?apiKey=${apiKey}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Navigating to Webflow Designer...');
  await page.goto(WEBFLOW_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate('new Promise(r => setTimeout(r, 5000))');

  // Take initial screenshot
  console.log('📸 Taking screenshot...');
  const screenshot = await page.screenshot({ fullPage: false });
  fs.writeFileSync('webflow-designer.png', screenshot);
  console.log('   Saved to webflow-designer.png');

  const toolbarItems: ToolbarItem[] = [];

  // =============================================================================
  // 1. Find ALL clickable elements in the left 50px
  // =============================================================================
  console.log('\n📍 Finding all elements in left toolbar area...');
  
  const leftElements = await page.evaluate(`
    (function() {
      const results = [];
      const processed = new Set();
      
      // Get ALL elements in left 50px
      document.querySelectorAll('*').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.left >= 0 && rect.left < 50 && rect.width > 10 && rect.height > 10 && rect.top > 70) {
          const key = Math.round(rect.top) + '-' + Math.round(rect.height);
          if (!processed.has(key)) {
            processed.add(key);
            
            // Check if clickable
            const clickable = el.tagName === 'BUTTON' || 
                             el.getAttribute('role') === 'button' ||
                             el.getAttribute('tabindex') !== null ||
                             el.onclick !== null ||
                             window.getComputedStyle(el).cursor === 'pointer';
            
            results.push({
              tag: el.tagName,
              clickable,
              ariaLabel: el.getAttribute('aria-label') || '',
              title: el.getAttribute('title') || '',
              dataId: el.getAttribute('data-automation-id') || el.getAttribute('data-testid') || '',
              className: (el.className?.toString() || '').slice(0, 80),
              x: Math.round(rect.left + rect.width/2),
              y: Math.round(rect.top + rect.height/2),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            });
          }
        }
      });
      
      // Sort by Y position
      return results.sort((a, b) => a.y - b.y);
    })()
  `) as any[];

  console.log(`   Found ${leftElements.length} elements`);
  
  // Deduplicate by Y position (within 5px)
  const deduped: any[] = [];
  for (const el of leftElements) {
    const existing = deduped.find(d => Math.abs(d.y - el.y) < 20);
    if (!existing) {
      deduped.push(el);
    }
  }
  
  console.log(`   After deduplication: ${deduped.length} unique positions`);

  // =============================================================================
  // 2. Hover over each position to get tooltip
  // =============================================================================
  console.log('\n📍 Hovering over each element to discover tooltips...\n');
  
  for (const el of deduped) {
    console.log(`   Position y=${el.y}:`);
    console.log(`      Tag: ${el.tag}, AriaLabel: "${el.ariaLabel}", DataID: "${el.dataId}"`);
    
    // Hover
    await page.mouse.move(el.x, el.y);
    await page.evaluate('new Promise(r => setTimeout(r, 800))');
    
    // Check for tooltip
    const tooltip = await page.evaluate(`
      (function() {
        // Look for any tooltip-like element that appeared
        const tooltips = document.querySelectorAll('[role="tooltip"], [class*="tooltip"], [class*="Tooltip"]');
        for (const t of tooltips) {
          const rect = t.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return t.textContent?.trim() || '';
          }
        }
        
        // Also check for any element that just appeared near the hover point
        const nearby = document.elementFromPoint(80, ${el.y});
        if (nearby && nearby.textContent?.trim().length < 100) {
          return nearby.textContent?.trim() || '';
        }
        
        return '';
      })()
    `) as string;
    
    if (tooltip) {
      console.log(`      Tooltip: "${tooltip}"`);
    }
    
    // Move away
    await page.mouse.move(500, 500);
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
  }

  // =============================================================================
  // 3. Click each element and see what panel opens
  // =============================================================================
  console.log('\n📍 Clicking each element to see what opens...\n');
  
  for (const el of deduped) {
    const label = el.ariaLabel || el.dataId || `y=${el.y}`;
    console.log(`   Clicking "${label}"...`);
    
    await page.mouse.click(el.x, el.y);
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    // Check what panel opened (look for panel to the right of toolbar)
    const panelInfo = await page.evaluate(`
      (function() {
        const results = {
          headers: [],
          buttons: [],
          inputs: []
        };
        
        // Look in the area 50-400px from left (typical panel area)
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.left > 40 && rect.left < 400 && rect.top < 600 && rect.width > 20) {
            const text = el.textContent?.trim();
            
            // Headers
            if ((el.tagName.match(/^H[1-6]$/) || el.className?.toString().includes('header') || 
                 el.className?.toString().includes('title')) && text && text.length < 40) {
              if (!results.headers.includes(text)) {
                results.headers.push(text);
              }
            }
            
            // Tab buttons
            if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'tab') && text && text.length < 30) {
              if (!results.buttons.includes(text)) {
                results.buttons.push(text);
              }
            }
          }
        });
        
        return results;
      })()
    `) as any;
    
    if (panelInfo.headers.length > 0) {
      console.log(`      Headers: ${panelInfo.headers.slice(0, 3).join(', ')}`);
    }
    if (panelInfo.buttons.length > 0) {
      console.log(`      Buttons: ${panelInfo.buttons.slice(0, 5).join(', ')}`);
    }
    
    // Store result
    toolbarItems.push({
      name: label,
      position: { x: el.x, y: el.y },
      panelOpens: panelInfo.headers[0] || panelInfo.buttons[0] || undefined
    });
    
    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }

  // =============================================================================
  // 4. Test all keyboard shortcuts and record results
  // =============================================================================
  console.log('\n📍 Testing keyboard shortcuts...\n');
  
  const shortcuts = [
    { key: 'p', name: 'Pages' },
    { key: 'g', name: 'Style Selector' },
    { key: 'h', name: 'Interactions' },
    { key: 'j', name: 'Assets' },
    { key: 'e', name: 'Navigator' },
    { key: 'd', name: 'Style Panel' },
    { key: 's', name: 'Settings (Element)' },
    { key: 'a', name: 'Add Panel', shift: true },
    { key: 'l', name: 'Symbols/Components' },
    { key: 'b', name: 'Backpack/Clipboard' },
    { key: 'c', name: 'Selector (maybe)' },
    { key: 'f', name: 'Find' },
    { key: 'v', name: 'Variables' },
    { key: 'n', name: 'Notes/Annotations' },
    { key: 'o', name: 'Outline' },
    { key: 'i', name: 'Inspector' },
    { key: 't', name: 'Text' },
    { key: 'r', name: 'Rectangle' },
    { key: 'k', name: 'Link' },
    { key: 'm', name: 'Media' },
    { key: 'w', name: 'Widget' },
    { key: 'u', name: 'Utility' },
  ];
  
  for (const shortcut of shortcuts) {
    // Press Escape first
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
    
    // Press the shortcut
    if (shortcut.shift) {
      await page.keyboard.down('Shift');
      await page.keyboard.press(shortcut.key);
      await page.keyboard.up('Shift');
    } else {
      await page.keyboard.press(shortcut.key);
    }
    
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    
    // Check what opened
    const opened = await page.evaluate(`
      (function() {
        // Look for panel headers
        const headers = [];
        document.querySelectorAll('h1, h2, h3, h4, [class*="header"], [class*="title"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.left > 40 && rect.left < 400 && rect.width > 20) {
            const text = el.textContent?.trim();
            if (text && text.length < 50 && text.length > 1 && !headers.includes(text)) {
              headers.push(text);
            }
          }
        });
        return headers.slice(0, 3);
      })()
    `) as string[];
    
    const prefix = shortcut.shift ? 'Shift+' : '';
    if (opened.length > 0) {
      console.log(`   ✅ ${prefix}${shortcut.key.toUpperCase()}: ${opened.join(', ')}`);
    } else {
      console.log(`   ❌ ${prefix}${shortcut.key.toUpperCase()}: (no panel opened)`);
    }
    
    // Close
    await page.keyboard.press('Escape');
    await page.evaluate('new Promise(r => setTimeout(r, 200))');
  }

  // =============================================================================
  // Summary
  // =============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 WEBFLOW DESIGNER LEFT PANEL ACCESS POINTS');
  console.log('='.repeat(70));
  
  console.log('\n🔧 TOOLBAR ICONS (click or hover):');
  for (const item of toolbarItems) {
    console.log(`   • ${item.name}`);
    console.log(`     Position: (${item.position.x}, ${item.position.y})`);
    if (item.panelOpens) {
      console.log(`     Opens: ${item.panelOpens}`);
    }
  }
  
  console.log('\n⌨️  KEYBOARD SHORTCUTS:');
  console.log('   • P - Pages panel');
  console.log('   • G - Style selector (class manager)');
  console.log('   • H - Interactions');
  console.log('   • J - Assets');
  console.log('   • E - Navigator');
  console.log('   • D - Style panel');
  console.log('   • S - Element settings');
  console.log('   • Shift+A - Add elements panel');
  
  console.log('\n🖱️  TOP TABS:');
  console.log('   • Design - Main design mode');
  console.log('   • CMS - Content management');
  console.log('   • Insights - Analytics/audit');
  console.log('   • Home - Project dashboard');
  console.log('   • Share - Share preview link');
  console.log('   • Publish - Deploy site');

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
