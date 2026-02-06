/**
 * Replay a recorded recipe
 * 
 * Executes the actions from a teaching session.
 * 
 * Usage:
 *   npx tsx replay-recipe.ts recipe-1234567890.json
 */

import Steel from 'steel-sdk';
import puppeteer from 'puppeteer-core';
import * as fs from 'fs';

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
  const recipeFile = process.argv[2];
  
  if (!recipeFile) {
    console.error('Usage: npx tsx replay-recipe.ts <recipe-file.json>');
    process.exit(1);
  }

  if (!fs.existsSync(recipeFile)) {
    console.error(`Recipe file not found: ${recipeFile}`);
    process.exit(1);
  }

  const recipe: Recipe = JSON.parse(fs.readFileSync(recipeFile, 'utf-8'));
  
  console.log('🎬 REPLAY MODE');
  console.log('==============\n');
  console.log(`📁 Recipe: ${recipeFile}`);
  console.log(`🌐 URL: ${recipe.url}`);
  console.log(`📅 Created: ${recipe.createdAt}`);
  console.log(`📋 Actions: ${recipe.actions.length}\n`);

  const apiKey = process.env.STEEL_API_KEY;
  if (!apiKey) {
    console.error('❌ STEEL_API_KEY required');
    process.exit(1);
  }

  const steel = new Steel({ steelAPIKey: apiKey });
  const session = await steel.sessions.create({ timeout: 900000 });
  
  console.log(`📍 Session: ${session.id}`);
  console.log(`👁️  Watch live: ${session.sessionViewerUrl}\n`);

  const wsUrl = `wss://connect.steel.dev?apiKey=${apiKey}&sessionId=${session.id}`;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Navigating...');
  await page.goto(recipe.url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate('new Promise(r => setTimeout(r, 3000))');
  console.log('✅ Page loaded\n');

  console.log('▶️  Replaying actions...\n');

  for (let i = 0; i < recipe.actions.length; i++) {
    const action = recipe.actions[i];
    const stepNum = `[${i + 1}/${recipe.actions.length}]`;
    
    if (action.type === 'click') {
      const label = action.element.ariaLabel || action.element.text?.slice(0, 30) || `(${action.x}, ${action.y})`;
      console.log(`${stepNum} Click: ${label}`);
      
      // Try to find element by selector first (more reliable)
      let clicked = false;
      
      if (action.element.selector && !action.element.selector.includes(' > ')) {
        try {
          const el = await page.$(action.element.selector);
          if (el) {
            await el.click();
            clicked = true;
            console.log(`       ✓ Via selector: ${action.element.selector}`);
          }
        } catch {}
      }
      
      // Fall back to coordinates
      if (!clicked && action.x !== undefined && action.y !== undefined) {
        await page.mouse.click(action.x, action.y);
        console.log(`       ✓ Via coordinates: (${action.x}, ${action.y})`);
      }
      
      if (action.resultingPanel) {
        console.log(`       → Expected: ${action.resultingPanel}`);
      }
      if (action.note) {
        console.log(`       📝 ${action.note}`);
      }
      
    } else if (action.type === 'keyboard') {
      const mods = action.modifiers || [];
      const keyCombo = [...mods, action.key].join('+');
      console.log(`${stepNum} Key: ${keyCombo}`);
      
      // Press modifiers
      for (const mod of mods) {
        if (mod === 'Shift') await page.keyboard.down('Shift');
        if (mod === 'Meta') await page.keyboard.down('Meta');
        if (mod === 'Ctrl') await page.keyboard.down('Control');
        if (mod === 'Alt') await page.keyboard.down('Alt');
      }
      
      // Press key
      if (action.key) {
        await page.keyboard.press(action.key);
      }
      
      // Release modifiers
      for (const mod of mods) {
        if (mod === 'Shift') await page.keyboard.up('Shift');
        if (mod === 'Meta') await page.keyboard.up('Meta');
        if (mod === 'Ctrl') await page.keyboard.up('Control');
        if (mod === 'Alt') await page.keyboard.up('Alt');
      }
      
      if (action.resultingPanel) {
        console.log(`       → Expected: ${action.resultingPanel}`);
      }
      if (action.note) {
        console.log(`       📝 ${action.note}`);
      }
    }
    
    // Wait between actions
    await page.evaluate('new Promise(r => setTimeout(r, 1000))');
    console.log('');
  }

  console.log('✅ Replay complete!\n');
  
  // Keep session open for inspection
  console.log('Session still open. Press Ctrl+C to close.');
  
  // Wait indefinitely
  await new Promise(() => {});
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
