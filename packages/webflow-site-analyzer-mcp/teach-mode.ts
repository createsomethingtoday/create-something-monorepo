/**
 * Teaching Mode - Record human clicks to teach the agent
 * 
 * Opens a Steel session where you can click through the UI.
 * Each click is recorded with:
 *   - Coordinates (x, y)
 *   - Element selector
 *   - Aria-label/text
 *   - What panel opened (if any)
 * 
 * Results are saved to a "recipe" file the agent can replay.
 * 
 * Usage:
 *   npx tsx teach-mode.ts <webflow-url>
 *   
 * Then click through the UI in the Steel viewer. Press Ctrl+C when done.
 */

import Steel from 'steel-sdk';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import * as fs from 'fs';
import * as readline from 'readline';

interface RecordedAction {
  timestamp: number;
  type: 'click' | 'keyboard' | 'hover';
  x?: number;
  y?: number;
  key?: string;
  modifiers?: string[];
  element: {
    selector: string;
    ariaLabel: string;
    text: string;
    tag: string;
    className: string;
  };
  resultingPanel?: string;
  note?: string;
}

interface Recipe {
  url: string;
  createdAt: string;
  actions: RecordedAction[];
}

async function main() {
  const url = process.argv[2] || 'https://preview.webflow.com/preview/woven-wear?utm_medium=preview_link&utm_source=designer&utm_content=woven-wear&preview=cfce548695005e6704b16f7e3216b6f1&workflow=preview';
  
  const apiKey = process.env.STEEL_API_KEY;
  if (!apiKey) {
    console.error('❌ STEEL_API_KEY required');
    process.exit(1);
  }

  console.log('🎓 TEACHING MODE');
  console.log('================\n');
  console.log('This will record your clicks to teach the agent.\n');

  const steel = new Steel({ steelAPIKey: apiKey });
  const session = await steel.sessions.create({ timeout: 900000 });
  
  console.log(`📍 Session: ${session.id}`);
  console.log(`\n👁️  OPEN THIS URL IN YOUR BROWSER:`);
  console.log(`   ${session.sessionViewerUrl}\n`);
  console.log('Then interact with the Webflow UI. Your actions will be recorded.\n');
  console.log('Commands:');
  console.log('  [Enter]     - Record current state');
  console.log('  "note: ..." - Add a note to last action');
  console.log('  "done"      - Save and exit\n');

  const wsUrl = `wss://connect.steel.dev?apiKey=${apiKey}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Navigating to Webflow...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate('new Promise(r => setTimeout(r, 3000))');
  console.log('✅ Page loaded. Start clicking in the viewer!\n');

  const recipe: Recipe = {
    url,
    createdAt: new Date().toISOString(),
    actions: []
  };

  // Inject click recorder into the page
  await page.evaluate(`
    window.__recordedClicks = [];
    window.__lastClick = null;
    
    document.addEventListener('click', (e) => {
      const el = e.target;
      const rect = el.getBoundingClientRect();
      
      window.__lastClick = {
        timestamp: Date.now(),
        type: 'click',
        x: e.clientX,
        y: e.clientY,
        element: {
          selector: getSelector(el),
          ariaLabel: el.getAttribute('aria-label') || '',
          text: (el.textContent || '').trim().slice(0, 100),
          tag: el.tagName,
          className: (el.className?.toString() || '').slice(0, 200)
        }
      };
      
      window.__recordedClicks.push(window.__lastClick);
      console.log('Click recorded:', window.__lastClick);
    }, true);
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key.length === 1) {
        const modifiers = [];
        if (e.shiftKey) modifiers.push('Shift');
        if (e.metaKey) modifiers.push('Meta');
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.altKey) modifiers.push('Alt');
        
        window.__lastClick = {
          timestamp: Date.now(),
          type: 'keyboard',
          key: e.key,
          modifiers,
          element: {
            selector: '',
            ariaLabel: '',
            text: '',
            tag: '',
            className: ''
          }
        };
        
        window.__recordedClicks.push(window.__lastClick);
      }
    }, true);
    
    function getSelector(el) {
      if (el.id) return '#' + el.id;
      if (el.getAttribute('data-automation-id')) return '[data-automation-id="' + el.getAttribute('data-automation-id') + '"]';
      if (el.getAttribute('aria-label')) return '[aria-label="' + el.getAttribute('aria-label') + '"]';
      
      // Build path
      const path = [];
      while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c && !c.includes('__')).slice(0, 2);
          if (classes.length) selector += '.' + classes.join('.');
        }
        path.unshift(selector);
        el = el.parentElement;
        if (path.length > 4) break;
      }
      return path.join(' > ');
    }
  `);

  // Set up readline for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let actionCount = 0;

  const pollForClicks = async () => {
    const clicks = await page.evaluate('window.__recordedClicks.splice(0)') as RecordedAction[];
    
    for (const click of clicks) {
      actionCount++;
      
      // Wait a moment to see what panel opened
      await page.evaluate('new Promise(r => setTimeout(r, 800))');
      
      // Check what panel is now visible
      const panelInfo = await page.evaluate(`
        (function() {
          const panels = [];
          document.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="header"], [class*="panel-title"]').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.left > 30 && rect.left < 400 && rect.width > 20 && rect.height > 0) {
              const text = el.textContent?.trim();
              if (text && text.length < 50 && !panels.includes(text)) {
                panels.push(text);
              }
            }
          });
          return panels[0] || '';
        })()
      `) as string;
      
      click.resultingPanel = panelInfo || undefined;
      recipe.actions.push(click);
      
      // Log
      if (click.type === 'click') {
        console.log(`[${actionCount}] CLICK @ (${click.x}, ${click.y})`);
        console.log(`    Element: ${click.element.ariaLabel || click.element.text?.slice(0, 30) || click.element.selector}`);
        if (panelInfo) {
          console.log(`    → Opened: ${panelInfo}`);
        }
      } else if (click.type === 'keyboard') {
        const mods = click.modifiers?.length ? click.modifiers.join('+') + '+' : '';
        console.log(`[${actionCount}] KEY: ${mods}${click.key}`);
        if (panelInfo) {
          console.log(`    → Opened: ${panelInfo}`);
        }
      }
      console.log('');
    }
  };

  // Poll for clicks every 500ms
  const pollInterval = setInterval(pollForClicks, 500);

  // Handle user input
  const processInput = () => {
    rl.question('> ', async (input) => {
      const trimmed = input.trim().toLowerCase();
      
      if (trimmed === 'done' || trimmed === 'exit' || trimmed === 'quit') {
        clearInterval(pollInterval);
        
        // Final poll
        await pollForClicks();
        
        // Save recipe
        const filename = `recipe-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(recipe, null, 2));
        console.log(`\n✅ Recipe saved to ${filename}`);
        console.log(`   Total actions: ${recipe.actions.length}`);
        
        // Cleanup
        await browser.close();
        try { await steel.sessions.release(session.id); } catch {}
        
        rl.close();
        process.exit(0);
      } else if (trimmed.startsWith('note:')) {
        const note = input.slice(5).trim();
        if (recipe.actions.length > 0) {
          recipe.actions[recipe.actions.length - 1].note = note;
          console.log(`📝 Note added to action ${recipe.actions.length}`);
        }
        processInput();
      } else if (trimmed === 'screenshot') {
        const screenshot = await page.screenshot({ fullPage: false });
        const filename = `teach-screenshot-${Date.now()}.png`;
        fs.writeFileSync(filename, screenshot);
        console.log(`📸 Screenshot saved to ${filename}`);
        processInput();
      } else if (trimmed === 'show') {
        console.log('\n📋 Recorded actions so far:');
        for (let i = 0; i < recipe.actions.length; i++) {
          const a = recipe.actions[i];
          if (a.type === 'click') {
            console.log(`  ${i + 1}. Click @ (${a.x}, ${a.y}) - ${a.element.ariaLabel || a.element.text?.slice(0, 20) || '?'}`);
          } else {
            const mods = a.modifiers?.length ? a.modifiers.join('+') + '+' : '';
            console.log(`  ${i + 1}. Key: ${mods}${a.key}`);
          }
          if (a.resultingPanel) console.log(`     → ${a.resultingPanel}`);
          if (a.note) console.log(`     📝 ${a.note}`);
        }
        console.log('');
        processInput();
      } else {
        processInput();
      }
    });
  };

  processInput();

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    clearInterval(pollInterval);
    await pollForClicks();
    
    const filename = `recipe-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(recipe, null, 2));
    console.log(`\n✅ Recipe saved to ${filename}`);
    
    await browser.close();
    try { await steel.sessions.release(session.id); } catch {}
    
    process.exit(0);
  });
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
